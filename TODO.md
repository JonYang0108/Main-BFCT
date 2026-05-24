# TODO

## Stall delete fix (admin)
- [x] Confirm delete UI exists: `src/pages/dashboard/admin/AdminStalls.tsx`
- [x] Prevent false success by updating `src/services/stallService.ts` to throw when 0 rows are deleted
- [ ] Fix Supabase RLS/policy so `stalls_delete_privileged` actually allows admin deletes
- [ ] Re-test delete flow in admin dashboard
- [ ] (Optional) Improve toast message to include supabase error details

