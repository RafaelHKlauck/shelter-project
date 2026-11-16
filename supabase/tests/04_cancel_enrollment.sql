-- UC06 Cancelar inscrição / UC07 Promover lista de espera
-- CT06_01..CT06_05 (RF33, RF34, RN09, RN10, RNF13)
-- Os turnos são criados relativos a now(), como descrito na seção 9.2 da proposta.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by)
values
  ('f0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT06_01 12h10', 'walk',
   now() + interval '12 hours 10 minutes', now() + interval '14 hours 10 minutes', 2, '11111111-1111-1111-1111-111111111111'),
  ('f0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT06_02 TX 11h50', 'walk',
   now() + interval '11 hours 50 minutes', now() + interval '13 hours 50 minutes', 2, '11111111-1111-1111-1111-111111111111'),
  ('f0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT06_03 TY', 'walk',
   now() + interval '2 days', now() + interval '2 days 2 hours', 1, '11111111-1111-1111-1111-111111111111'),
  ('f0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT06_04 1h30', 'walk',
   now() + interval '1 hour 30 minutes', now() + interval '3 hours 30 minutes', 1, '11111111-1111-1111-1111-111111111111'),
  ('f0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT06_05 fila', 'walk',
   now() + interval '3 days', now() + interval '3 days 2 hours', 1, '11111111-1111-1111-1111-111111111111');

-- ===== CT06_01: 12h10 de antecedência =====
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
create temp table t_e1 as select (public.enroll_in_shift('f0000000-0000-0000-0000-000000000001')->>'enrollment_id')::uuid as id;
select is(public.cancel_enrollment((select id from t_e1))->>'cancelled', 'true', 'CT06_01 inscrição cancelada');
select is((select capacity - confirmed_count from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000001'), 2,
  'CT06_01 vaga voltou para a agenda');

-- ===== CT06_02: 11h50 de antecedência =====
create temp table t_e2 as select (public.enroll_in_shift('f0000000-0000-0000-0000-000000000002')->>'enrollment_id')::uuid as id;
select throws_like($$ select public.cancel_enrollment((select id from t_e2)) $$,
  'O prazo de cancelamento terminou%', 'CT06_02 banco recusou o cancelamento fora do prazo');
select is((select status::text from public.shift_enrollments where id = (select id from t_e2)), 'confirmed',
  'CT06_02 inscrição continuou confirmed');
reset role;

-- Outra pessoa não cancela a inscrição do Jorge
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.cancel_enrollment((select id from t_e2)) $$, 'P0001', 'Inscrição não encontrada.',
  'RNF09 ninguém cancela a inscrição de outra pessoa');
reset role;

-- ===== CT06_03: cancelamento com fila =====
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
create temp table t_e3 as select (public.enroll_in_shift('f0000000-0000-0000-0000-000000000003')->>'enrollment_id')::uuid as id;
reset role;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select is((public.enroll_in_shift('f0000000-0000-0000-0000-000000000003')->>'waitlist_position')::int, 1, 'CT06_03 Lucas na posição 1');
reset role;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is((public.enroll_in_shift('f0000000-0000-0000-0000-000000000003')->>'waitlist_position')::int, 2, 'CT06_03 Maria na posição 2');
reset role;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select is((public.cancel_enrollment((select id from t_e3))->>'promoted')::int, 1, 'CT06_03 UC07 promoveu uma pessoa');
reset role;
select is((select status::text from public.shift_enrollments where id = (select id from t_e3)), 'cancelled', 'CT06_03 Jorge cancelled');
select is((select status::text from public.shift_enrollments where shift_id = 'f0000000-0000-0000-0000-000000000003'
            and user_id = '55555555-5555-5555-5555-555555555555'), 'confirmed', 'CT06_03 Lucas passou para confirmed');
select is((select count(*)::int from public.notifications where kind = 'shift.promoted'
            and user_id = '55555555-5555-5555-5555-555555555555'
            and payload->>'shift_id' = 'f0000000-0000-0000-0000-000000000003'), 1, 'CT06_03 Lucas notificado');
select results_eq($$ select status::text, waitlist_position from public.shift_enrollments
                     where shift_id = 'f0000000-0000-0000-0000-000000000003' and user_id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values ('waitlisted', 1) $$, 'CT06_03 Maria passou para a posição 1');
select is((select confirmed_count from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000003'), 1,
  'CT06_03 TY continuou com apenas um confirmado');

-- ===== CT06_04: coordenação libera vaga a 1h30 do início =====
insert into public.shift_enrollments (id, shift_id, user_id, status, waitlist_position, enrolled_at) values
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'confirmed', null, now()),
  ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'waitlisted', 1, now() + interval '1 s');
select public._vs_refresh_shift('f0000000-0000-0000-0000-000000000004');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.release_enrollment('f1000000-0000-0000-0000-000000000001') $$, 'P0001',
  'Apenas a coordenação do abrigo pode liberar vagas.', 'RN09 voluntário não usa a liberação da coordenação');
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select is((public.release_enrollment('f1000000-0000-0000-0000-000000000001')->>'promoted')::int, 0,
  'CT06_04 ninguém da fila foi promovido');
reset role;
select is((select status::text from public.shift_enrollments where id = 'f1000000-0000-0000-0000-000000000002'), 'waitlisted',
  'CT06_04 fila mantida');
select is((select capacity - confirmed_count from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000004'), 1,
  'CT06_04 vaga ficou aberta na agenda');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(public.enroll_in_shift('f0000000-0000-0000-0000-000000000004')->>'status', 'confirmed',
  'RN10 vaga aberta para inscrição direta');
reset role;

-- ===== CT06_05: saída da lista de espera =====
insert into public.shift_enrollments (id, shift_id, user_id, status, waitlist_position, enrolled_at) values
  ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'confirmed', null, now()),
  ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'waitlisted', 1, now() + interval '1 s'),
  ('f2000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'waitlisted', 2, now() + interval '2 s');
select public._vs_refresh_shift('f0000000-0000-0000-0000-000000000005');
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select is(public.cancel_enrollment('f2000000-0000-0000-0000-000000000002')->>'cancelled', 'true', 'CT06_05 saiu da fila');
reset role;
select is((select waitlist_position from public.shift_enrollments where id = 'f2000000-0000-0000-0000-000000000003'), 1,
  'CT06_05 posição de quem estava atrás recalculada');
select is((select waitlist_count from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000005'), 1,
  'CT06_05 contador da fila atualizado');

-- UC07 também roda quando a coordenação aumenta as vagas
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.update_shift('f0000000-0000-0000-0000-000000000005', 'CT06_05 fila', 'walk', null,
  (select starts_at from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000005'),
  (select ends_at from public.volunteer_shifts where id = 'f0000000-0000-0000-0000-000000000005'), 2) $$,
  'RF34 aumentar vagas');
reset role;
select is((select status::text from public.shift_enrollments where id = 'f2000000-0000-0000-0000-000000000003'), 'confirmed',
  'RF34 aumento de vagas promoveu a fila');

select * from finish();
rollback;
