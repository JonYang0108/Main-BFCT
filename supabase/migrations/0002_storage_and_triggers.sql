create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.apply_payment_due_date()
returns trigger
language plpgsql
as $$
begin
  new.due_date := make_date(new.period_year, new.period_month, 5);
  return new;
end;
$$;

create or replace function public.primary_role_for_user(target_user_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role::app_role
  from public.user_roles
  where user_id = target_user_id
  order by case role
    when 'admin' then 1
    when 'staff' then 2
    when 'vendor' then 3
    else 99
  end
  limit 1;
$$;

create or replace function public.refresh_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  update public.profiles
  set role = public.primary_role_for_user(target_user_id)
  where user_id = target_user_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_full_name text := nullif(trim(coalesce(meta ->> 'full_name', '')), '');
  user_phone text := nullif(trim(coalesce(meta ->> 'phone', '')), '');
  user_contact text := nullif(trim(coalesce(meta ->> 'contact_number', '')), '');
  user_business_name text := nullif(trim(coalesce(meta ->> 'business_name', '')), '');
  user_address text := nullif(trim(coalesce(meta ->> 'address', '')), '');
  requested_birthdate date := nullif(meta ->> 'birthdate', '')::date;
begin
  if coalesce(meta ->> 'provisioned_by_admin', 'false') = 'true' then
    return new;
  end if;

  insert into public.profiles (
    user_id,
    email,
    full_name,
    phone,
    contact_number,
    business_name,
    address,
    birthdate,
    account_status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(user_full_name, split_part(coalesce(new.email, 'vendor'), '@', 1)),
    coalesce(user_phone, user_contact),
    coalesce(user_contact, user_phone),
    user_business_name,
    user_address,
    requested_birthdate,
    'pending'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    contact_number = excluded.contact_number,
    business_name = excluded.business_name,
    address = excluded.address,
    birthdate = excluded.birthdate;

  insert into public.vendor_requests (
    user_id,
    email,
    full_name,
    business_name,
    phone,
    contact_number,
    address,
    birthdate,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(user_full_name, split_part(coalesce(new.email, 'vendor'), '@', 1)),
    user_business_name,
    coalesce(user_phone, user_contact),
    coalesce(user_contact, user_phone),
    coalesce(user_address, ''),
    requested_birthdate,
    'pending'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    business_name = excluded.business_name,
    phone = excluded.phone,
    contact_number = excluded.contact_number,
    address = excluded.address,
    birthdate = excluded.birthdate,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_vendor_requests_touch_updated_at on public.vendor_requests;
create trigger trg_vendor_requests_touch_updated_at
before update on public.vendor_requests
for each row execute function public.touch_updated_at();

drop trigger if exists trg_stalls_touch_updated_at on public.stalls;
create trigger trg_stalls_touch_updated_at
before update on public.stalls
for each row execute function public.touch_updated_at();

drop trigger if exists trg_payments_touch_updated_at on public.payments;
create trigger trg_payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

drop trigger if exists trg_announcements_touch_updated_at on public.announcements;
create trigger trg_announcements_touch_updated_at
before update on public.announcements
for each row execute function public.touch_updated_at();

drop trigger if exists trg_payments_apply_due_date on public.payments;
create trigger trg_payments_apply_due_date
before insert or update of period_month, period_year on public.payments
for each row execute function public.apply_payment_due_date();

drop trigger if exists trg_user_roles_refresh_profile_role on public.user_roles;
create trigger trg_user_roles_refresh_profile_role
after insert or update or delete on public.user_roles
for each row execute function public.refresh_profile_role();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'valid-ids',
  'valid-ids',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1
  from storage.buckets
  where id = 'valid-ids'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'receipts',
  'receipts',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1
  from storage.buckets
  where id = 'receipts'
);
