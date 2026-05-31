create or replace function public.has_role(
  _role text,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = coalesce(_user_id, auth.uid())
      and role = _role
  );
$$;

create or replace function public.has_permission(
  _resource text,
  _action text,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with roles as (
    select role
    from public.user_roles
    where user_id = coalesce(_user_id, auth.uid())
  )
  select exists (
    select 1
    from roles
    where role = 'admin'
       or (
         role = 'staff'
         and _resource in ('announcements', 'notifications', 'payments', 'reports', 'stalls', 'vendors', 'vendor_requests')
       )
       or (
         role = 'vendor'
         and _resource in ('announcements', 'notifications', 'payments', 'profiles', 'stalls')
         and _action in ('read', 'create', 'update')
       )
  );
$$;

create or replace view public.v_active_vendors as
select
  p.account_status,
  p.address,
  case
    when p.birthdate is null then null
    else date_part('year', age(current_date, p.birthdate))::integer
  end as age,
  p.avatar_url,
  p.birthdate::text as birthdate,
  p.business_name,
  p.contact_number,
  p.created_at,
  p.decline_reason,
  p.email,
  p.full_name,
  p.id,
  p.phone,
  public.primary_role_for_user(p.user_id) as role,
  s.id as stall_id,
  s.stall_number,
  s.status::text as stall_status,
  p.updated_at,
  p.user_id
from public.profiles p
join public.user_roles ur
  on ur.user_id = p.user_id
 and ur.role = 'vendor'
left join lateral (
  select s1.id, s1.stall_number, s1.status
  from public.stalls s1
  where s1.vendor_id = p.user_id
  order by s1.stall_number
  limit 1
) s on true
where p.account_status = 'active';

create or replace view public.v_account_requests as
select
  p.account_status::text as account_status,
  vr.address,
  case
    when coalesce(vr.birthdate, p.birthdate) is null then null
    else date_part('year', age(current_date, coalesce(vr.birthdate, p.birthdate)))::integer
  end as age,
  p.avatar_url,
  coalesce(vr.birthdate, p.birthdate)::text as birthdate,
  coalesce(vr.business_name, p.business_name) as business_name,
  coalesce(vr.contact_number, p.contact_number) as contact_number,
  vr.created_at,
  coalesce(vr.decline_reason, p.decline_reason) as decline_reason,
  vr.email,
  vr.full_name,
  vr.id,
  coalesce(vr.phone, p.phone) as phone,
  p.address as profile_address,
  p.phone as profile_phone,
  vr.status::text as status,
  vr.updated_at,
  vr.user_id,
  (
    select count(*)
    from public.user_valid_ids ids
    where ids.user_id = vr.user_id
  )::integer as valid_id_count
from public.vendor_requests vr
left join public.profiles p
  on p.user_id = vr.user_id;

create or replace view public.v_payments_enriched as
select
  pay.amount,
  pay.approved_at,
  pay.approved_by,
  p.business_name,
  pay.created_at,
  case
    when pay.due_date is null then null
    else (pay.due_date - current_date)
  end as days_until_due,
  pay.due_date::text as due_date,
  pay.id,
  pay.notes,
  pay.payment_date,
  pay.payment_method::text as payment_method,
  to_char(make_date(pay.period_year, pay.period_month, 1), 'Mon YYYY') as period_label,
  pay.period_month,
  pay.period_year,
  coalesce(p.phone, p.contact_number) as phone,
  pay.receipt_number,
  pay.receipt_url,
  pay.stall_id,
  s.location as stall_location,
  s.stall_number,
  pay.status::text as status,
  pay.updated_at,
  p.email as vendor_email,
  pay.vendor_id,
  p.full_name as vendor_name
from public.payments pay
join public.profiles p
  on p.user_id = pay.vendor_id
left join public.stalls s
  on s.id = pay.stall_id;

create or replace view public.v_stalls_list as
select
  p.business_name,
  s.created_at,
  s.id,
  payment_summary.last_payment_date,
  s.location,
  s.monthly_rent,
  s.notes,
  payment_summary.outstanding_balance,
  s.size,
  s.stall_number,
  s.status::text as status,
  s.updated_at,
  p.email as vendor_email,
  s.vendor_id,
  p.full_name as vendor_name,
  coalesce(p.phone, p.contact_number) as vendor_phone
from public.stalls s
left join public.profiles p
  on p.user_id = s.vendor_id
left join lateral (
  select
    max(pay.payment_date)::text as last_payment_date,
    coalesce(sum(pay.amount) filter (where pay.status in ('pending', 'overdue')), 0)::numeric(12,2) as outstanding_balance
  from public.payments pay
  where pay.stall_id = s.id
) payment_summary on true;

create or replace view public.v_vendor_overview as
select
  v.business_name,
  v.email,
  v.full_name,
  stall.location,
  stall.monthly_rent,
  payment_summary.next_due_date,
  stall.size,
  stall.id as stall_id,
  stall.stall_number,
  stall.status::text as stall_status,
  payment_summary.total_overdue,
  payment_summary.total_paid,
  payment_summary.total_pending,
  v.user_id
from public.v_active_vendors v
left join public.stalls stall
  on stall.vendor_id = v.user_id
left join lateral (
  select
    min(pay.due_date) filter (where pay.status in ('pending', 'overdue'))::text as next_due_date,
    coalesce(sum(pay.amount) filter (where pay.status = 'overdue'), 0)::numeric(12,2) as total_overdue,
    coalesce(sum(pay.amount) filter (where pay.status = 'paid'), 0)::numeric(12,2) as total_paid,
    coalesce(sum(pay.amount) filter (where pay.status = 'pending'), 0)::numeric(12,2) as total_pending
  from public.payments pay
  where pay.vendor_id = v.user_id
) payment_summary on true;

create or replace view public.v_admin_overview as
select
  (select count(*) from public.v_active_vendors) as active_vendors,
  (select count(*) from public.stalls where status = 'available') as available_stalls,
  (select count(*) from public.stalls where status = 'maintenance') as maintenance_stalls,
  case
    when (select count(*) from public.stalls) = 0 then 0::numeric
    else round(
      ((select count(*) from public.stalls where status = 'occupied')::numeric /
      (select count(*) from public.stalls)::numeric) * 100,
      2
    )
  end as occupancy_pct,
  (select count(*) from public.stalls where status = 'occupied') as occupied_stalls,
  (select coalesce(sum(amount), 0) from public.payments where status = 'paid') as total_collected,
  (select coalesce(sum(amount), 0) from public.payments where status = 'overdue') as total_overdue,
  (select count(*) from public.payments) as total_payments,
  (select coalesce(sum(amount), 0) from public.payments where status = 'pending') as total_pending,
  (select count(*) from public.stalls) as total_stalls;

create or replace view public.v_staff_overview as
select
  (select count(*) from public.stalls where status = 'occupied') as active_stalls,
  (select count(*) from public.stalls where status = 'maintenance') as maintenance_stalls,
  (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and date_trunc('month', payment_date) = date_trunc('month', timezone('utc', now()))) as monthly_revenue,
  (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and payment_date::date = current_date) as todays_revenue,
  (select count(*) from public.payments where status = 'paid' and payment_date::date = current_date) as todays_txn_count,
  (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and payment_date >= timezone('utc', now()) - interval '7 days') as weekly_revenue,
  (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and date_trunc('year', payment_date) = date_trunc('year', timezone('utc', now()))) as yearly_revenue;

create or replace function public.fn_admin_overview()
returns setof public.v_admin_overview
language sql
stable
as $$
  select * from public.v_admin_overview;
$$;

create or replace function public.fn_staff_overview()
returns setof public.v_staff_overview
language sql
stable
as $$
  select * from public.v_staff_overview;
$$;

create or replace function public.fn_admin_vendors_list(_search text default null)
returns setof public.v_active_vendors
language sql
stable
as $$
  select *
  from public.v_active_vendors
  where _search is null
     or full_name ilike '%' || _search || '%'
     or coalesce(business_name, '') ilike '%' || _search || '%'
     or coalesce(email, '') ilike '%' || _search || '%'
  order by full_name;
$$;

create or replace function public.fn_admin_stalls_list(
  _search text default null,
  _status text default null
)
returns setof public.v_stalls_list
language sql
stable
as $$
  select *
  from public.v_stalls_list
  where (_search is null
      or stall_number ilike '%' || _search || '%'
      or coalesce(vendor_name, '') ilike '%' || _search || '%'
      or coalesce(business_name, '') ilike '%' || _search || '%')
    and (_status is null or status = _status)
  order by stall_number;
$$;

create or replace function public.fn_staff_stalls_list(_search text default null)
returns setof public.v_stalls_list
language sql
stable
as $$
  select *
  from public.v_stalls_list
  where _search is null
     or stall_number ilike '%' || _search || '%'
     or coalesce(vendor_name, '') ilike '%' || _search || '%'
     or coalesce(business_name, '') ilike '%' || _search || '%'
  order by stall_number;
$$;

create or replace function public.fn_admin_payments_list(
  _month integer default null,
  _search text default null,
  _status text default null,
  _year integer default null
)
returns setof public.v_payments_enriched
language sql
stable
as $$
  select *
  from public.v_payments_enriched
  where (_month is null or period_month = _month)
    and (_year is null or period_year = _year)
    and (_status is null or status = _status)
    and (
      _search is null
      or coalesce(vendor_name, '') ilike '%' || _search || '%'
      or coalesce(stall_number, '') ilike '%' || _search || '%'
      or coalesce(receipt_number, '') ilike '%' || _search || '%'
    )
  order by payment_date desc nulls last, created_at desc nulls last;
$$;

create or replace function public.fn_vendor_overview(_vendor_id uuid default auth.uid())
returns setof public.v_vendor_overview
language sql
stable
as $$
  select *
  from public.v_vendor_overview
  where user_id = coalesce(_vendor_id, auth.uid());
$$;

create or replace function public.fn_vendor_stall(_vendor_id uuid default auth.uid())
returns setof public.v_stalls_list
language sql
stable
as $$
  select *
  from public.v_stalls_list
  where vendor_id = coalesce(_vendor_id, auth.uid())
  order by stall_number;
$$;

create or replace function public.fn_vendor_payments(_vendor_id uuid default auth.uid())
returns setof public.v_payments_enriched
language sql
stable
as $$
  select *
  from public.v_payments_enriched
  where vendor_id = coalesce(_vendor_id, auth.uid())
  order by payment_date desc nulls last, created_at desc nulls last;
$$;

create or replace function public.fn_recent_payments(_limit integer default 5)
returns table (
  amount numeric,
  id uuid,
  payment_date timestamptz,
  payment_method text,
  period_label text,
  receipt_number text,
  stall_number text,
  status text,
  vendor_email text,
  vendor_name text
)
language sql
stable
as $$
  select
    amount,
    id,
    payment_date,
    payment_method,
    period_label,
    receipt_number,
    stall_number,
    status,
    vendor_email,
    vendor_name
  from public.v_payments_enriched
  order by payment_date desc nulls last, created_at desc nulls last
  limit greatest(coalesce(_limit, 5), 1);
$$;

create or replace function public.fn_recent_announcements(_limit integer default 5)
returns setof public.announcements
language sql
stable
as $$
  -- Keep parity with dashboard queries.
  -- Landing page requests only the 4 latest announcements.
  select *
  from public.announcements
  order by created_at desc
  limit greatest(coalesce(_limit, 5), 1);
$$;


create or replace function public.fn_account_requests_list(
  _search text default null,
  _status text default null
)
returns setof public.v_account_requests
language sql
stable
as $$
  select *
  from public.v_account_requests
  where (_status is null or status = _status)
    and (
      _search is null
      or coalesce(full_name, '') ilike '%' || _search || '%'
      or coalesce(email, '') ilike '%' || _search || '%'
    )
  order by created_at desc nulls last;
$$;

create or replace function public.fn_staff_payment_records(
  _period text default null,
  _search text default null,
  _status text default null
)
returns table (
  amount numeric,
  created_at timestamptz,
  due_date text,
  id uuid,
  notes text,
  payment_date timestamptz,
  payment_method text,
  period_label text,
  period_month integer,
  period_year integer,
  receipt_number text,
  stall_number text,
  status text,
  vendor_name text
)
language sql
stable
as $$
  select
    amount,
    created_at,
    due_date,
    id,
    notes,
    payment_date,
    payment_method,
    period_label,
    period_month,
    period_year,
    receipt_number,
    stall_number,
    status,
    vendor_name
  from public.v_payments_enriched
  where (_status is null or status = _status)
    and (
      _search is null
      or coalesce(vendor_name, '') ilike '%' || _search || '%'
      or coalesce(stall_number, '') ilike '%' || _search || '%'
      or coalesce(receipt_number, '') ilike '%' || _search || '%'
    )
    and (
      _period is null
      or _period = 'all'
      or (_period = 'daily' and payment_date::date = current_date)
      or (_period = 'monthly' and date_trunc('month', payment_date) = date_trunc('month', timezone('utc', now())))
      or (_period = 'yearly' and date_trunc('year', payment_date) = date_trunc('year', timezone('utc', now())))
    )
  order by payment_date desc nulls last, created_at desc nulls last;
$$;

create or replace function public.fn_payment_reports(
  _month integer default null,
  _year integer default null
)
returns table (
  collected numeric,
  occupancy_pct numeric,
  overdue numeric,
  pending numeric,
  period_label text,
  period_month integer,
  period_year integer,
  total_amount numeric,
  total_transactions bigint
)
language sql
stable
as $$
  with filtered as (
    select *
    from public.payments
    where (_month is null or period_month = _month)
      and (_year is null or period_year = _year)
  )
  select
    coalesce(sum(amount) filter (where status = 'paid'), 0) as collected,
    case
      when (select count(*) from public.stalls) = 0 then 0::numeric
      else round(
        ((select count(*) from public.stalls where status = 'occupied')::numeric /
        (select count(*) from public.stalls)::numeric) * 100,
        2
      )
    end as occupancy_pct,
    coalesce(sum(amount) filter (where status = 'overdue'), 0) as overdue,
    coalesce(sum(amount) filter (where status = 'pending'), 0) as pending,
    to_char(make_date(coalesce(max(period_year), extract(year from current_date)::integer), coalesce(max(period_month), extract(month from current_date)::integer), 1), 'Mon YYYY') as period_label,
    coalesce(max(period_month), extract(month from current_date)::integer) as period_month,
    coalesce(max(period_year), extract(year from current_date)::integer) as period_year,
    coalesce(sum(amount), 0) as total_amount,
    count(*) as total_transactions
  from filtered;
$$;

create or replace function public.fn_staff_report_download(_period text default null)
returns table (
  overdue_count bigint,
  paid_count bigint,
  pending_count bigint,
  period_label text,
  total_revenue numeric,
  total_transactions bigint
)
language sql
stable
as $$
  with filtered as (
    select *
    from public.payments
    where
      _period is null
      or _period = 'all'
      or (_period = 'daily' and payment_date::date = current_date)
      or (_period = 'monthly' and date_trunc('month', payment_date) = date_trunc('month', timezone('utc', now())))
      or (_period = 'yearly' and date_trunc('year', payment_date) = date_trunc('year', timezone('utc', now())))
  )
  select
    count(*) filter (where status = 'overdue') as overdue_count,
    count(*) filter (where status = 'paid') as paid_count,
    count(*) filter (where status = 'pending') as pending_count,
    coalesce(_period, 'all') as period_label,
    coalesce(sum(amount) filter (where status = 'paid'), 0) as total_revenue,
    count(*) as total_transactions
  from filtered;
$$;

create or replace function public.fn_vendor_announcements(_limit integer default 5)
returns setof public.announcements
language sql
stable
as $$
  select *
  from public.announcements
  order by created_at desc
  limit greatest(coalesce(_limit, 5), 1);
$$;

create or replace function public.fn_vendor_next_due(_vendor_id uuid default auth.uid())
returns text
language sql
stable
as $$
  select min(due_date)::text
  from public.payments
  where vendor_id = coalesce(_vendor_id, auth.uid())
    and status in ('pending', 'overdue');
$$;

create or replace function public.create_notification(
  _message text,
  _title text,
  _type text default 'system',
  _user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  insert into public.notifications (message, title, type, user_id)
  values (_message, _title, _type::public.notification_type, _user_id)
  returning id into created_id;

  return created_id;
end;
$$;

-- Compatibility overload:
-- Some callers may pass values resolved as `unknown`, which prevents Postgres
-- from matching the `(text, text, text, uuid)` signature.
create or replace function public.create_notification(
  _message unknown,
  _title unknown,
  _type unknown,
  _user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  insert into public.notifications (message, title, type, user_id)
  values (
    _message::text,
    _title::text,
    coalesce(_type::text, 'system')::public.notification_type,
    _user_id
  )
  returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.fn_notify_vendors(
  _message text,
  _title text,
  _type text default 'system',
  _vendor_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.notifications (message, title, type, user_id)
  select
    _message,
    _title,
    _type::public.notification_type,
    v.user_id
  from public.v_active_vendors v
  where v.user_id = any(_vendor_ids);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.fn_notify_all_vendors(
  _message text,
  _title text,
  _type text default 'system'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.notifications (message, title, type, user_id)
  select
    _message,
    _title,
    _type::public.notification_type,
    user_id
  from public.v_active_vendors;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.mark_overdue_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.approve_account_request(_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not (public.has_role('admin', auth.uid()) or public.has_role('staff', auth.uid())) then
    raise exception 'Insufficient privileges to approve account requests.';
  end if;

  select user_id into target_user_id
  from public.vendor_requests
  where id = _request_id;

  if target_user_id is null then
    raise exception 'Account request not found.';
  end if;

  update public.vendor_requests
  set
    status = 'approved',
    decline_reason = null,
    updated_at = timezone('utc', now())
  where id = _request_id;

  update public.profiles
  set
    account_status = 'active',
    decline_reason = null
  where user_id = target_user_id;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'vendor')
  on conflict (user_id, role) do nothing;

  perform public.create_notification(
    'Your vendor account has been approved. You can now sign in.',
    'Account Approved',
    'system',
    target_user_id
  );

  return true;
end;
$$;

create or replace function public.approve_vendor_request(_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.approve_account_request(_request_id);
$$;

create or replace function public.decline_account_request(
  _reason text,
  _request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not (public.has_role('admin', auth.uid()) or public.has_role('staff', auth.uid())) then
    raise exception 'Insufficient privileges to decline account requests.';
  end if;

  select user_id into target_user_id
  from public.vendor_requests
  where id = _request_id;

  if target_user_id is null then
    raise exception 'Account request not found.';
  end if;

  update public.vendor_requests
  set
    status = 'declined',
    decline_reason = _reason,
    updated_at = timezone('utc', now())
  where id = _request_id;

  update public.profiles
  set
    account_status = 'declined',
    decline_reason = _reason
  where user_id = target_user_id;

  delete from public.user_roles
  where user_id = target_user_id
    and role = 'vendor';

  perform public.create_notification(
    _reason,
    'Account Request Declined',
    'warning',
    target_user_id
  );

  return true;
end;
$$;

create or replace function public.decline_vendor_request(
  _decline_reason text,
  _request_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.decline_account_request(_decline_reason, _request_id);
$$;

create or replace function public.reapprove_vendor_request(_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.approve_account_request(_request_id);
$$;

create or replace function public.approve_payment(
  _approved_by uuid,
  _payment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_vendor_id uuid;
begin
  if not (public.has_role('admin', auth.uid()) or public.has_role('staff', auth.uid())) then
    raise exception 'Insufficient privileges to approve payments.';
  end if;

  update public.payments
  set
    status = 'paid',
    approved_at = timezone('utc', now()),
    approved_by = coalesce(_approved_by, auth.uid())
  where id = _payment_id
  returning vendor_id into target_vendor_id;

  if target_vendor_id is null then
    raise exception 'Payment not found.';
  end if;

  perform public.create_notification(
    'Your payment has been approved and posted to your account.',
    'Payment Approved',
    'system',
    target_vendor_id
  );

  return true;
end;
$$;

create or replace function public.fn_mark_notification_read(_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.notifications
  set is_read = true
  where id = _notification_id
    and (
      user_id = auth.uid()
      or public.has_role('admin', auth.uid())
      or public.has_role('staff', auth.uid())
    );

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

create or replace function public.fn_mark_all_notifications_read(_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if _user_id is distinct from auth.uid()
     and not public.has_role('admin', auth.uid())
     and not public.has_role('staff', auth.uid()) then
    raise exception 'Insufficient privileges to mark notifications for another user.';
  end if;

  update public.notifications
  set is_read = true
  where user_id = coalesce(_user_id, auth.uid())
    and is_read = false;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;
