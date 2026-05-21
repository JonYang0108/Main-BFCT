-- 0006_notification_conversations_messages.sql
-- Adds chat-style, role-based real-time messaging for vendor concerns.

begin;

-- Conversations represent a thread between a vendor and admin/staff.
create table if not exists public.notification_conversations (
  id uuid primary key default gen_random_uuid(),

  vendor_id uuid not null references auth.users(id) on delete cascade,

  -- optional stall or other entity reference
  related_entity_id uuid,

  status text not null default 'open',

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notification_conversations_vendor_updated
  on public.notification_conversations (vendor_id, updated_at desc);

create index if not exists idx_notification_conversations_related
  on public.notification_conversations (related_entity_id);

-- Messages are append-only within a conversation.
create table if not exists public.notification_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null references public.notification_conversations(id) on delete cascade,

  sender_role public.app_role not null,
  sender_user_id uuid not null references auth.users(id) on delete cascade,

  content text not null,

  created_at timestamptz not null default timezone('utc', now()),

  -- Dedupe key to prevent duplicate inserts from retries/optimistic updates.
  message_dedupe_key text,

  -- Prevent duplicate messages when client re-sends with same key.
  unique (conversation_id, message_dedupe_key)
);

create index if not exists idx_notification_messages_conversation_created
  on public.notification_messages (conversation_id, created_at asc);

-- Realtime friendliness: composite index for fast last message fetch.
create index if not exists idx_notification_messages_conversation_created_desc
  on public.notification_messages (conversation_id, created_at desc);

-- Read tracking: per-user read timestamp.
create table if not exists public.notification_conversation_reads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.notification_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),

  created_at timestamptz not null default timezone('utc', now()),

  unique (conversation_id, user_id)
);

create index if not exists idx_notification_conversation_reads_user
  on public.notification_conversation_reads (user_id, last_read_at desc);

-- Trigger for updated_at on conversations
create or replace function public.touch_notification_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_notification_conversations_touch_updated_at on public.notification_conversations;
create trigger trg_notification_conversations_touch_updated_at
before update on public.notification_conversations
for each row
execute function public.touch_notification_conversations_updated_at();

-- Update conversation.updated_at when message inserted
create or replace function public.touch_notification_conversations_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.notification_conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_notification_conversations_touch_on_message on public.notification_messages;
create trigger trg_notification_conversations_touch_on_message
after insert on public.notification_messages
for each row
execute function public.touch_notification_conversations_on_message();

-- =====================
-- Enable RLS
-- =====================
alter table public.notification_conversations enable row level security;
alter table public.notification_messages enable row level security;
alter table public.notification_conversation_reads enable row level security;

-- Helper: can the current user access this conversation?
-- - Vendor: vendor_id matches
-- - Admin/Staff: allow reading all (or restrict later)

create policy "conversations_select_vendor_own"
on public.notification_conversations
for select
using (
  vendor_id = auth.uid()
  or public.has_role('admin', auth.uid())
  or public.has_role('staff', auth.uid())
);

create policy "conversations_insert_vendor_only"
on public.notification_conversations
for insert
with check (
  vendor_id = auth.uid()
  and public.has_role('vendor', auth.uid())
);

create policy "conversations_update_vendor_or_staff_allowed"
on public.notification_conversations
for update
using (
  vendor_id = auth.uid()
  or public.has_role('admin', auth.uid())
  or public.has_role('staff', auth.uid())
)
with check (
  vendor_id = auth.uid()
  or public.has_role('admin', auth.uid())
  or public.has_role('staff', auth.uid())
);

-- Messages policies
create policy "messages_select_participants"
on public.notification_messages
for select
using (
  exists (
    select 1
    from public.notification_conversations c
    where c.id = notification_messages.conversation_id
      and (
        c.vendor_id = auth.uid()
        or public.has_role('admin', auth.uid())
        or public.has_role('staff', auth.uid())
      )
  )
);

-- Only vendor can insert messages where sender_user_id=auth.uid and sender_role=vendor
create policy "messages_insert_vendor_only"
on public.notification_messages
for insert
with check (
  sender_user_id = auth.uid()
  and sender_role = 'vendor'
  and public.has_role('vendor', auth.uid())
  and exists (
    select 1
    from public.notification_conversations c
    where c.id = notification_messages.conversation_id
      and c.vendor_id = auth.uid()
  )
);

-- Admin/staff can insert messages where sender_user_id=auth.uid and sender_role in ('admin','staff')
create policy "messages_insert_admin_staff_only"
on public.notification_messages
for insert
with check (
  sender_user_id = auth.uid()
  and sender_role in ('admin','staff')
  and (
    (sender_role = 'admin' and public.has_role('admin', auth.uid()))
    or (sender_role = 'staff' and public.has_role('staff', auth.uid()))
  )
  and exists (
    select 1
    from public.notification_conversations c
    where c.id = notification_messages.conversation_id
  )
);

-- Prevent updates/deletes from clients (append-only)
alter table public.notification_messages
  force row level security;

-- Reads policy: users can read/update their own read marker
create policy "reads_select_own"
on public.notification_conversation_reads
for select
using (user_id = auth.uid() or public.has_role('admin', auth.uid()) or public.has_role('staff', auth.uid()));

create policy "reads_upsert_own"
on public.notification_conversation_reads
for insert
with check (user_id = auth.uid());

create policy "reads_update_own"
on public.notification_conversation_reads
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =====================
-- RPC helpers for efficient marking read
-- =====================
create or replace function public.fn_mark_conversation_read(
  _conversation_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if _user_id is null then
    raise exception 'Missing user_id';
  end if;

  -- Authorization: vendor own or admin/staff
  if not (
    _user_id = auth.uid()
    and (
      public.has_role('vendor', auth.uid())
      or public.has_role('admin', auth.uid())
      or public.has_role('staff', auth.uid())
    )
  ) then
    -- allow admin/staff to mark their own; not other users
    if _user_id <> auth.uid() then
      raise exception 'Cannot mark other users conversation reads.';
    end if;
  end if;

  -- Ensure conversation access
  if not exists (
    select 1
    from public.notification_conversations c
    where c.id = _conversation_id
      and (
        c.vendor_id = auth.uid()
        or public.has_role('admin', auth.uid())
        or public.has_role('staff', auth.uid())
      )
  ) then
    raise exception 'Conversation access denied.';
  end if;

  insert into public.notification_conversation_reads (conversation_id, user_id, last_read_at)
  values (_conversation_id, _user_id, timezone('utc', now()))
  on conflict (conversation_id, user_id)
  do update set last_read_at = excluded.last_read_at;

  return true;
end;
$$;

-- =====================
-- Views for conversation list
-- =====================
-- Latest message and unread counts
create or replace view public.v_notification_conversations_list as
select
  c.id as conversation_id,
  c.vendor_id,
  c.related_entity_id,
  c.status,
  c.updated_at,
  c.created_at,

  -- latest message
  lm.id as latest_message_id,
  lm.content as latest_message_content,
  lm.sender_role as latest_message_sender_role,
  lm.sender_user_id as latest_message_sender_user_id,
  lm.created_at as latest_message_created_at,

  -- unread: if no read marker, treat as all messages unread
  (
    select count(*)
    from public.notification_messages m
    where m.conversation_id = c.id
      and (
        case
          when r.last_read_at is null then true
          else m.created_at > r.last_read_at
        end
      )
  ) as unread_count
from public.notification_conversations c
left join public.notification_conversation_reads r
  on r.conversation_id = c.id
 and r.user_id = auth.uid()
left join lateral (
  select m.*
  from public.notification_messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
) lm on true;

-- Allow admins/staff/vendors to select view
alter view public.v_notification_conversations_list owner to postgres;

commit;

