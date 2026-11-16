-- UC03 Consultar agenda + permissões (CT03_01, CT03_03, CT04_04, RN06, RNF09)
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Maria confirmada em T3 (Refúgio) e Jorge em T1 (Esperança)
insert into public.shift_enrollments (shift_id, user_id, status) values
  ('cccccccc-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('cccccccc-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'confirmed');

-- CT03_01: Maria vê os turnos dos dois abrigos e só as próprias inscrições
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is((select count(distinct shelter_id)::int from public.volunteer_shifts), 2, 'CT03_01 Maria vê turnos dos dois abrigos');
select is((select count(*)::int from public.volunteer_shifts), 4, 'CT03_01 Maria vê T1–T4');
select is((select count(*)::int from public.volunteer_shifts where task_type = 'walk'), 1, 'CT03_01 filtro por tipo de tarefa');
select is((select count(*)::int from public.shift_enrollments), 1, 'RNF09 Maria vê apenas a própria inscrição');
select is((select count(*)::int from public.shift_enrollments where user_id = '44444444-4444-4444-4444-444444444444'), 0,
  'RNF09 Maria não vê a inscrição do Jorge');
reset role;

-- Jorge só vê o Esperança
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.volunteer_shifts), 3, 'RN06 Jorge vê só os turnos do Esperança');
reset role;

-- CT03_03: João (candidatura pendente) não vê nenhum turno
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.volunteer_shifts), 0, 'CT03_03 João não vê nenhum turno');
-- CT04_04: inscrição de quem não é voluntário do abrigo
select throws_ok($$ select public.enroll_in_shift('cccccccc-0000-0000-0000-000000000001') $$,
  'P0001', 'Somente voluntários deste abrigo podem se inscrever nos turnos.', 'CT04_04 inscrição negada');
reset role;
select is((select count(*)::int from public.shift_enrollments where user_id = '66666666-6666-6666-6666-666666666666'), 0,
  'CT04_04 nenhum registro criado em shift_enrollments');

-- Jorge não pode se inscrever no Refúgio
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.enroll_in_shift('cccccccc-0000-0000-0000-000000000003') $$,
  'P0001', 'Somente voluntários deste abrigo podem se inscrever nos turnos.', 'RN06 Jorge não se inscreve no Refúgio');
-- e não consegue alterar a própria inscrição direto na tabela
select throws_ok($$ update public.shift_enrollments set status = 'attended' where user_id = auth.uid() $$,
  '42501', null, 'RNF09 update direto em shift_enrollments negado');
reset role;

-- Coordenador do Refúgio não vê inscrições do Esperança
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.shift_enrollments s
            join public.volunteer_shifts v on v.id = s.shift_id
           where v.shelter_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0,
  'RNF09 coordenador do Refúgio não vê inscrições do Esperança');
select is((select count(*)::int from public.shift_enrollments), 1, 'RNF09 coordenador do Refúgio vê inscrições do próprio abrigo');
reset role;

-- Visitante (anon) não lê as tabelas da escala
set local role anon;
select throws_ok($$ select * from public.volunteer_shifts $$, '42501', null, 'RNF09 anon não lê volunteer_shifts');
select throws_ok($$ select public.enroll_in_shift('cccccccc-0000-0000-0000-000000000001') $$, '42501', null,
  'RNF09 anon não executa enroll_in_shift');
reset role;

select * from finish();
rollback;
