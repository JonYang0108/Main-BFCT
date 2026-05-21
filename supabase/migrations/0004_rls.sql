alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.vendor_requests enable row level security;
alter table public.vendor_requests force row level security;
alter table public.user_valid_ids enable row level security;
alter table public.user_valid_ids force row level security;
alter table public.stalls enable row level security;
alter table public.stalls force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.announcements enable row level security;
alter table public.announcements force row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists profiles_select_privileged on public.profiles;
create policy profiles_select_privileged
on public.profiles
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using ((select public.has_role('admin', (select auth.uid()))))
with check ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_roles_select_privileged on public.user_roles;
create policy user_roles_select_privileged
on public.user_roles
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists user_roles_insert_admin on public.user_roles;
create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists user_roles_update_admin on public.user_roles;
create policy user_roles_update_admin
on public.user_roles
for update
to authenticated
using ((select public.has_role('admin', (select auth.uid()))))
with check ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists user_roles_delete_admin on public.user_roles;
create policy user_roles_delete_admin
on public.user_roles
for delete
to authenticated
using ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists vendor_requests_select_self on public.vendor_requests;
create policy vendor_requests_select_self
on public.vendor_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists vendor_requests_select_privileged on public.vendor_requests;
create policy vendor_requests_select_privileged
on public.vendor_requests
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists vendor_requests_insert_self on public.vendor_requests;
create policy vendor_requests_insert_self
on public.vendor_requests
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists vendor_requests_update_privileged on public.vendor_requests;
create policy vendor_requests_update_privileged
on public.vendor_requests
for update
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
)
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists user_valid_ids_select_owner on public.user_valid_ids;
create policy user_valid_ids_select_owner
on public.user_valid_ids
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_valid_ids_select_privileged on public.user_valid_ids;
create policy user_valid_ids_select_privileged
on public.user_valid_ids
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists user_valid_ids_insert_owner on public.user_valid_ids;
create policy user_valid_ids_insert_owner
on public.user_valid_ids
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_valid_ids_update_owner on public.user_valid_ids;
create policy user_valid_ids_update_owner
on public.user_valid_ids
for update
to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.has_role('admin', (select auth.uid())))
)
with check (
  (select auth.uid()) = user_id
  or (select public.has_role('admin', (select auth.uid())))
);

drop policy if exists user_valid_ids_delete_owner on public.user_valid_ids;
create policy user_valid_ids_delete_owner
on public.user_valid_ids
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.has_role('admin', (select auth.uid())))
);

drop policy if exists stalls_select_vendor on public.stalls;
create policy stalls_select_vendor
on public.stalls
for select
to authenticated
using ((select auth.uid()) = vendor_id);

drop policy if exists stalls_select_privileged on public.stalls;
create policy stalls_select_privileged
on public.stalls
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists stalls_insert_privileged on public.stalls;
create policy stalls_insert_privileged
on public.stalls
for insert
to authenticated
with check (
  -- allow admin/staff inserts
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists stalls_update_privileged on public.stalls;
create policy stalls_update_privileged
on public.stalls
for update
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
)
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists stalls_delete_privileged on public.stalls;
create policy stalls_delete_privileged
on public.stalls
for delete
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists payments_select_vendor on public.payments;
create policy payments_select_vendor
on public.payments
for select
to authenticated
using ((select auth.uid()) = vendor_id);

drop policy if exists payments_select_privileged on public.payments;
create policy payments_select_privileged
on public.payments
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists payments_insert_vendor on public.payments;
create policy payments_insert_vendor
on public.payments
for insert
to authenticated
with check ((select auth.uid()) = vendor_id);

drop policy if exists payments_insert_privileged on public.payments;
create policy payments_insert_privileged
on public.payments
for insert
to authenticated
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists payments_update_privileged on public.payments;
create policy payments_update_privileged
on public.payments
for update
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
)
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists payments_delete_admin on public.payments;
create policy payments_delete_admin
on public.payments
for delete
to authenticated
using ((select public.has_role('admin', (select auth.uid()))));

drop policy if exists notifications_select_owner on public.notifications;
create policy notifications_select_owner
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_select_privileged on public.notifications;
create policy notifications_select_privileged
on public.notifications
for select
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists notifications_insert_privileged on public.notifications;
create policy notifications_insert_privileged
on public.notifications
for insert
to authenticated
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists notifications_update_privileged on public.notifications;
create policy notifications_update_privileged
on public.notifications
for update
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
)
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists announcements_select_authenticated on public.announcements;
create policy announcements_select_authenticated
on public.announcements
for select
to authenticated
using (true);

drop policy if exists announcements_write_privileged on public.announcements;
create policy announcements_write_privileged
on public.announcements
for insert
to authenticated
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists announcements_update_privileged on public.announcements;
create policy announcements_update_privileged
on public.announcements
for update
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
)
with check (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists announcements_delete_privileged on public.announcements;
create policy announcements_delete_privileged
on public.announcements
for delete
to authenticated
using (
  (select public.has_role('admin', (select auth.uid())))
  or (select public.has_role('staff', (select auth.uid())))
);

drop policy if exists valid_ids_owner_read on storage.objects;
create policy valid_ids_owner_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'valid-ids'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.has_role('admin', (select auth.uid())))
    or (select public.has_role('staff', (select auth.uid())))
  )
);

drop policy if exists valid_ids_owner_write on storage.objects;
create policy valid_ids_owner_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'valid-ids'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists valid_ids_owner_delete on storage.objects;
create policy valid_ids_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'valid-ids'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.has_role('admin', (select auth.uid())))
  )
);

drop policy if exists receipts_owner_read on storage.objects;
create policy receipts_owner_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.has_role('admin', (select auth.uid())))
    or (select public.has_role('staff', (select auth.uid())))
  )
);

drop policy if exists receipts_owner_write on storage.objects;
create policy receipts_owner_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists receipts_privileged_delete on storage.objects;
create policy receipts_privileged_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.has_role('admin', (select auth.uid())))
    or (select public.has_role('staff', (select auth.uid())))
  )
);
