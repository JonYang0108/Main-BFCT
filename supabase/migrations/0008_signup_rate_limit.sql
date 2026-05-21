-- Signup rate limiting storage
-- Limits sign up attempts per email and/or IP.
-- Intended window usage is enforced by application logic (1-minute window)
-- using window_start and attempt_count.

create table if not exists public.signup_rate_limits (
  id bigint generated always as identity primary key,
  email text not null,
  ip_address text,
  window_start timestamptz not null,
  attempt_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (email, ip_address, window_start)
);

create index if not exists idx_signup_rate_limits_email_window_start
  on public.signup_rate_limits (email, window_start desc);

create index if not exists idx_signup_rate_limits_ip_window_start
  on public.signup_rate_limits (ip_address, window_start desc);

