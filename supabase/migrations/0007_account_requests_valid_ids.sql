-- This migration creates a join-friendly view so the admin can reliably fetch
-- uploaded valid IDs for each vendor account request.
--
-- It does NOT modify existing tables.

drop view if exists public.v_account_requests_with_valid_ids;

create view public.v_account_requests_with_valid_ids
security invoker as
select
  vr.id as request_id,
  vr.user_id,
  vr.status::text as status,
  vr.account_status::text as account_status,
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

