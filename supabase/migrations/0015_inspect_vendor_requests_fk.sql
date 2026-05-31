-- Inspect what vendor_requests.user_id FK actually references
-- Run this in Supabase SQL editor.

select
  conname,
  pg_get_constraintdef(c.oid) as constraint_def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'vendor_requests'
  and c.contype = 'f'
  and c.conname = 'vendor_requests_user_id_fkey';

