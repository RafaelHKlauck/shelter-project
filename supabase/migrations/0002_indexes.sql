-- Índices auxiliares

create index profiles_location_gix       on public.profiles    using gist(location);
create index shelters_location_gix       on public.shelters    using gist(location);
create index animals_shelter_idx         on public.animals(shelter_id);
create index animals_status_idx          on public.animals(status);
create index supply_needs_shelter_idx    on public.supply_needs(shelter_id);
create index supply_needs_status_idx     on public.supply_needs(status);
create index requests_shelter_status_idx on public.requests(shelter_id, status);
create index requests_requester_idx      on public.requests(requester_id);
create index messages_conversation_idx   on public.messages(conversation_id, created_at);
create index notifications_user_idx      on public.notifications(user_id) where user_id is not null;
create index notifications_shelter_idx   on public.notifications(shelter_id) where shelter_id is not null;
create index shelter_members_user_idx    on public.shelter_members(user_id);

-- RNF04: impede dupla aceitação ativa de adoção para o mesmo animal
create unique index requests_one_active_adoption
  on public.requests(animal_id)
  where status in ('accepted','finalized') and kind = 'adoption';
