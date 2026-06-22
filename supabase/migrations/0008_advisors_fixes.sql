-- Correções dos advisors do Supabase (security + performance)

-- ============ Functions: set search_path ============
alter function public.f_distance_km(extensions.geography, extensions.geography)
  set search_path = public, extensions;
alter function public.unread_count(uuid, text)
  set search_path = public;
alter function public.set_updated_at()
  set search_path = public;

-- ============ SECURITY DEFINER: revogar EXECUTE de PUBLIC ============
-- Funções de trigger não devem ser invocáveis via /rpc.
revoke execute on function public.requests_notify_shelter()           from public, anon, authenticated;
revoke execute on function public.requests_on_status_change()         from public, anon, authenticated;
revoke execute on function public.enforce_member_role_change()        from public, anon, authenticated;
revoke execute on function public.messages_after_insert()             from public, anon, authenticated;
revoke execute on function public.shelters_after_insert_make_admin()  from public, anon, authenticated;

-- ============ FK index ============
create index if not exists animal_media_animal_idx       on public.animal_media(animal_id);
create index if not exists conversations_requester_idx   on public.conversations(requester_id);
create index if not exists conversations_shelter_idx     on public.conversations(shelter_id);
create index if not exists messages_sender_idx           on public.messages(sender_id);
create index if not exists requests_decided_by_idx       on public.requests(decided_by);
create index if not exists requests_supply_need_idx      on public.requests(supply_need_id);
create index if not exists shelter_media_shelter_idx     on public.shelter_media(shelter_id);
create index if not exists shelter_members_promoted_idx  on public.shelter_members(promoted_by);
create index if not exists shelters_created_by_idx       on public.shelters(created_by);

-- ============ RLS: wrap auth.uid() em (select auth.uid()) ============
-- profiles
drop policy "profiles_self_or_shelter_member_select" on public.profiles;
create policy "profiles_self_or_shelter_member_select"
  on public.profiles for select
  using (
    (select auth.uid()) = id
    or exists (
      select 1
      from public.shelter_members sm
      join public.requests r on r.shelter_id = sm.shelter_id
      where sm.user_id = (select auth.uid())
        and r.requester_id = public.profiles.id
    )
  );

drop policy "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- shelters
drop policy "shelters_authenticated_insert" on public.shelters;
create policy "shelters_authenticated_insert" on public.shelters for insert
  with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

drop policy "shelters_member_update" on public.shelters;
create policy "shelters_member_update" on public.shelters for update
  using (public.is_member(id, (select auth.uid()), array['admin','editor']::shelter_role[]))
  with check (public.is_member(id, (select auth.uid()), array['admin','editor']::shelter_role[]));

drop policy "shelters_admin_delete" on public.shelters;
create policy "shelters_admin_delete" on public.shelters for delete
  using (public.is_member(id, (select auth.uid()), array['admin']::shelter_role[]));

-- shelter_media
drop policy "shelter_media_member_write_ins" on public.shelter_media;
create policy "shelter_media_member_write_ins" on public.shelter_media for insert
  with check (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "shelter_media_member_write_upd" on public.shelter_media;
create policy "shelter_media_member_write_upd" on public.shelter_media for update
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "shelter_media_member_write_del" on public.shelter_media;
create policy "shelter_media_member_write_del" on public.shelter_media for delete
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));

-- shelter_members
drop policy "shelter_members_admin_insert" on public.shelter_members;
create policy "shelter_members_admin_insert" on public.shelter_members for insert
  with check (public.is_member(shelter_id, (select auth.uid()), array['admin']::shelter_role[]));
drop policy "shelter_members_admin_update" on public.shelter_members;
create policy "shelter_members_admin_update" on public.shelter_members for update
  using (public.is_member(shelter_id, (select auth.uid()), array['admin']::shelter_role[]));
drop policy "shelter_members_admin_delete" on public.shelter_members;
create policy "shelter_members_admin_delete" on public.shelter_members for delete
  using (public.is_member(shelter_id, (select auth.uid()), array['admin']::shelter_role[]));

-- animals
drop policy "animals_member_insert" on public.animals;
create policy "animals_member_insert" on public.animals for insert
  with check (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "animals_member_update" on public.animals;
create policy "animals_member_update" on public.animals for update
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "animals_member_delete" on public.animals;
create policy "animals_member_delete" on public.animals for delete
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));

-- animal_media
drop policy "animal_media_member_ins" on public.animal_media;
create policy "animal_media_member_ins" on public.animal_media for insert
  with check (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  ));
drop policy "animal_media_member_upd" on public.animal_media;
create policy "animal_media_member_upd" on public.animal_media for update
  using (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  ));
drop policy "animal_media_member_del" on public.animal_media;
create policy "animal_media_member_del" on public.animal_media for delete
  using (exists (
    select 1 from public.animals a
    where a.id = animal_id
      and public.is_member(a.shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  ));

-- supply_needs
drop policy "supply_needs_member_ins" on public.supply_needs;
create policy "supply_needs_member_ins" on public.supply_needs for insert
  with check (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "supply_needs_member_upd" on public.supply_needs;
create policy "supply_needs_member_upd" on public.supply_needs for update
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));
drop policy "supply_needs_member_del" on public.supply_needs;
create policy "supply_needs_member_del" on public.supply_needs for delete
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[]));

-- requests
drop policy "requests_visible_to_parties" on public.requests;
create policy "requests_visible_to_parties" on public.requests for select
  using (
    requester_id = (select auth.uid())
    or public.is_member(shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[])
  );
drop policy "requests_requester_insert" on public.requests;
create policy "requests_requester_insert" on public.requests for insert
  with check (requester_id = (select auth.uid()));
drop policy "requests_party_update" on public.requests;
create policy "requests_party_update" on public.requests for update
  using (
    requester_id = (select auth.uid())
    or public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  )
  with check (
    requester_id = (select auth.uid())
    or public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  );

-- conversations
drop policy "conversations_visible_to_parties" on public.conversations;
create policy "conversations_visible_to_parties" on public.conversations for select
  using (
    requester_id = (select auth.uid())
    or public.is_member(shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[])
  );
drop policy "conversations_party_update" on public.conversations;
create policy "conversations_party_update" on public.conversations for update
  using (
    requester_id = (select auth.uid())
    or public.is_member(shelter_id, (select auth.uid()), array['admin','editor']::shelter_role[])
  );

-- messages
drop policy "messages_party_select" on public.messages;
create policy "messages_party_select" on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.requester_id = (select auth.uid())
           or public.is_member(c.shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[]))
  ));
drop policy "messages_party_insert" on public.messages;
create policy "messages_party_insert" on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.requester_id = (select auth.uid())
             or public.is_member(c.shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[]))
    )
  );

-- notifications
drop policy "notifications_recipient_select" on public.notifications;
create policy "notifications_recipient_select" on public.notifications for select
  using (
    (user_id is not null and user_id = (select auth.uid()))
    or (shelter_id is not null and public.is_member(shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[]))
  );
drop policy "notifications_recipient_update" on public.notifications;
create policy "notifications_recipient_update" on public.notifications for update
  using (
    (user_id is not null and user_id = (select auth.uid()))
    or (shelter_id is not null and public.is_member(shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[]))
  );
drop policy "notifications_recipient_delete" on public.notifications;
create policy "notifications_recipient_delete" on public.notifications for delete
  using (
    (user_id is not null and user_id = (select auth.uid()))
    or (shelter_id is not null and public.is_member(shelter_id, (select auth.uid()), array['admin']::shelter_role[]))
  );
