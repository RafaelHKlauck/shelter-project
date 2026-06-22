-- Triggers

-- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at      before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger shelters_set_updated_at      before update on public.shelters
  for each row execute function public.set_updated_at();
create trigger animals_set_updated_at       before update on public.animals
  for each row execute function public.set_updated_at();
create trigger supply_needs_set_updated_at  before update on public.supply_needs
  for each row execute function public.set_updated_at();
create trigger requests_set_updated_at      before update on public.requests
  for each row execute function public.set_updated_at();

-- RF18: notificação ao abrigo quando solicitação é criada
create or replace function public.requests_notify_shelter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(shelter_id, kind, payload)
  values (
    new.shelter_id,
    'request.created',
    jsonb_build_object(
      'request_id', new.id,
      'kind', new.kind,
      'requester_id', new.requester_id,
      'animal_id', new.animal_id,
      'supply_need_id', new.supply_need_id
    )
  );
  return new;
end;
$$;
create trigger requests_after_insert
  after insert on public.requests
  for each row execute function public.requests_notify_shelter();

-- RF20/RN02: ao aceitar, abrir conversa (adoção e suprimento) e notificar requester
-- RF24/RF25/RF26: ao finalizar, side-effects nos alvos
create or replace function public.requests_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  -- accepted → criar conversa para adoption|supply; notificar requester
  if new.status = 'accepted' then
    if new.kind in ('adoption', 'supply') then
      insert into public.conversations(request_id, shelter_id, requester_id, last_message_at)
      values (new.id, new.shelter_id, new.requester_id, now())
      on conflict (request_id) do nothing;
    end if;
    insert into public.notifications(user_id, kind, payload)
    values (new.requester_id, 'request.accepted',
            jsonb_build_object('request_id', new.id, 'kind', new.kind));
  end if;

  if new.status = 'rejected' then
    insert into public.notifications(user_id, kind, payload)
    values (new.requester_id, 'request.rejected',
            jsonb_build_object('request_id', new.id, 'kind', new.kind));
  end if;

  -- finalized → side-effects nos alvos
  if new.status = 'finalized' then
    if new.kind = 'adoption' and new.animal_id is not null then
      update public.animals set status = 'adopted' where id = new.animal_id;
    elsif new.kind = 'supply' and new.supply_need_id is not null then
      update public.supply_needs
         set quantity_fulfilled = quantity_fulfilled + coalesce(new.quantity_offered, 0),
             status = case
               when quantity_target is not null
                    and quantity_fulfilled + coalesce(new.quantity_offered, 0) >= quantity_target
                    then 'fulfilled'::supply_status
               else status
             end
       where id = new.supply_need_id;
    end if;
    insert into public.notifications(user_id, kind, payload)
    values (new.requester_id, 'request.finalized',
            jsonb_build_object('request_id', new.id, 'kind', new.kind));
  end if;

  -- carimba auditoria
  if new.status in ('accepted', 'rejected') and new.decided_at is null then
    new.decided_at := now();
  end if;
  if new.status = 'finalized' and new.finalized_at is null then
    new.finalized_at := now();
  end if;

  return new;
end;
$$;
create trigger requests_before_update_status
  before update of status on public.requests
  for each row execute function public.requests_on_status_change();

-- RN04: promoção de voluntário a editor exige admin
create or replace function public.enforce_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  -- mudança de papel
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    select exists (
      select 1 from public.shelter_members
      where shelter_id = new.shelter_id
        and user_id = auth.uid()
        and role = 'admin'
    ) into v_is_admin;

    if not v_is_admin then
      raise exception 'Apenas administradores do abrigo podem alterar papéis (RN04).';
    end if;
    new.promoted_by := auth.uid();
  end if;

  return new;
end;
$$;
create trigger shelter_members_enforce_role
  before update on public.shelter_members
  for each row execute function public.enforce_member_role_change();

-- Cache da última mensagem na conversa (sidebar de Mensagens)
create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(new.body, 200)
   where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert_trg
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- created_by no shelter recebe automaticamente shelter_members(admin)
create or replace function public.shelters_after_insert_make_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.shelter_members(shelter_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger shelters_after_insert_trg
  after insert on public.shelters
  for each row execute function public.shelters_after_insert_make_admin();
