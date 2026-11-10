-- Defense in depth. The API connects as a privileged role and filters by user_id itself, but if the
-- table is ever reached through Supabase's own client API, these policies keep users to their own rows.
alter table public.entries enable row level security;

drop policy if exists entries_select_own on public.entries;
drop policy if exists entries_insert_own on public.entries;
drop policy if exists entries_update_own on public.entries;
drop policy if exists entries_delete_own on public.entries;

create policy entries_select_own on public.entries for select to authenticated using ((select auth.uid()) = user_id);
create policy entries_insert_own on public.entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy entries_update_own on public.entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy entries_delete_own on public.entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Each user's wrapped data key. Only the server (a privileged role that bypasses RLS) may touch it. With RLS on and
-- no policies, the Supabase client API gets nothing; the revoke is a second lock on the same door.
alter table public.user_keys enable row level security;
revoke all on public.user_keys from anon, authenticated;
