-- 0013_fix_v_admin_payments_view.sql
-- Keeps existing payments view fix.

-- Fix: missing view used by admin payments RPC
-- Error: relation "public.v_admin_payments" does not exist

drop view if exists public.v_admin_payments;

create view public.v_admin_payments as
select
  *
from public.v_payments_enriched;


-- ADMIN VENDOR LIST VIEW FIX (email/role exposure)
-- Your DB is missing `public.primary_role_for_user(uuid)` and/or the deployed view schema is stale.
-- Recreate v_active_vendors deterministically using user_roles.role.

drop view if exists public.v_active_vendors;

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
  ur.role as role,
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



