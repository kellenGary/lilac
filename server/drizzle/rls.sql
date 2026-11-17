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

-- Letters to future self: same rule as entries. The server filters by user_id itself; these keep users to their own rows
-- if the table is ever reached through Supabase's client API.
alter table public.letters enable row level security;

drop policy if exists letters_select_own on public.letters;
drop policy if exists letters_insert_own on public.letters;
drop policy if exists letters_update_own on public.letters;
drop policy if exists letters_delete_own on public.letters;

create policy letters_select_own on public.letters for select to authenticated using ((select auth.uid()) = user_id);
create policy letters_insert_own on public.letters for insert to authenticated with check ((select auth.uid()) = user_id);
create policy letters_update_own on public.letters for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy letters_delete_own on public.letters for delete to authenticated using ((select auth.uid()) = user_id);

-- Tasks and ticks: same rule as entries. The server filters by user_id itself; these keep users to their own rows if
-- the tables are ever reached through Supabase's client API.
alter table public.tasks enable row level security;
alter table public.task_marks enable row level security;

drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_select_own on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists task_marks_select_own on public.task_marks;
drop policy if exists task_marks_insert_own on public.task_marks;
drop policy if exists task_marks_update_own on public.task_marks;
drop policy if exists task_marks_delete_own on public.task_marks;
create policy task_marks_select_own on public.task_marks for select to authenticated using ((select auth.uid()) = user_id);
create policy task_marks_insert_own on public.task_marks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy task_marks_update_own on public.task_marks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy task_marks_delete_own on public.task_marks for delete to authenticated using ((select auth.uid()) = user_id);
