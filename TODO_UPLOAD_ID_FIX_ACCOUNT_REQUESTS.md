# TODO: Fix upload ID (admin + vendor account request)

## Completed
- Identify that `v_account_requests` does not provide joined valid ID rows.

## Next steps
1. Add new SQL view: `supabase/migrations/0007_account_requests_valid_ids.sql`
   - Provides request + valid id rows via `user_id` join.
2. Add new service (v2): `src/services/accountRequestService_v2.ts`
   - Uses the new view to fetch valid IDs deterministically.
3. Wire UI to use v2 service (update `AdminAccountRequests.tsx` import).
4. Remove/keep old service call depending on result.
5. Test:
   - Vendor signs up and uploads 2 valid IDs.
   - Admin opens Account Requests and clicks uploaded file.

## Notes
- This follows your request to create another file for easier management.

