-- Funções auxiliares

-- Distância em km entre dois pontos geography
create or replace function public.f_distance_km(a extensions.geography, b extensions.geography)
returns numeric
language sql
immutable
as $$
  select round((extensions.st_distance(a, b) / 1000)::numeric, 2);
$$;

-- Pessoa é membro do abrigo com algum dos papéis informados?
create or replace function public.is_member(p_shelter uuid, p_user uuid, p_roles shelter_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shelter_members
    where shelter_id = p_shelter
      and user_id    = p_user
      and role       = any(p_roles)
  );
$$;

-- Houve solicitação do solicitante para este abrigo? (libera leitura de CPF a membros do abrigo)
create or replace function public.shelter_has_request_from(p_shelter uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requests
    where shelter_id   = p_shelter
      and requester_id = p_user
  );
$$;

-- Total de mensagens não lidas em uma conversa para um destinatário
create or replace function public.unread_count(p_conv uuid, p_role text)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.conversation_id = p_conv
    and ((p_role = 'requester' and (c.requester_last_read_at is null or m.created_at > c.requester_last_read_at) and m.sender_id <> c.requester_id)
      or (p_role = 'shelter'   and (c.shelter_last_read_at   is null or m.created_at > c.shelter_last_read_at)));
$$;
