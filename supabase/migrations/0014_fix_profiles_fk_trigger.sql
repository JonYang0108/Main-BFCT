-- Fix FK failures by ensuring `profiles` row exists after a new auth user is created.
-- This prevents `vendor_requests.user_id` inserts from failing due to missing referenced row.

create or replace function public.handle_new_user_create_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert a profiles row if it does not exist.
  -- IMPORTANT: vendor_requests_user_id_fkey error indicates the referenced
  -- table/column is not `public.profiles`.
  -- This trigger is kept for the profiles FK case; however, if the FK
  -- actually references `auth.users`, ensure you create into the correct
  -- referenced table in a separate migration.

  insert into public.profiles (
    user_id,
    full_name,
    email,
    contact_number,
    phone,
    address,
    birthdate,
    role,
    account_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    coalesce(new.raw_user_meta_data->>'contact_number',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'address',''),
    nullif(new.raw_user_meta_data->>'birthdate','')::date,
    'vendor',
    'pending',
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute procedure public.handle_new_user_create_profile();

