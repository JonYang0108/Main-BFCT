# Migration progress

- [x] 0007: Fix SQL syntax error near `security` by removing unsupported `security invoker as` clause.
- [x] 0007: Fix runtime SQL error by removing reference to non-existent `vr.account_status` column; replaced with `vr.status::text as account_status`.
- [x] 0007: Fix SQL syntax error near `security` by removing unsupported `security invoker as` clause.
- [x] 0007: Fix runtime SQL error by removing reference to non-existent `vr.account_status` column; replaced with `vr.status::text as account_status`.
- [x] Create 0009: Ensure admin/staff can SELECT through the RLS-protected underlying tables for the view.



