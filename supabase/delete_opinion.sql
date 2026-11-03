-- Agenda: delete one selected opinion after the browser's confirmation dialog.
-- IMPORTANT: Existing shared browser login is not enforced by Supabase.
-- Anyone with the public anon key and matching record identifiers can call this.
-- No DELETE table policy or direct table DELETE grant is added.
-- Only apply if this access model is acceptable for your shared-member app.

begin;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'opinions'
      and c.relkind in ('r', 'p') and c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on public.opinions';
  end if;
end $$;

create or replace function public.delete_opinion(
  p_opinion_id bigint,
  p_meeting_id text,
  p_agenda_id text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  if p_opinion_id is null
     or p_meeting_id is null or p_meeting_id = ''
     or p_agenda_id is null or p_agenda_id = '' then
    raise exception 'Invalid opinion identifiers';
  end if;

  delete from public.opinions
  where id = p_opinion_id
    and meeting_id = p_meeting_id
    and agenda_id = p_agenda_id
  returning id into v_deleted;

  return v_deleted is not null;
end;
$$;

revoke all on function public.delete_opinion(bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.delete_opinion(bigint,text,text)
  to anon, authenticated;

commit;

-- Optional read-only verification:
-- select proname, prosecdef, proconfig from pg_catalog.pg_proc
-- where proname = 'delete_opinion';
