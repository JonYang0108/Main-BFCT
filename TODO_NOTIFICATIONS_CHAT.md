# TODO_NOTIFICATIONS_CHAT.md

## Step 1 — Repo inspection
- [x] Identify current notification schema and UI entry points.
- [x] Locate vendor concern sender and notification viewers.

## Step 2 — Supabase schema + RLS
- [ ] Add migrations for:
  - [ ] `notification_conversations` table
  - [ ] `notification_messages` table
  - [ ] Optional unread tracking (or compute read status)
  - [ ] Indexes
- [ ] Add RLS policies for role-based access (vendor/admin/staff)
- [ ] Ensure realtime-friendly inserts (messages append-only)
- [ ] Add dedupe support (message_dedupe_key unique) if needed

## Step 3 — Backend services (frontend)
- [ ] Create `src/services/conversationNotificationService.ts`
  - [ ] create conversation + first message
  - [ ] list conversations with latest message + unread status
  - [ ] get messages by conversation (paged)
  - [ ] send reply (admin/staff)
  - [ ] mark conversation as read
  - [ ] dedupe handling

## Step 4 — UI/UX components
- [ ] Chat thread modal/page with:
  - [ ] Scroll area + auto-scroll
  - [ ] message bubbles by sender role
  - [ ] timestamps + unread status
  - [ ] search/filter on conversation list
  - [ ] “View Full Conversation” flow
- [ ] Replace vendor flat notifications modal with chat conversation list
- [ ] Add dashboard integration for badge counter

## Step 5 — Realtime sync
- [ ] Subscribe to `notification_messages` for active conversations
- [ ] Optimistic updates with duplicate prevention

## Step 6 — Wiring role-based reply
- [ ] Admin/staff reply UI
- [ ] Vendor sees replies instantly

## Step 7 — Testing
- [ ] Typecheck/lint
- [ ] Manual end-to-end verification
  - Vendor sends concern → Admin/Staff see it
  - Admin replies → Vendor sees it immediately
  - Staff replies/updates visible
  - Unread counters update correctly

