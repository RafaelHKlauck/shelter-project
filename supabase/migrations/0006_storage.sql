-- Storage buckets e policies

insert into storage.buckets (id, name, public) values
  ('avatars',        'avatars',        true),
  ('shelter-media',  'shelter-media',  true),
  ('animal-media',   'animal-media',   true)
on conflict (id) do nothing;

-- avatars: read público (bucket é public); write apenas no path {uid}/...
create policy "avatars_owner_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- shelter-media: write somente admin/editor do {shelter_id}/...
create policy "shelter_media_member_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shelter-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );
create policy "shelter_media_member_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'shelter-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );
create policy "shelter_media_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'shelter-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );

-- animal-media: write somente admin/editor do {shelter_id}/{animal_id}/...
create policy "animal_media_member_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'animal-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );
create policy "animal_media_member_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'animal-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );
create policy "animal_media_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'animal-media'
    and public.is_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['admin','editor']::shelter_role[]
    )
  );
