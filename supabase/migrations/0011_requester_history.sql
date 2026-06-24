-- RPC para histórico cross-shelter do solicitante (RF23).
-- Só retorna dados se o caller (auth.uid()) for membro de um abrigo que recebeu
-- alguma request do mesmo requester. Sem isso, retorna conjunto vazio.

create or replace function public.get_requester_history(
  p_requester_id uuid,
  p_exclude_shelter_id uuid default null
)
returns table (
  request_id uuid,
  shelter_id uuid,
  shelter_name text,
  kind request_kind,
  status request_status,
  animal_name text,
  decided_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as request_id,
    r.shelter_id,
    s.name as shelter_name,
    r.kind,
    r.status,
    a.name as animal_name,
    r.decided_at,
    r.finalized_at,
    r.created_at
  from public.requests r
  join public.shelters s on s.id = r.shelter_id
  left join public.animals a on a.id = r.animal_id
  where r.requester_id = p_requester_id
    and (p_exclude_shelter_id is null or r.shelter_id <> p_exclude_shelter_id)
    and exists (
      select 1
      from public.shelter_members sm
      join public.requests rx on rx.shelter_id = sm.shelter_id
      where sm.user_id = auth.uid()
        and rx.requester_id = p_requester_id
    )
  order by r.created_at desc;
$$;

revoke execute on function public.get_requester_history(uuid, uuid) from public, anon;
grant execute on function public.get_requester_history(uuid, uuid) to authenticated;
