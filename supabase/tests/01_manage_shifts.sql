-- UC01 Gerenciar turnos e UC02 Criar turnos recorrentes
-- CT01_01..CT01_07, CT02_01..CT02_03 (RF27, RF28, RF29, RN13, RN14)
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- data base: daqui a 3 dias, 9h em Brasília
create temp table t_base as
  select ((date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '3 days 9 hours')
          at time zone 'America/Sao_Paulo') as d;
grant select on t_base to authenticated;

-- ===== como Carla (coordenadora do Esperança) =====
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- CT01_01: cadastro válido
select lives_ok($$
  select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_01 Passeio', 'walk', 'desc',
    (select d from t_base), (select d + interval '3 hours' from t_base), 3)
$$, 'CT01_01 cadastro de turno com dados válidos');
select results_eq(
  $$ select status::text, capacity from public.volunteer_shifts where title = 'CT01_01 Passeio' $$,
  $$ values ('scheduled', 3) $$,
  'CT01_01 turno agendado com 3 vagas');

-- CT01_02: vagas nos limites 0, 1, 20, 21
select lives_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_02 v1', 'other', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 1) $$, 'CT01_02 1 vaga aceito');
select lives_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_02 v20', 'other', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 20) $$, 'CT01_02 20 vagas aceito');
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_02 v0', 'other', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 0) $$,
  'P0001', 'O número de vagas deve estar entre 1 e 20', 'CT01_02 0 vagas recusado');
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_02 v21', 'other', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 21) $$,
  'P0001', 'O número de vagas deve estar entre 1 e 20', 'CT01_02 21 vagas recusado');

-- CT01_03: duração nos limites 59min, 1h, 8h, 8h01
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_03 59', 'other', null,
  (select d from t_base), (select d + interval '59 minutes' from t_base), 2) $$,
  'P0001', 'O turno deve durar no mínimo 1 hora e no máximo 8 horas.', 'CT01_03 59 minutos recusado');
select lives_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_03 1h', 'other', null,
  (select d from t_base), (select d + interval '1 hour' from t_base), 2) $$, 'CT01_03 1 hora aceito');
select lives_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_03 8h', 'other', null,
  (select d from t_base), (select d + interval '8 hours' from t_base), 2) $$, 'CT01_03 8 horas aceito');
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_03 8h01', 'other', null,
  (select d from t_base), (select d + interval '8 hours 1 minute' from t_base), 2) $$,
  'P0001', 'O turno deve durar no mínimo 1 hora e no máximo 8 horas.', 'CT01_03 8h01 recusado');

-- CT01_04: início no passado
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_04 passado', 'other', null,
  now() - interval '1 hour', now() + interval '1 hour', 2) $$,
  'P0001', 'O turno deve começar no futuro.', 'CT01_04 início no passado recusado');
reset role;
select is((select count(*)::int from public.volunteer_shifts where title like 'CT01_04%'), 0, 'CT01_04 nenhum registro criado');

-- CT01_05: reduzir vagas abaixo dos confirmados (3 confirmados → 2 vagas)
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by)
select 'dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT01_05', 'walk',
       d + interval '2 days', d + interval '2 days 3 hours', 3, '11111111-1111-1111-1111-111111111111' from t_base;
insert into public.shift_enrollments (shift_id, user_id, status) values
  ('dddddddd-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('dddddddd-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('dddddddd-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'confirmed');
select public._vs_refresh_shift('dddddddd-0000-0000-0000-000000000005');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select throws_like($$ select public.update_shift('dddddddd-0000-0000-0000-000000000005', 'CT01_05', 'walk', null,
  (select d + interval '2 days' from t_base), (select d + interval '2 days 3 hours' from t_base), 2) $$,
  '%3 inscrições confirmadas%', 'CT01_05 redução para 2 vagas recusada');
select is((select capacity from public.volunteer_shifts where id = 'dddddddd-0000-0000-0000-000000000005'), 3,
  'CT01_05 turno continuou com 3 vagas');

-- CT01_06: cancelamento com inscritos e fila
reset role;
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by)
select 'dddddddd-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'CT01_06', 'walk',
       d + interval '4 days', d + interval '4 days 2 hours', 1, '11111111-1111-1111-1111-111111111111' from t_base;
insert into public.shift_enrollments (shift_id, user_id, status, waitlist_position) values
  ('dddddddd-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'confirmed', null),
  ('dddddddd-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555', 'waitlisted', 1);
select public._vs_refresh_shift('dddddddd-0000-0000-0000-000000000006');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.delete_shift('dddddddd-0000-0000-0000-000000000006') $$,
  'P0001', 'Este turno já tem inscritos e só pode ser cancelado.', 'CT01_06 exclusão não permitida com inscritos');
select is(public.cancel_shift('dddddddd-0000-0000-0000-000000000006'), 1, 'CT01_06 turno cancelado');
reset role;
select is((select status::text from public.volunteer_shifts where id = 'dddddddd-0000-0000-0000-000000000006'), 'cancelled',
  'CT01_06 situação cancelado');
select is((select count(*)::int from public.shift_enrollments
            where shift_id = 'dddddddd-0000-0000-0000-000000000006' and status = 'cancelled'), 2,
  'CT01_06 inscrições confirmada e em espera canceladas');
select is((select count(*)::int from public.notifications
            where kind = 'shift.cancelled' and payload->>'shift_id' = 'dddddddd-0000-0000-0000-000000000006'), 2,
  'CT01_06 confirmados e fila notificados');

-- CT01_07: voluntário tenta gerenciar turnos
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT01_07', 'walk', null,
  (select d from t_base), (select d + interval '2 hours' from t_base), 2) $$,
  'P0001', 'Apenas a coordenação do abrigo pode gerenciar turnos.', 'CT01_07 voluntário não cria turno via RPC');
select throws_ok($$ insert into public.volunteer_shifts (shelter_id, title, starts_at, ends_at, capacity)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'hack', now() + interval '1 day', now() + interval '1 day 2 hours', 2) $$,
  '42501', null, 'CT01_07 insert direto na tabela negado');
select throws_ok($$ select public.cancel_shift('cccccccc-0000-0000-0000-000000000001') $$,
  'P0001', 'Apenas a coordenação do abrigo pode gerenciar turnos.', 'CT01_07 voluntário não cancela turno');
reset role;

-- Coordenador de outro abrigo também não gerencia
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.cancel_shift('cccccccc-0000-0000-0000-000000000001') $$,
  'P0001', 'Apenas a coordenação do abrigo pode gerenciar turnos.', 'RNF09 coordenador de outro abrigo não gerencia turnos');
reset role;

-- ===== UC02 =====
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- CT02_01: 4 semanas
create temp table t_series as
  select * from public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT02_01 Série', 'walk', null,
    (select d from t_base), (select d + interval '3 hours' from t_base), 3, 4);
select is((select count(*)::int from t_series), 4, 'CT02_01 criou 4 turnos');
select is((select count(distinct recurrence_group_id)::int from t_series where recurrence_group_id is not null), 1,
  'CT02_01 mesmo recurrence_group_id');
select is((select count(distinct to_char(starts_at at time zone 'America/Sao_Paulo', 'HH24:MI'))::int from t_series), 1,
  'CT02_01 mesmo horário local');
select is((select array_agg(((starts_at - (select min(starts_at) from t_series)))::text order by starts_at) from t_series),
  array['00:00:00','7 days','14 days','21 days'], 'CT02_01 semanas seguidas');

-- CT02_02: 12 e 13 semanas
select is((select count(*)::int from public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT02_02 12', 'walk', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 2, 12)), 12,
  'CT02_02 recorrência de 12 semanas criou 12 turnos');
select throws_ok($$ select public.create_shift('aaaaaaaa-0000-0000-0000-000000000001', 'CT02_02 13', 'walk', null,
  (select d + interval '1 day' from t_base), (select d + interval '1 day 2 hours' from t_base), 2, 13) $$,
  'P0001', 'A recorrência semanal deve ser de 1 a 12 semanas.', 'CT02_02 13 semanas recusado');
select is((select count(*)::int from public.volunteer_shifts where title = 'CT02_02 13'), 0, 'CT02_02 nenhum turno criado');

-- CT02_03: cancelar apenas uma ocorrência
select is(public.cancel_shift((select id from t_series order by starts_at offset 1 limit 1), false), 1,
  'CT02_03 cancelou uma ocorrência');
select results_eq(
  $$ select status::text from public.volunteer_shifts where title = 'CT02_01 Série' order by starts_at $$,
  $$ values ('scheduled'), ('cancelled'), ('scheduled'), ('scheduled') $$,
  'CT02_03 só a ocorrência escolhida foi cancelada');
reset role;

select * from finish();
rollback;
