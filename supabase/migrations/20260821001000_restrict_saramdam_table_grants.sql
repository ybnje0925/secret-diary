revoke all on public.people from anon;
revoke all on public.records from anon;
revoke all on public.follow_ups from anon;
revoke all on public.ai_summaries from anon;
revoke all on public.custom_groups from anon;
revoke all on public.migration_status from anon;

revoke all on public.people from public;
revoke all on public.records from public;
revoke all on public.follow_ups from public;
revoke all on public.ai_summaries from public;
revoke all on public.custom_groups from public;
revoke all on public.migration_status from public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.records to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.ai_summaries to authenticated;
grant select, insert, update, delete on public.custom_groups to authenticated;
grant select, insert, update on public.migration_status to authenticated;
