-- Escala de voluntariado — RLS, storage, realtime (RNF09, RNF14, RNF16)
-- Leitura liberada por policy; nenhuma policy de escrita: toda alteração passa
-- pelas funções SECURITY DEFINER da migration 0015.

alter table public.volunteer_shifts       enable row level security;
alter table public.shift_enrollments      enable row level security;
alter table public.shift_attendance_log   enable row level security;
alter table public.volunteer_blocks       enable row level security;
alter table public.volunteer_certificates enable row level security;

-- volunteer_shifts: membros do abrigo (voluntário, editor, admin). RN06: quem ainda
-- tem candidatura pendente não é membro e não vê a agenda.
create policy "volunteer_shifts_member_select" on public.volunteer_shifts for select
  to authenticated
  using (public.is_member(shelter_id, (select auth.uid()), array['admin','editor','volunteer']::shelter_role[]));

-- shift_enrollments: a própria pessoa ou a coordenação do abrigo do turno
create policy "shift_enrollments_owner_or_coordinator_select" on public.shift_enrollments for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.volunteer_shifts s
      where s.id = shift_id
        and public.is_shelter_coordinator(s.shelter_id, (select auth.uid()))
    )
  );

-- shift_attendance_log: coordenação do abrigo
create policy "shift_attendance_log_coordinator_select" on public.shift_attendance_log for select
  to authenticated
  using (exists (
    select 1
    from public.shift_enrollments e
    join public.volunteer_shifts s on s.id = e.shift_id
    where e.id = enrollment_id
      and public.is_shelter_coordinator(s.shelter_id, (select auth.uid()))
  ));

-- volunteer_blocks: a própria pessoa ou a coordenação
create policy "volunteer_blocks_owner_or_coordinator_select" on public.volunteer_blocks for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_shelter_coordinator(shelter_id, (select auth.uid()))
  );

-- volunteer_certificates: dono. A validação pública usa verify_certificate().
create policy "volunteer_certificates_owner_select" on public.volunteer_certificates for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Sem escrita direta nas tabelas novas
revoke insert, update, delete on public.volunteer_shifts       from anon, authenticated;
revoke insert, update, delete on public.shift_enrollments      from anon, authenticated;
revoke insert, update, delete on public.shift_attendance_log   from anon, authenticated;
revoke insert, update, delete on public.volunteer_blocks       from anon, authenticated;
revoke insert, update, delete on public.volunteer_certificates from anon, authenticated;
revoke all on public.volunteer_shifts, public.shift_enrollments, public.shift_attendance_log,
              public.volunteer_blocks, public.volunteer_certificates from anon;

-- ============ Storage: bucket privado de certificados (RNF16) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- caminho {user_id}/{codigo}.pdf; só o dono grava e lê (acesso por link assinado)
create policy "certificates_owner_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "certificates_owner_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============ Realtime (RNF14) ============
-- volunteer_shifts carrega confirmed_count/waitlist_count: toda agenda aberta recebe a
-- mudança de vagas sem enxergar as inscrições dos outros.
alter publication supabase_realtime add table public.volunteer_shifts;
alter publication supabase_realtime add table public.shift_enrollments;
alter table public.volunteer_shifts  replica identity full;
alter table public.shift_enrollments replica identity full;
