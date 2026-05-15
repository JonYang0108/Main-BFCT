-- Add `urgent` to the enum used by announcements.type and notifications.type

do $$
begin
  if not exists (
    select 1
    from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'notification_type'
      and pg_enum.enumlabel = 'urgent'
  ) then
    alter type public.notification_type add value 'urgent';
  end if;
end $$;

