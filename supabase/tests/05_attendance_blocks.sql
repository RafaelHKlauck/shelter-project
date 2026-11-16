-- UC08 Registrar presença / UC13 Desbloquear voluntário
-- CT08_01..CT08_05, CT13_01 (RF35, RF40, RN11, RN12, RN15, RNF15)
-- Turnos encerrados são inseridos direto no banco (RN13 não deixa criar no passado pela tela).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- d0 = ontem às 9h (Brasília)
create temp table t_base as
  select ((date_trunc('day', now() at time zone 'America/Sao_Paulo') - interval '1 day' + interval '9 hours')
          at time zone 'America/Sao_Paulo') as d;
grant select on t_base to authenticated;

insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by, status)
select x.id::uuid, 'aaaaaaaa-0000-0000-0000-000000000001', x.title, 'walk', d + x.s, d + x.s + x.dur, 5,
       '11111111-1111-1111-1111-111111111111', 'completed'
  from t_base, (values
    ('a1000000-0000-0000-0000-000000000001', 'CT08_01 3h',      interval '0',        interval '3 hours'),
    ('a1000000-0000-0000-0000-000000000002', 'CT08_02 4h',      interval '-1 day',   interval '4 hours'),
    ('a1000000-0000-0000-0000-000000000010', 'Lucas falta 1',   interval '-6 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000011', 'Lucas falta 2',   interval '-5 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000012', 'TZ',              interval '-2 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000020', 'Jorge falta A',   interval '-6 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000021', 'Jorge falta B',   interval '-5 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000022', 'Jorge presença',  interval '-4 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000023', 'Jorge justif.',   interval '-3 days',  interval '2 hours'),
    ('a1000000-0000-0000-0000-000000000024', 'Jorge falta C',   interval '-2 days',  interval '2 hours')
  ) as x(id, title, s, dur);

-- CT08_05: janelas (início no futuro, 8 dias e 7 dias após o término)
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by, status) values
  ('a1000000-0000-0000-0000-000000000030', 'aaaaaaaa-0000-0000-0000-000000000001', 'futuro', 'walk',
   now() + interval '1 hour', now() + interval '3 hours', 5, '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('a1000000-0000-0000-0000-000000000031', 'aaaaaaaa-0000-0000-0000-000000000001', '8 dias', 'walk',
   now() - interval '8 days 2 hours', now() - interval '8 days', 5, '11111111-1111-1111-1111-111111111111', 'completed'),
  ('a1000000-0000-0000-0000-000000000032', 'aaaaaaaa-0000-0000-0000-000000000001', '7 dias', 'walk',
   now() - interval '7 days 2 hours', now() - interval '7 days' + interval '1 minute', 5, '11111111-1111-1111-1111-111111111111', 'completed'),
  -- T1 futuro do Lucas e T2 vazio (para o bloqueio)
  ('a1000000-0000-0000-0000-000000000040', 'aaaaaaaa-0000-0000-0000-000000000001', 'T1 futuro', 'walk',
   now() + interval '3 days', now() + interval '3 days 3 hours', 3, '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('a1000000-0000-0000-0000-000000000041', 'aaaaaaaa-0000-0000-0000-000000000001', 'T2 futuro', 'cleaning',
   now() + interval '3 days 4 hours', now() + interval '3 days 7 hours', 1, '11111111-1111-1111-1111-111111111111', 'scheduled');

insert into public.shift_enrollments (id, shift_id, user_id, status) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555555', 'absent'),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000011', '55555555-5555-5555-5555-555555555555', 'absent'),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000012', '55555555-5555-5555-5555-555555555555', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000040', 'a1000000-0000-0000-0000-000000000040', '55555555-5555-5555-5555-555555555555', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000020', '44444444-4444-4444-4444-444444444444', 'absent'),
  ('b1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000021', '44444444-4444-4444-4444-444444444444', 'absent'),
  ('b1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000022', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000023', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000024', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000030', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000031', '44444444-4444-4444-4444-444444444444', 'confirmed'),
  ('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000032', '44444444-4444-4444-4444-444444444444', 'confirmed');
select public._vs_refresh_shift(id) from public.volunteer_shifts where id::text like 'a1000000%';

-- ===== Cálculo da RN12 (função pura) =====
select is(public.compute_worked_minutes('attended', '2026-11-01 09:02-03', '2026-11-01 11:50-03',
                                        '2026-11-01 09:00-03', '2026-11-01 12:00-03'), 165, 'RN12 9h02–11h50 = 2h45 (blocos de 15)');
select is(public.compute_worked_minutes('attended', null, null, '2026-11-01 09:00-03', '2026-11-01 12:00-03'), 180,
  'RN12 sem horários vale a duração prevista');
select is(public.compute_worked_minutes('attended', '2026-11-01 09:55-03', '2026-11-01 15:40-03',
                                        '2026-11-01 09:00-03', '2026-11-01 13:00-03'), 300, 'RN12 limitado à duração + 1h');
select is(public.compute_worked_minutes('absent', '2026-11-01 09:00-03', '2026-11-01 12:00-03',
                                        '2026-11-01 09:00-03', '2026-11-01 12:00-03'), 0, 'RN12 falta vale zero');
select is(public.compute_worked_minutes('excused', null, null, '2026-11-01 09:00-03', '2026-11-01 12:00-03'), 0,
  'RN12 falta justificada vale zero');

-- ===== como Carla =====
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- CT08_01: entrada 9h02, saída 11h50
select is((public.mark_attendance('b1000000-0000-0000-0000-000000000001', 'attended',
             (select d + interval '2 minutes' from t_base), (select d + interval '2 hours 50 minutes' from t_base))).worked_minutes,
  165, 'CT08_01 registrou 2 horas e 45 minutos');
select results_eq($$ select attendance_marked_by, attendance_marked_at is not null from public.shift_enrollments
                     where id = 'b1000000-0000-0000-0000-000000000001' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, true) $$, 'CT08_01 guardou quem marcou e quando');

-- CT08_02: turno de 4h com permanência de 5h45
select is((public.mark_attendance('b1000000-0000-0000-0000-000000000002', 'attended',
             (select d - interval '1 day' from t_base), (select d - interval '1 day' + interval '5 hours 45 minutes' from t_base))).worked_minutes,
  300, 'CT08_02 contou 5 horas');

-- RNF15: correção dentro do prazo também é registrada
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000002', 'excused') $$, 'RNF15 correção');
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000002', 'attended',
             (select d - interval '1 day' from t_base), (select d - interval '1 day' + interval '5 hours 45 minutes' from t_base)) $$, 'RNF15 nova correção');
select results_eq($$ select previous_status::text, new_status::text from public.shift_attendance_log
                     where enrollment_id = 'b1000000-0000-0000-0000-000000000002' order by marked_at, id $$,
  $$ values (null::text, 'attended'), ('attended', 'excused'), ('excused', 'attended') $$,
  'RNF15 histórico de marcações e correções');

select throws_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000001', 'attended',
             (select d from t_base), null) $$, 'P0001',
  'Informe o horário de entrada e o de saída, ou deixe os dois em branco.', 'Entrada sem saída recusada');

-- CT08_03: terceira falta seguida sem justificativa
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000012', 'absent') $$, 'CT08_03 falta registrada');
reset role;
select results_eq($$ select count(*)::int, bool_and(blocked_until between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour')
                     from public.volunteer_blocks where user_id = '55555555-5555-5555-5555-555555555555' and lifted_at is null $$,
  $$ values (1, true) $$, 'CT08_03 bloqueio de 30 dias criado');
select is((select count(*)::int from public.notifications where user_id = '55555555-5555-5555-5555-555555555555'
            and kind = 'volunteer.blocked'), 1, 'CT08_03 Lucas recebeu a notificação do bloqueio');
select is((select status::text from public.shift_enrollments where id = 'b1000000-0000-0000-0000-000000000040'), 'confirmed',
  'CT08_03 inscrição futura continuou confirmada');
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select throws_like($$ select public.enroll_in_shift('a1000000-0000-0000-0000-000000000041') $$,
  '%bloqueado%' || to_char((now() + interval '30 days') at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '%',
  'CT08_03 inscrição no T2 recusada com a data de término do bloqueio');
reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.volunteer_blocks where user_id = '55555555-5555-5555-5555-555555555555'), 1,
  'CT08_03 Lucas aparece na lista de bloqueados da coordenação');

-- CT08_04: falta justificada não conta, presença zera
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000022', 'attended') $$, 'CT08_04 presença');
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000023', 'excused') $$, 'CT08_04 falta justificada');
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000024', 'absent') $$, 'CT08_04 nova falta');
reset role;
select is((select count(*)::int from public.volunteer_blocks where user_id = '44444444-4444-4444-4444-444444444444'), 0,
  'CT08_04 Jorge não foi bloqueado');

-- CT08_05: janela de registro
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000030', 'attended') $$, 'P0001',
  'A presença só pode ser registrada a partir do horário de início do turno.', 'CT08_05 antes do início recusado');
select throws_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000031', 'attended') $$, 'P0001',
  'O prazo para registrar a presença deste turno terminou (7 dias após o término).', 'CT08_05 8 dias depois recusado');
select lives_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000032', 'attended') $$,
  'CT08_05 7 dias depois aceito');
reset role;

-- Voluntário não registra presença
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.mark_attendance('b1000000-0000-0000-0000-000000000001', 'attended') $$, 'P0001',
  'Apenas a coordenação do abrigo pode registrar presença.', 'RNF09 voluntário não registra presença');
reset role;

-- ===== CT13_01: desbloqueio =====
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select ok((public.lift_volunteer_block((select id from public.volunteer_blocks
            where user_id = '55555555-5555-5555-5555-555555555555'))).lifted_at is not null, 'CT13_01 bloqueio encerrado');
reset role;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select is(public.enroll_in_shift('a1000000-0000-0000-0000-000000000041')->>'status', 'confirmed',
  'CT13_01 Lucas conseguiu se inscrever de novo');
reset role;
-- contagem zerada: uma nova falta (em turno posterior ao bloqueio) não bloqueia de novo
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by, status)
values ('a1000000-0000-0000-0000-000000000050', 'aaaaaaaa-0000-0000-0000-000000000001', 'pós-bloqueio', 'walk',
        clock_timestamp() + interval '1 second', clock_timestamp() + interval '2 hours', 2, '11111111-1111-1111-1111-111111111111', 'scheduled');
insert into public.shift_enrollments (id, shift_id, user_id, status)
values ('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000050', '55555555-5555-5555-5555-555555555555', 'absent');
select is((select count(*)::int from public.volunteer_blocks where user_id = '55555555-5555-5555-5555-555555555555' and lifted_at is null), 0,
  'CT13_01 contagem de faltas zerou');

select * from finish();
rollback;
