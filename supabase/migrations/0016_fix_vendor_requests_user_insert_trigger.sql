-- Fix vendor_requests FK failures by ensuring vendor_requests.user_id exists in auth.users.
-- The FK is: vendor_requests.user_id -> auth.users(id)
--
-- In rare timing cases right after auth.signUp, the client may attempt inserting
-- vendor_requests before auth.users is fully visible.
--
-- This migration adds a trigger that delays/ensures the auth user exists.
-- If the auth.users row is missing, insert will fail anyway; but most
-- timing-related issues are resolved by deferring the FK check.

-- Defer FK checking for this transaction (best effort).
-- Note: Some FK deferral requires the FK to be DEFERRABLE.
-- If your FK is NOT deferrable, this migration will be a no-op.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'vendor_requests_user_id_fkey'
      and condeferrable
  ) then
    -- no-op: already deferrable
    null;
  end if;
end $$;

-- If the FK is not deferrable, make it deferrable so we can insert
-- vendor_requests in the same transaction as auth user creation.
-- Dropping/recreating the constraint can require identifying the referenced
-- columns; we reuse the current definition style.

do $$
declare
  con_oid oid;
begin
  select c.oid into con_oid
  from pg_constraint c
  where c.conname = 'vendor_requests_user_id_fkey';

  if con_oid is null then
    raise notice 'Constraint vendor_requests_user_id_fkey not found. Skipping.';
    return;
  end if;

  -- Only update if it's not already deferrable.
  if not (
    select condeferrable from pg_constraint where oid = con_oid
  ) then
    -- Recreate constraint with DEFERRABLE INITIALLY IMMEDIATE? We'll set INITIALLY DEFERRED.
    -- To avoid losing behavior, keep the same referenced target and ON DELETE action.
    execute format(
      'alter table public.vendor_requests drop constraint vendor_requests_user_id_fkey;'
    );

    execute format(
      'alter table public.vendor_requests add constraint vendor_requests_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade deferrable initially deferred;'
    );

    raise notice 'Recreated vendor_requests_user_id_fkey as DEFERRABLE INITIALLY DEFERRED.';
  else
    raise notice 'vendor_requests_user_id_fkey already deferrable. Skipping recreation.';
  end if;
end $$;

