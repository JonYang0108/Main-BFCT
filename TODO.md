# TODO - Admin Payments UI/UX + Architecture Update

## Planned steps
1. Create a backend RPC (or new view) for admin to fetch **all payments enriched** in one call (ordered by newest).
2. Refactor `paymentService` to use the new RPC.
3. Refactor `AdminPayments.tsx`:
   - Recent cards (24h/7d/30d/365d) derived from `payment_date`.
   - Master table: search + filters (date range, customer, status, method), pagination, sort.
   - “+ Add Payment (Manual / Face-to-Face)” modal with required fields.
   - Efficient refresh: fetch all payments once per refresh cycle; realtime triggers refetch.
4. Update `AdminReports.tsx` to fetch from the same payments source-of-truth and reflect realtime changes.
5. Ensure export-ready CSV/PDF structure matches filtered report results.
6. Verify TypeScript build + lint.
7. Manual smoke test.


