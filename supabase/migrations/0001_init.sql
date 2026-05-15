create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'staff', 'vendor');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('pending', 'active', 'suspended', 'declined');
  end if;

  if not exists (select 1 from pg_type where typname = 'stall_status') then
    create type public.stall_status as enum ('available', 'occupied', 'maintenance');
  end if;

  if not exists (select 1 from pg_type where typname = 'vendor_request_status') then
    create type public.vendor_request_status as enum ('pending', 'approved', 'declined');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('paid', 'pending', 'overdue');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'gcash', 'maya', 'cliqq', 'bank_transfer');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('system', 'payment_due', 'overdue', 'warning');
  end if;

  if not exists (select 1 from pg_type where typname = 'announcement_status') then
    create type public.announcement_status as enum ('normal', 'warning', 'urgent');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  contact_number text,
  business_name text,
  address text,
  avatar_url text,
  birthdate date,
  account_status public.account_status not null default 'pending',
  decline_reason text,
  role public.app_role,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

create table if not exists public.vendor_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  business_name text,
  phone text,
  contact_number text,
  address text not null default '',
  birthdate date,
  status public.vendor_request_status not null default 'pending',
  decline_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_valid_ids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_url text not null,
  storage_path text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stalls (
  id uuid primary key default gen_random_uuid(),
  stall_number text not null unique,
  vendor_id uuid references auth.users(id) on delete set null,
  location text,
  size text,
  monthly_rent numeric(12,2) not null default 0 check (monthly_rent >= 0),
  notes text,
  status public.stall_status not null default 'available',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references auth.users(id) on delete cascade,
  stall_id uuid not null references public.stalls(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'cash',
  payment_date timestamptz not null default timezone('utc', now()),
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null check (period_year between 2000 and 2100),
  status public.payment_status not null default 'pending',
  receipt_number text,
  receipt_url text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type public.notification_type not null default 'system',
  status public.announcement_status not null default 'normal',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Notification',
  message text not null,
  type public.notification_type not null default 'system',
  is_read boolean not null default false,
  related_entity_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_account_status on public.profiles (account_status);
create index if not exists idx_profiles_role on public.profiles (role) where role is not null;

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_role_user_id on public.user_roles (role, user_id);

create index if not exists idx_vendor_requests_status_created_at on public.vendor_requests (status, created_at desc);
create index if not exists idx_vendor_requests_pending_only on public.vendor_requests (created_at desc)
  where status = 'pending';

create index if not exists idx_user_valid_ids_user_id on public.user_valid_ids (user_id);

create index if not exists idx_stalls_vendor_id on public.stalls (vendor_id);
create index if not exists idx_stalls_status on public.stalls (status);
create index if not exists idx_stalls_available_only on public.stalls (stall_number)
  where status = 'available';

create index if not exists idx_payments_vendor_id on public.payments (vendor_id);
create index if not exists idx_payments_stall_id on public.payments (stall_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_status_due_date on public.payments (status, due_date);
create index if not exists idx_payments_period on public.payments (period_year desc, period_month desc);
create index if not exists idx_payments_payment_date on public.payments (payment_date desc);
create index if not exists idx_payments_pending_vendor on public.payments (vendor_id, due_date)
  where status in ('pending', 'overdue');

create index if not exists idx_announcements_created_at on public.announcements (created_at desc);
create index if not exists idx_announcements_status_created_at on public.announcements (status, created_at desc);

create index if not exists idx_notifications_user_created_at on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications (user_id, created_at desc)
  where is_read = false;
