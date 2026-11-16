-- UC04 Inscrever-se em turno / UC05 Entrar na lista de espera
-- CT04_01, CT04_02, CT04_03, CT04_05, CT04_07, CT04_08 (RF31, RF32, RN07, RN08, RN11)
-- CT04_06 (concorrência) fica no teste de integração tests/integration/concurrency.test.ts
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

create temp table t_base as
  select ((date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '3 days 9 hours')
          at time zone 'America/Sao_Paulo') as d;
grant select on t_base to authenticated;

-- Turnos relativos à data base (mesmos horários da Tabela 12)
insert into public.volunteer_shifts (id, shelter_id, title, task_type, starts_at, ends_at, capacity, created_by)
select x.id::uuid, x.shelter::uuid, x.title, x.task::shift_task, d + x.s, d + x.e, x.cap, '11111111-1111-1111-1111-111111111111'
  from t_base, (values
    ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'T1 Passeio com os cães', 'walk',     interval '0 h', interval '3 h', 3),
    ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'T2 Limpeza dos canis',  'cleaning', interval '4 h', interval '7 h', 1),
    ('e0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'T3 Feira de adoção',    'event',    interval '1 h', interval '5 h', 5),
    ('e0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'T4 Banho e escovação',  'care',     interval '5 h', interval '6 h', 2),
    ('e0000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 'Fila cheia',            'other',    interval '1 day', interval '1 day 2 h', 1)
  ) as x(id, shelter, title, task, s, e, cap);

-- ===== CT04_01: inscrição com vaga =====
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select is(public.enroll_in_shift('e0000000-0000-0000-0000-000000000001')->>'status', 'confirmed', 'CT04_01 inscrição confirmada');
select is((select capacity - confirmed_count from public.volunteer_shifts where id = 'e0000000-0000-0000-0000-000000000001'), 2,
  'CT04_01 restam 2 vagas');
select is((select count(*)::int from public.notifications where kind = 'shift.enrolled'
            and payload->>'shift_id' = 'e0000000-0000-0000-0000-000000000001'), 1,
  'CT04_01 notificação de confirmação enviada');
select ok((select payload ? 'starts_at_label' from public.notifications where kind = 'shift.enrolled' limit 1),
  'CT04_01 notificação traz data e horário');

-- ===== CT04_08: inscrição repetida =====
select is(public.enroll_in_shift('e0000000-0000-0000-0000-000000000001')->>'already_enrolled', 'true',
  'CT04_08 mostra a inscrição existente');
reset role;
select is((select count(*)::int from public.shift_enrollments
            where shift_id = 'e0000000-0000-0000-0000-000000000001' and user_id = '44444444-4444-4444-4444-444444444444'), 1,
  'CT04_08 não criou segunda inscrição');

-- ===== CT04_02: turno lotado → lista de espera =====
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select is(public.enroll_in_shift('e0000000-0000-0000-0000-000000000002')->>'status', 'confirmed', 'CT04_02 Jorge pega a única vaga do T2');
reset role;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$ select r->>'status', (r->>'waitlist_position')::int
                       from (select public.enroll_in_shift('e0000000-0000-0000-0000-000000000002') as r) x $$,
  $$ values ('waitlisted', 1) $$, 'CT04_02 Lucas entrou na fila na posição 1');
select results_eq($$ select confirmed_count, capacity, waitlist_count from public.volunteer_shifts
                     where id = 'e0000000-0000-0000-0000-000000000002' $$,
  $$ values (1, 1, 1) $$, 'CT04_02 confirmados continuam iguais ao número de vagas');
reset role;

-- ===== CT04_03: conflito de horário em outro abrigo =====
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(public.enroll_in_shift('e0000000-0000-0000-0000-000000000003')->>'status', 'confirmed', 'CT04_03 Maria confirmada no T3 (Refúgio)');
select throws_like($$ select public.enroll_in_shift('e0000000-0000-0000-0000-000000000001') $$,
  '%T3 Feira de adoção%Refúgio Animal%', 'CT04_03 inscrição sobreposta recusada informando o turno em conflito');
select is(public.enroll_in_shift('e0000000-0000-0000-0000-000000000004')->>'status', 'confirmed',
  'CT04_03 turno que apenas encosta (T4 começa quando T3 termina) aceito');
reset role;
select results_eq($$ select s.title from public.shift_enrollments e join public.volunteer_shifts s on s.id = e.shift_id
                     where e.user_id = '33333333-3333-3333-3333-333333333333' and s.title like 'T%' order by s.title $$,
  $$ values ('T3 Feira de adoção'), ('T4 Banho e escovação') $$,
  'CT04_03 só existem as inscrições no T3 e no T4');

-- ===== CT04_05: voluntário bloqueado =====
insert into public.volunteer_blocks (shelter_id, user_id, reason, blocked_until)
values ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'teste', now() + interval '10 days');
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select throws_like($$ select public.enroll_in_shift('e0000000-0000-0000-0000-000000000004') $$,
  '%bloqueado%até ' || to_char((now() + interval '10 days') at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '%',
  'CT04_05 inscrição recusada informando a data de término do bloqueio');
reset role;

-- ===== CT04_07: lista de espera cheia (5 pessoas) =====
insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'extra@adotapet.test');
insert into public.shift_enrollments (shift_id, user_id, status, waitlist_position, enrolled_at) values
  ('e0000000-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777', 'confirmed', null, now()),
  ('e0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'waitlisted', 1, now() + interval '1 s'),
  ('e0000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'waitlisted', 2, now() + interval '2 s'),
  ('e0000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'waitlisted', 3, now() + interval '3 s'),
  ('e0000000-0000-0000-0000-000000000007', '55555555-5555-5555-5555-555555555555', 'waitlisted', 4, now() + interval '4 s'),
  ('e0000000-0000-0000-0000-000000000007', '66666666-6666-6666-6666-666666666666', 'waitlisted', 5, now() + interval '5 s');
select public._vs_refresh_shift('e0000000-0000-0000-0000-000000000007');
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.enroll_in_shift('e0000000-0000-0000-0000-000000000007') $$,
  'P0001', 'O turno está lotado e a lista de espera está completa (5 pessoas).', 'CT04_07 sexta tentativa recusada');
reset role;

-- Turno cancelado ou já iniciado não aceita inscrição
update public.volunteer_shifts set status = 'cancelled' where id = 'e0000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.enroll_in_shift('e0000000-0000-0000-0000-000000000004') $$,
  'P0001', 'Este turno não está mais aberto para inscrições.', 'Só turnos agendados aceitam inscrição');
reset role;

select * from finish();
rollback;
