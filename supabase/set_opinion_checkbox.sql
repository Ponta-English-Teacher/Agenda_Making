-- Run ONCE in the Supabase SQL Editor before deploying the checkbox UI.
-- This changes no existing opinion rows and adds no table UPDATE policy.
begin;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'opinions'
      and c.relkind in ('r','p') and c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on public.opinions before installing this function';
  end if;
end $$;

create or replace function public.set_opinion_checkbox(
  p_opinion_id bigint,
  p_meeting_id text,
  p_index integer,
  p_checked boolean
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
  v_char text;
  v_position integer := 0;
  v_number integer := -1;
  i integer;
begin
  if p_opinion_id is null or p_meeting_id is null or p_meeting_id = ''
     or p_index is null or p_checked is null
     or p_index < 0 or p_index > 500 then
    raise exception 'Invalid checkbox arguments';
  end if;

  select o.text into v_text
  from public.opinions as o
  where o.id = p_opinion_id and o.meeting_id = p_meeting_id
  for update;
  if not found then raise exception 'Opinion not found'; end if;

  for i in 1..coalesce(pg_catalog.char_length(v_text), 0) loop
    v_char := pg_catalog.substr(v_text, i, 1);
    if v_char in ('☐','☑') then
      v_number := v_number + 1;
      if v_number = p_index then
        v_position := i;
        exit;
      end if;
    end if;
  end loop;
  if v_position = 0 then raise exception 'Checkbox not found'; end if;

  if (v_char = '☑') is distinct from p_checked then
    v_text := pg_catalog.overlay(v_text placing
      (case when p_checked then '☑' else '☐' end)
      from v_position for 1);
    update public.opinions set text = v_text where id = p_opinion_id;
  end if;

  return v_text;
end;
$$;

revoke all on function public.set_opinion_checkbox(bigint,text,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.set_opinion_checkbox(bigint,text,integer,boolean)
  to anon, authenticated;

commit;

-- Check after running:
-- select proname, prosecdef, proconfig from pg_catalog.pg_proc
-- where proname = 'set_opinion_checkbox';
