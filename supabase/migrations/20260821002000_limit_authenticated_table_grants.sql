revoke all on public.people from authenticated;
revoke all on public.records from authenticated;
revoke all on public.follow_ups from authenticated;
revoke all on public.ai_summaries from authenticated;
revoke all on public.custom_groups from authenticated;
revoke all on public.migration_status from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.records to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.ai_summaries to authenticated;
grant select, insert, update, delete on public.custom_groups to authenticated;
grant select, insert, update on public.migration_status to authenticated;
