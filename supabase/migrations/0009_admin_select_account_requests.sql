-- 0009_admin_select_account_requests.sql
-- Ensures admin/staff can read vendor account requests and their valid-IDs through the
-- view `public.v_account_requests_with_valid_ids`.
--
-- Why: RLS applies to underlying tables (`public.vendor_requests` and `public.user_valid_ids`).
-- Admin UI queries via the view still need matching RLS SELECT policies on those tables.

-- 1) Ensure the view exists (safe no-op if it already exists)
create or replace view public.v_account_requests_with_valid_ids
as
select
  vr.id as id,
  vr.id as request_id,
  vr.user_id,
  vr.status::text as status,
  vr.status::text as account_status,
  vr.created_at,
  vr.updated_at,
  vr.full_name,
  vr.email,
  vr.phone,
  vr.business_name,
  vr.birthdate,
  vr.contact_number,
  vr.address,

  ids.id as valid_id_row_id,
  ids.file_name,
  ids.file_type,
  ids.file_url,
  ids.storage_path,
  ids.created_at as valid_id_created_at,
  ids.updated_at as valid_id_updated_at
from public.vendor_requests vr
left join public.user_valid_ids ids
  on ids.user_id = vr.user_id;

-- 2) RLS: admin/staff can select vendor_requests
--    (Keep both self and privileged access working.)

drop policy if exists vendor_requests_select_admin_staff on public.vendor_requests;
create policy vendor_requests_select_admin_staff
on public.vendor_requests
for select
to authenticated
using (
  -- owner (self)
  (auth.uid() = user_id)
  -- or admin/staff
  or (public.has_role('admin', auth.uid()) or public.has_role('staff', auth.uid()))
);


-- 3) RLS: admin/staff can select user_valid_ids

drop policy if exists user_valid_ids_select_admin_staff on public.user_valid_ids;
create policy user_valid_ids_select_admin_staff
on public.user_valid_ids
for select
to authenticated
using (
  public.has_role('admin', auth.uid())
  or public.has_role('staff', auth.uid())
);

-- 4) (Optional but safe) Keep RLS enabled on the tables.
alter table public.vendor_requests enable row level security;
alter table public.user_valid_ids enable row level security;

