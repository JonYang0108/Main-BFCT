## Admin Dashboard — Full Build Plan

### Current State

- `AdminDashboard.tsx` exists with an overview page showing stat cards, recent announcements, and recent payments
- `DashboardLayout.tsx` has sidebar nav with routes for Stalls, Vendors, Payments, Announcements — but **none of these sub-pages exist yet**
- `App.tsx` only has `/dashboard/admin` route — no sub-routes
- Database tables are ready: `stalls`, `profiles`, `payments`, `announcements`, `user_roles` with proper RLS

### What We Will Build

**4 new admin sub-pages** plus route registration:

---

### 1. Stall Management (`/dashboard/admin/stalls`)

- Table listing all stalls with columns: Stall Number, Location, Size, Status (badge), Monthly Rent, Assigned Vendor, Actions
- **Add Stall** dialog: form with stall_number, location, size, monthly_rent, status, notes
- **Edit Stall** dialog: pre-filled form to update any field including assigning a vendor (dropdown of vendor profiles)
- **Delete Stall** confirmation dialog
- Status filter tabs (All / Available / Occupied / Maintenance)
- Search by stall number

### 2. Vendor Management (`/dashboard/admin/vendors`)

- Table listing all vendors: Name, Email, Phone, Business Name, Assigned Stall, Status, Actions
- Fetches profiles joined with user_roles (role = 'vendor') and their stall assignments
- **View/Edit Vendor** dialog to update profile info
- **Delete Vendor** (deletes auth user via edge function or marks inactive)
- Search by name/business name

### 3. Payment Tracking (`/dashboard/admin/payments`)

- Table of all payments: Vendor Name, Stall, Amount, Period, Status (badge), Payment Date, Receipt #, Actions
- **Record Payment** dialog: select vendor, stall, amount, period_month/year, status, notes
- **Update Status** (mark as paid/overdue/pending)
- Filter by status, search by vendor
- Summary cards at top: Total Collected, Pending, Overdue

### 4. Announcements Management (`/dashboard/admin/announcements`)

- List of announcements with title, content preview, type badge, date
- **Create Announcement** dialog: title, content, type (info/warning/urgent)
- **Edit/Delete** announcements
- Created_by auto-set to current user

---

### 5. Route Registration in `App.tsx`

Add 4 new routes under admin protection:

- `/dashboard/admin/stalls`
- `/dashboard/admin/vendors`
- `/dashboard/admin/payments`
- `/dashboard/admin/announcements`

### Technical Details

**File structure** — new files:

- `src/pages/dashboard/admin/AdminStalls.tsx`
- `src/pages/dashboard/admin/AdminVendors.tsx`
- `src/pages/dashboard/admin/AdminPayments.tsx`
- `src/pages/dashboard/admin/AdminAnnouncements.tsx`

**Shared patterns across all pages:**

- Wrapped in `<DashboardLayout>`
- Use shadcn `Table`, `Dialog`, `Button`, `Input`, `Select`, `Badge` components
- Supabase queries with proper typing from `@/integrations/supabase/types`
- Toast notifications for CRUD success/error
- Loading states with skeleton/spinner

**No database changes needed** — all tables and RLS policies already support these operations for admin role.
