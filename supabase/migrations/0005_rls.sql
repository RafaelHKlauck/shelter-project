-- RLS — habilita e cria policies para todas as tabelas do schema public

alter table public.profiles         enable row level security;
alter table public.shelters         enable row level security;
alter table public.shelter_media    enable row level security;
alter table public.shelter_members  enable row level security;
alter table public.animals          enable row level security;
alter table public.animal_media     enable row level security;
alter table public.supply_needs     enable row level security;
alter table public.requests         enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.notifications    enable row level security;

-- ============ profiles ============
-- SELECT: dono OU membro de um abrigo que recebeu requisição do dono
create policy "profiles_self_or_shelter_member_select"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.shelter_members sm
      join public.requests r on r.shelter_id = sm.shelter_id
      where sm.user_id = auth.uid()
        and r.requester_id = public.profiles.id
    )
  );

create policy "profiles_self_insert" on public.profiles for insert
  with check (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ============ shelters ============
create policy "shelters_public_select" on public.shelters for select using (true);
create policy "shelters_authenticated_insert" on public.shelters for insert
  with check (auth.uid() is not null and created_by = auth.uid());
create policy "shelters_member_update" on public.shelters for update
  using (public.is_member(id, auth.uid(), array['admin','editor']::shelter_role[]))
  with check (public.is_member(id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "shelters_admin_delete" on public.shelters for delete
  using (public.is_member(id, auth.uid(), array['admin']::shelter_role[]));

-- ============ shelter_media ============
create policy "shelter_media_public_select" on public.shelter_media for select using (true);
create policy "shelter_media_member_write_ins" on public.shelter_media for insert
  with check (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "shelter_media_member_write_upd" on public.shelter_media for update
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "shelter_media_member_write_del" on public.shelter_media for delete
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));

-- ============ shelter_members ============
create policy "shelter_members_public_select" on public.shelter_members for select using (true);
create policy "shelter_members_admin_insert" on public.shelter_members for insert
  with check (
    -- admin pode adicionar; OU é o trigger SECURITY DEFINER (cria primeiro admin do abrigo)
    public.is_member(shelter_id, auth.uid(), array['admin']::shelter_role[])
  );
create policy "shelter_members_admin_update" on public.shelter_members for update
  using (public.is_member(shelter_id, auth.uid(), array['admin']::shelter_role[]));
create policy "shelter_members_admin_delete" on public.shelter_members for delete
  using (public.is_member(shelter_id, auth.uid(), array['admin']::shelter_role[]));

-- ============ animals ============
create policy "animals_public_select" on public.animals for select using (true);
create policy "animals_member_insert" on public.animals for insert
  with check (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "animals_member_update" on public.animals for update
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "animals_member_delete" on public.animals for delete
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));

-- ============ animal_media ============
create policy "animal_media_public_select" on public.animal_media for select using (true);
create policy "animal_media_member_ins" on public.animal_media for insert
  with check (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  ));
create policy "animal_media_member_upd" on public.animal_media for update
  using (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  ));
create policy "animal_media_member_del" on public.animal_media for delete
  using (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  ));

-- ============ supply_needs ============
create policy "supply_needs_public_select" on public.supply_needs for select using (true);
create policy "supply_needs_member_ins" on public.supply_needs for insert
  with check (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "supply_needs_member_upd" on public.supply_needs for update
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));
create policy "supply_needs_member_del" on public.supply_needs for delete
  using (public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[]));

-- ============ requests ============
create policy "requests_visible_to_parties" on public.requests for select
  using (
    requester_id = auth.uid()
    or public.is_member(shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[])
  );
create policy "requests_requester_insert" on public.requests for insert
  with check (requester_id = auth.uid());
create policy "requests_party_update" on public.requests for update
  using (
    requester_id = auth.uid()
    or public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  )
  with check (
    requester_id = auth.uid()
    or public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  );

-- ============ conversations ============
create policy "conversations_visible_to_parties" on public.conversations for select
  using (
    requester_id = auth.uid()
    or public.is_member(shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[])
  );
create policy "conversations_party_update" on public.conversations for update
  using (
    requester_id = auth.uid()
    or public.is_member(shelter_id, auth.uid(), array['admin','editor']::shelter_role[])
  );

-- ============ messages ============
create policy "messages_party_select" on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.requester_id = auth.uid()
           or public.is_member(c.shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[]))
  ));
create policy "messages_party_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.requester_id = auth.uid()
             or public.is_member(c.shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[]))
    )
  );

-- ============ notifications ============
create policy "notifications_recipient_select" on public.notifications for select
  using (
    (user_id is not null and user_id = auth.uid())
    or (shelter_id is not null and public.is_member(shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[]))
  );
create policy "notifications_recipient_update" on public.notifications for update
  using (
    (user_id is not null and user_id = auth.uid())
    or (shelter_id is not null and public.is_member(shelter_id, auth.uid(), array['admin','editor','volunteer']::shelter_role[]))
  );
create policy "notifications_recipient_delete" on public.notifications for delete
  using (
    (user_id is not null and user_id = auth.uid())
    or (shelter_id is not null and public.is_member(shelter_id, auth.uid(), array['admin']::shelter_role[]))
  );
-- Inserts only via SECURITY DEFINER triggers — no policy for INSERT
