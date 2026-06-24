-- 1) Função is_teammate (security definer p/ bypass RLS interno)
create or replace function public.is_teammate(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shelter_members a
    join public.shelter_members b on b.shelter_id = a.shelter_id
    where a.user_id = p_user_a and b.user_id = p_user_b
  );
$$;

revoke execute on function public.is_teammate(uuid, uuid) from public, anon;
grant execute on function public.is_teammate(uuid, uuid) to authenticated;

-- 2) Policy: profiles visíveis para teammates do mesmo abrigo
create policy "profiles_team_select" on public.profiles for select
  using (public.is_teammate((select auth.uid()), id));

-- 3) Atualizar trigger para criar shelter_member(volunteer) ao aceitar volunteer
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

  if new.status = 'accepted' then
    if new.kind in ('adoption', 'supply') then
      insert into public.conversations(request_id, shelter_id, requester_id, last_message_at)
      values (new.id, new.shelter_id, new.requester_id, now())
      on conflict (request_id) do nothing;
    elsif new.kind = 'volunteer' then
      insert into public.shelter_members(shelter_id, user_id, role)
      values (new.shelter_id, new.requester_id, 'volunteer')
      on conflict (shelter_id, user_id) do nothing;
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

  if new.status in ('accepted', 'rejected') and new.decided_at is null then
    new.decided_at := now();
  end if;
  if new.status = 'finalized' and new.finalized_at is null then
    new.finalized_at := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.requests_on_status_change() from public, anon, authenticated;
