# TODO
- [ ] Inspect Supabase `valid-ids` storage: find the storage trigger/function that should insert into `public.user_valid_ids`.
- [ ] Patch migrations (likely `supabase/migrations/0002_storage_and_triggers.sql` or add a new migration) to create:
  - the storage trigger for bucket `valid-ids`
  - the function (or trigger handler) that inserts/updates `public.user_valid_ids` with `storage_path`, `file_name`, `file_type`, `user_id`, etc.
- [ ] Ensure RLS/policies for `public.user_valid_ids` work with trigger execution (if functions are security definer, confirm role).
- [ ] Re-run the upload flow and confirm the `400 database schema is out of sync` error is resolved.

