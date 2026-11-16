-- Escala de voluntariado — funções e regras de negócio
-- As regras (RN06–RN16) ficam no banco, para valer em qualquer caminho que chegue
-- até ele. As alterações passam por funções SECURITY DEFINER que conferem
-- auth.uid() (RNF09) e todos os cálculos de prazo usam now() do servidor (RNF13).

-- ============ Helpers internos ============

-- Coordenador = membro do abrigo com papel admin ou editor
create or replace function public.is_shelter_coordinator(p_shelter uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_member(p_shelter, p_user, array['admin','editor']::shelter_role[]);
$$;

-- Mensagem de erro padronizada (o front mostra error.message)
create or replace function public._vs_fail(p_message text, p_hint text default null)
returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception using message = p_message, errcode = 'P0001', hint = coalesce(p_hint, '');
end;
$$;

-- Formatação de data/hora no fuso de Brasília para textos de notificação
create or replace function public._vs_fmt(p_ts timestamptz)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(p_ts at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24"h"MI');
$$;

create or replace function public._vs_notify(
  p_user uuid,
  p_kind text,
  p_shift public.volunteer_shifts,
  p_extra jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shelter_name text;
begin
  select name into v_shelter_name from public.shelters where id = p_shift.shelter_id;
  insert into public.notifications(user_id, kind, payload)
  values (
    p_user,
    p_kind,
    jsonb_build_object(
      'shift_id',     p_shift.id,
      'shift_title',  p_shift.title,
      'shelter_id',   p_shift.shelter_id,
      'shelter_name', v_shelter_name,
      'starts_at',    p_shift.starts_at,
      'ends_at',      p_shift.ends_at,
      'starts_at_label', public._vs_fmt(p_shift.starts_at)
    ) || coalesce(p_extra, '{}'::jsonb)
  );
end;
$$;

-- Recalcula as posições da fila (ordem de entrada) e os contadores do turno
create or replace function public._vs_refresh_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ordered as (
    select id, row_number() over (order by enrolled_at, id) as pos
    from public.shift_enrollments
    where shift_id = p_shift_id and status = 'waitlisted'
  )
  update public.shift_enrollments e
     set waitlist_position = o.pos
    from ordered o
   where e.id = o.id
     and e.waitlist_position is distinct from o.pos;

  update public.volunteer_shifts s
     set confirmed_count = (select count(*) from public.shift_enrollments
                             where shift_id = p_shift_id and status = 'confirmed'),
         waitlist_count  = (select count(*) from public.shift_enrollments
                             where shift_id = p_shift_id and status = 'waitlisted')
   where s.id = p_shift_id;
end;
$$;

-- RN13: validação de horário e vagas
create or replace function public._vs_validate_shift(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity int
)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_starts_at is null or p_ends_at is null then
    perform public._vs_fail('Informe o horário de início e de término do turno.');
  end if;
  if p_starts_at <= now() then
    perform public._vs_fail('O turno deve começar no futuro.');
  end if;
  if p_ends_at - p_starts_at < interval '1 hour' or p_ends_at - p_starts_at > interval '8 hours' then
    perform public._vs_fail('O turno deve durar no mínimo 1 hora e no máximo 8 horas.');
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 20 then
    perform public._vs_fail('O número de vagas deve estar entre 1 e 20');
  end if;
end;
$$;

-- RN12: minutos de um turno
-- Diferença entre saída e entrada, arredondada para baixo em blocos de 15 minutos e
-- limitada à duração prevista + 1 hora. Sem horários, vale a duração prevista.
-- Falta e falta justificada valem zero.
create or replace function public.compute_worked_minutes(
  p_status enrollment_status,
  p_checked_in_at timestamptz,
  p_checked_out_at timestamptz,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_status <> 'attended' then 0
    when p_checked_in_at is null or p_checked_out_at is null then
      (extract(epoch from (p_ends_at - p_starts_at)) / 60)::int
    else least(
      (floor(extract(epoch from (p_checked_out_at - p_checked_in_at)) / 60 / 15) * 15)::int,
      (extract(epoch from (p_ends_at - p_starts_at)) / 60)::int + 60
    )
  end;
$$;

-- Bloqueio ativo do voluntário no abrigo (RN11)
create or replace function public.active_volunteer_block(p_shelter uuid, p_user uuid)
returns public.volunteer_blocks
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.volunteer_blocks
  where shelter_id = p_shelter
    and user_id = p_user
    and lifted_at is null
    and blocked_until > now()
  order by blocked_until desc
  limit 1;
$$;

-- ============ UC07 / RF34 / RN10: promover lista de espera ============
-- Só promove se faltarem pelo menos 2 horas para o início. Com menos de 2 horas a vaga
-- fica aberta para inscrição direta e a fila é mantida.
create or replace function public.promote_waitlist(p_shift_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.volunteer_shifts;
  v_next  public.shift_enrollments;
  v_promoted int := 0;
begin
  select * into v_shift from public.volunteer_shifts where id = p_shift_id for update;
  if not found or v_shift.status <> 'scheduled' then
    return 0;
  end if;
  if v_shift.starts_at - now() < interval '2 hours' then
    return 0;
  end if;

  loop
    exit when (select count(*) from public.shift_enrollments
                where shift_id = p_shift_id and status = 'confirmed') >= v_shift.capacity;

    select * into v_next
      from public.shift_enrollments
     where shift_id = p_shift_id and status = 'waitlisted'
     order by waitlist_position, enrolled_at
     limit 1
     for update;
    exit when not found;

    update public.shift_enrollments
       set status = 'confirmed', waitlist_position = null
     where id = v_next.id;

    perform public._vs_notify(v_next.user_id, 'shift.promoted', v_shift);
    v_promoted := v_promoted + 1;
  end loop;

  perform public._vs_refresh_shift(p_shift_id);
  return v_promoted;
end;
$$;

-- ============ UC01 / UC02: gerenciar turnos ============

-- RF27 / RF29: cria um turno ou uma série semanal (até 12 semanas)
create or replace function public.create_shift(
  p_shelter_id   uuid,
  p_title        text,
  p_task_type    shift_task,
  p_description  text,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_capacity     int,
  p_repeat_weeks int default 1
)
returns setof public.volunteer_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_group uuid;
  i int;
begin
  if v_uid is null or not public.is_shelter_coordinator(p_shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode gerenciar turnos.');
  end if;
  if p_title is null or length(btrim(p_title)) < 2 then
    perform public._vs_fail('Informe um título com pelo menos 2 caracteres.');
  end if;
  if p_repeat_weeks is null or p_repeat_weeks < 1 or p_repeat_weeks > 12 then
    perform public._vs_fail('A recorrência semanal deve ser de 1 a 12 semanas.');
  end if;

  perform public._vs_validate_shift(p_starts_at, p_ends_at, p_capacity);

  if p_repeat_weeks > 1 then
    v_group := gen_random_uuid();
  end if;

  for i in 0 .. p_repeat_weeks - 1 loop
    -- soma semanas no fuso de Brasília para manter o mesmo horário local
    return query
      insert into public.volunteer_shifts(
        shelter_id, title, task_type, description, starts_at, ends_at,
        capacity, recurrence_group_id, created_by
      )
      values (
        p_shelter_id,
        btrim(p_title),
        coalesce(p_task_type, 'other'),
        nullif(btrim(coalesce(p_description, '')), ''),
        ((p_starts_at at time zone 'America/Sao_Paulo') + make_interval(weeks => i)) at time zone 'America/Sao_Paulo',
        ((p_ends_at   at time zone 'America/Sao_Paulo') + make_interval(weeks => i)) at time zone 'America/Sao_Paulo',
        p_capacity,
        v_group,
        v_uid
      )
      returning *;
  end loop;
end;
$$;

-- RF28 / RN14: edita um turno agendado
create or replace function public.update_shift(
  p_shift_id    uuid,
  p_title       text,
  p_task_type   shift_task,
  p_description text,
  p_starts_at   timestamptz,
  p_ends_at     timestamptz,
  p_capacity    int
)
returns public.volunteer_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_shift public.volunteer_shifts;
  v_times_changed boolean;
  r record;
begin
  select * into v_shift from public.volunteer_shifts where id = p_shift_id for update;
  if not found then
    perform public._vs_fail('Turno não encontrado.');
  end if;
  if v_uid is null or not public.is_shelter_coordinator(v_shift.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode gerenciar turnos.');
  end if;
  if v_shift.status <> 'scheduled' or v_shift.starts_at <= now() then
    perform public._vs_fail('Só é possível editar turnos agendados que ainda não começaram.');
  end if;
  if p_title is null or length(btrim(p_title)) < 2 then
    perform public._vs_fail('Informe um título com pelo menos 2 caracteres.');
  end if;

  perform public._vs_validate_shift(p_starts_at, p_ends_at, p_capacity);

  if p_capacity < v_shift.confirmed_count then
    perform public._vs_fail(format(
      'O turno já tem %s inscrições confirmadas. O número de vagas não pode ser menor que isso.',
      v_shift.confirmed_count));
  end if;

  v_times_changed := p_starts_at <> v_shift.starts_at or p_ends_at <> v_shift.ends_at;

  update public.volunteer_shifts
     set title = btrim(p_title),
         task_type = coalesce(p_task_type, task_type),
         description = nullif(btrim(coalesce(p_description, '')), ''),
         starts_at = p_starts_at,
         ends_at = p_ends_at,
         capacity = p_capacity
   where id = p_shift_id
  returning * into v_shift;

  if v_times_changed then
    for r in select user_id from public.shift_enrollments
              where shift_id = p_shift_id and status in ('confirmed','waitlisted')
    loop
      perform public._vs_notify(r.user_id, 'shift.updated', v_shift);
    end loop;
  end if;

  -- mais vagas → a fila anda (UC07 incluído na gestão de turnos)
  perform public.promote_waitlist(p_shift_id);

  select * into v_shift from public.volunteer_shifts where id = p_shift_id;
  return v_shift;
end;
$$;

-- RF28: cancela um turno (ou a ocorrência e as seguintes da série), avisando inscritos e fila
create or replace function public.cancel_shift(
  p_shift_id     uuid,
  p_whole_series boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_shift public.volunteer_shifts;
  s public.volunteer_shifts;
  r record;
  v_count int := 0;
begin
  select * into v_shift from public.volunteer_shifts where id = p_shift_id;
  if not found then
    perform public._vs_fail('Turno não encontrado.');
  end if;
  if v_uid is null or not public.is_shelter_coordinator(v_shift.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode gerenciar turnos.');
  end if;
  if v_shift.status <> 'scheduled' then
    perform public._vs_fail('Este turno não está mais agendado.');
  end if;

  for s in
    select * from public.volunteer_shifts
     where status = 'scheduled'
       and (
         id = p_shift_id
         or (p_whole_series
             and v_shift.recurrence_group_id is not null
             and recurrence_group_id = v_shift.recurrence_group_id
             and starts_at >= v_shift.starts_at)
       )
     order by starts_at
     for update
  loop
    update public.volunteer_shifts
       set status = 'cancelled', cancelled_at = now()
     where id = s.id;

    for r in
      update public.shift_enrollments
         set status = 'cancelled', waitlist_position = null,
             cancelled_at = now(), cancelled_by = v_uid
       where shift_id = s.id and status in ('confirmed','waitlisted')
      returning user_id
    loop
      perform public._vs_notify(r.user_id, 'shift.cancelled', s);
    end loop;

    perform public._vs_refresh_shift(s.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- RN14: turno com inscritos não pode ser excluído, apenas cancelado
create or replace function public.delete_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_shift public.volunteer_shifts;
begin
  select * into v_shift from public.volunteer_shifts where id = p_shift_id for update;
  if not found then
    perform public._vs_fail('Turno não encontrado.');
  end if;
  if v_uid is null or not public.is_shelter_coordinator(v_shift.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode gerenciar turnos.');
  end if;
  if exists (select 1 from public.shift_enrollments where shift_id = p_shift_id) then
    perform public._vs_fail('Este turno já tem inscritos e só pode ser cancelado.');
  end if;
  delete from public.volunteer_shifts where id = p_shift_id;
end;
$$;

-- ============ UC04 / UC05: inscrição (RNF08) ============
-- O SELECT ... FOR UPDATE trava o turno durante a operação: duas inscrições simultâneas
-- na última vaga resultam em uma confirmação e uma entrada na lista de espera.
create or replace function public.enroll_in_shift(p_shift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_shift    public.volunteer_shifts;
  v_existing public.shift_enrollments;
  v_block    public.volunteer_blocks;
  v_conflict record;
  v_enr      public.shift_enrollments;
  v_confirmed int;
  v_waiting   int;
begin
  if v_uid is null then
    perform public._vs_fail('Entre na sua conta para se inscrever.');
  end if;

  -- serializa as inscrições da mesma pessoa (conflito de horário entre abrigos)
  perform pg_advisory_xact_lock(hashtextextended('vs_enroll:' || v_uid::text, 0));

  select * into v_shift from public.volunteer_shifts where id = p_shift_id for update;
  if not found then
    perform public._vs_fail('Turno não encontrado.');
  end if;

  -- RN06
  if not public.is_member(v_shift.shelter_id, v_uid, array['volunteer']::shelter_role[]) then
    perform public._vs_fail('Somente voluntários deste abrigo podem se inscrever nos turnos.');
  end if;

  if v_shift.status <> 'scheduled' or v_shift.starts_at <= now() then
    perform public._vs_fail('Este turno não está mais aberto para inscrições.');
  end if;

  -- A4: inscrição repetida
  select * into v_existing
    from public.shift_enrollments
   where shift_id = p_shift_id and user_id = v_uid and status in ('confirmed','waitlisted');
  if found then
    return jsonb_build_object(
      'enrollment_id', v_existing.id,
      'status', v_existing.status,
      'waitlist_position', v_existing.waitlist_position,
      'already_enrolled', true
    );
  end if;

  -- A3 / RN11: voluntário bloqueado
  v_block := public.active_volunteer_block(v_shift.shelter_id, v_uid);
  if v_block.id is not null then
    perform public._vs_fail(format(
      'Você está bloqueado para novas inscrições neste abrigo até %s, por faltas seguidas sem justificativa.',
      to_char(v_block.blocked_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')));
  end if;

  -- A2 / RN07: conflito de horário (turnos que só se encostam não conflitam)
  select s.title, s.starts_at, s.ends_at, sh.name as shelter_name
    into v_conflict
    from public.shift_enrollments e
    join public.volunteer_shifts s on s.id = e.shift_id
    join public.shelters sh on sh.id = s.shelter_id
   where e.user_id = v_uid
     and e.status in ('confirmed','waitlisted')
     and s.status <> 'cancelled'
     and s.id <> p_shift_id
     and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(v_shift.starts_at, v_shift.ends_at, '[)')
   order by s.starts_at
   limit 1;
  if found then
    perform public._vs_fail(format(
      'Você já está inscrito em "%s" no %s, das %s às %s, e esse horário se sobrepõe a este turno.',
      v_conflict.title, v_conflict.shelter_name,
      to_char(v_conflict.starts_at at time zone 'America/Sao_Paulo', 'HH24"h"MI'),
      to_char(v_conflict.ends_at   at time zone 'America/Sao_Paulo', 'HH24"h"MI')));
  end if;

  select count(*) filter (where status = 'confirmed'),
         count(*) filter (where status = 'waitlisted')
    into v_confirmed, v_waiting
    from public.shift_enrollments
   where shift_id = p_shift_id;

  if v_confirmed < v_shift.capacity then
    insert into public.shift_enrollments(shift_id, user_id, status)
    values (p_shift_id, v_uid, 'confirmed')
    returning * into v_enr;
    perform public._vs_refresh_shift(p_shift_id);
    perform public._vs_notify(v_uid, 'shift.enrolled', v_shift);
  else
    -- RN08: fila com no máximo 5 pessoas
    if v_waiting >= 5 then
      perform public._vs_fail('O turno está lotado e a lista de espera está completa (5 pessoas).');
    end if;
    insert into public.shift_enrollments(shift_id, user_id, status, waitlist_position)
    values (p_shift_id, v_uid, 'waitlisted', v_waiting + 1)
    returning * into v_enr;
    perform public._vs_refresh_shift(p_shift_id);
    select * into v_enr from public.shift_enrollments where id = v_enr.id;
    perform public._vs_notify(v_uid, 'shift.waitlisted', v_shift,
      jsonb_build_object('waitlist_position', v_enr.waitlist_position));
  end if;

  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'status', v_enr.status,
    'waitlist_position', v_enr.waitlist_position,
    'already_enrolled', false
  );
end;
$$;

-- ============ UC06: cancelar inscrição (RN09) ============
create or replace function public.cancel_enrollment(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_enr   public.shift_enrollments;
  v_shift public.volunteer_shifts;
  v_promoted int := 0;
begin
  select * into v_enr from public.shift_enrollments where id = p_enrollment_id;
  if not found or v_enr.user_id is distinct from v_uid then
    perform public._vs_fail('Inscrição não encontrada.');
  end if;

  select * into v_shift from public.volunteer_shifts where id = v_enr.shift_id for update;
  select * into v_enr from public.shift_enrollments where id = p_enrollment_id for update;

  if v_enr.status not in ('confirmed','waitlisted') then
    perform public._vs_fail('Esta inscrição não está mais ativa.');
  end if;
  if v_shift.starts_at <= now() then
    perform public._vs_fail('O turno já começou. Fale com a coordenação do abrigo.');
  end if;

  -- A1: confirmados só cancelam até 12 horas antes. A2: fila não tem prazo.
  if v_enr.status = 'confirmed' and now() > v_shift.starts_at - interval '12 hours' then
    perform public._vs_fail(
      'O prazo de cancelamento terminou: faltam menos de 12 horas para o início. Fale com a coordenação do abrigo.');
  end if;

  update public.shift_enrollments
     set status = 'cancelled', waitlist_position = null,
         cancelled_at = now(), cancelled_by = v_uid
   where id = p_enrollment_id;

  perform public._vs_refresh_shift(v_shift.id);
  if v_enr.status = 'confirmed' then
    v_promoted := public.promote_waitlist(v_shift.id);
  end if;

  return jsonb_build_object('cancelled', true, 'promoted', v_promoted);
end;
$$;

-- RN09: depois do prazo, só a coordenação libera a vaga (UC07 incluído)
create or replace function public.release_enrollment(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_enr   public.shift_enrollments;
  v_shift public.volunteer_shifts;
  v_promoted int := 0;
begin
  select * into v_enr from public.shift_enrollments where id = p_enrollment_id;
  if not found then
    perform public._vs_fail('Inscrição não encontrada.');
  end if;
  select * into v_shift from public.volunteer_shifts where id = v_enr.shift_id for update;
  if v_uid is null or not public.is_shelter_coordinator(v_shift.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode liberar vagas.');
  end if;
  select * into v_enr from public.shift_enrollments where id = p_enrollment_id for update;
  if v_enr.status not in ('confirmed','waitlisted') then
    perform public._vs_fail('Esta inscrição não está mais ativa.');
  end if;
  if v_shift.starts_at <= now() then
    perform public._vs_fail('O turno já começou. Registre a presença ou a falta.');
  end if;

  update public.shift_enrollments
     set status = 'cancelled', waitlist_position = null,
         cancelled_at = now(), cancelled_by = v_uid
   where id = p_enrollment_id;

  perform public._vs_notify(v_enr.user_id, 'shift.released', v_shift);
  perform public._vs_refresh_shift(v_shift.id);
  if v_enr.status = 'confirmed' then
    v_promoted := public.promote_waitlist(v_shift.id);
  end if;

  return jsonb_build_object('cancelled', true, 'promoted', v_promoted);
end;
$$;

-- ============ UC08: registrar presença (RN11, RN12, RN15, RNF15) ============
create or replace function public.mark_attendance(
  p_enrollment_id  uuid,
  p_status         enrollment_status,
  p_checked_in_at  timestamptz default null,
  p_checked_out_at timestamptz default null
)
returns public.shift_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_enr    public.shift_enrollments;
  v_shift  public.volunteer_shifts;
  v_minutes int;
  v_last_block_at timestamptz;
  v_streak int := 0;
  v_prev   enrollment_status;
  r record;
begin
  select * into v_enr from public.shift_enrollments where id = p_enrollment_id for update;
  if not found then
    perform public._vs_fail('Inscrição não encontrada.');
  end if;
  v_prev := v_enr.status;
  select * into v_shift from public.volunteer_shifts where id = v_enr.shift_id;

  if v_uid is null or not public.is_shelter_coordinator(v_shift.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode registrar presença.');
  end if;
  if p_status not in ('attended','absent','excused') then
    perform public._vs_fail('Situação de presença inválida.');
  end if;
  if v_shift.status = 'cancelled' then
    perform public._vs_fail('O turno foi cancelado.');
  end if;
  if v_enr.status not in ('confirmed','attended','absent','excused') then
    perform public._vs_fail('Só é possível registrar presença de inscrições confirmadas.');
  end if;

  -- RN15: a partir do início e até 7 dias depois do término
  if now() < v_shift.starts_at then
    perform public._vs_fail('A presença só pode ser registrada a partir do horário de início do turno.');
  end if;
  if now() > v_shift.ends_at + interval '7 days' then
    perform public._vs_fail('O prazo para registrar a presença deste turno terminou (7 dias após o término).');
  end if;

  if p_status = 'attended' then
    if (p_checked_in_at is null) <> (p_checked_out_at is null) then
      perform public._vs_fail('Informe o horário de entrada e o de saída, ou deixe os dois em branco.');
    end if;
    if p_checked_in_at is not null and p_checked_out_at <= p_checked_in_at then
      perform public._vs_fail('O horário de saída deve ser depois do horário de entrada.');
    end if;
  else
    p_checked_in_at := null;
    p_checked_out_at := null;
  end if;

  v_minutes := public.compute_worked_minutes(
    p_status, p_checked_in_at, p_checked_out_at, v_shift.starts_at, v_shift.ends_at);

  update public.shift_enrollments
     set status = p_status,
         checked_in_at = p_checked_in_at,
         checked_out_at = p_checked_out_at,
         worked_minutes = v_minutes,
         attendance_marked_by = v_uid,
         attendance_marked_at = now()
   where id = p_enrollment_id
  returning * into v_enr;

  insert into public.shift_attendance_log(
    enrollment_id, previous_status, new_status, checked_in_at, checked_out_at,
    worked_minutes, marked_by, marked_at)
  values (
    p_enrollment_id,
    case when v_prev in ('attended','absent','excused') then v_prev end,
    p_status, p_checked_in_at, p_checked_out_at, v_minutes, v_uid, clock_timestamp());

  -- RN11: três faltas seguidas sem justificativa → bloqueio de 30 dias.
  -- Falta justificada não conta nem zera; presença zera; um bloqueio anterior zera.
  if p_status = 'absent' and public.active_volunteer_block(v_shift.shelter_id, v_enr.user_id) is null then
    select max(created_at) into v_last_block_at
      from public.volunteer_blocks
     where shelter_id = v_shift.shelter_id and user_id = v_enr.user_id;

    for r in
      select e.status
        from public.shift_enrollments e
        join public.volunteer_shifts s on s.id = e.shift_id
       where e.user_id = v_enr.user_id
         and s.shelter_id = v_shift.shelter_id
         and e.status in ('attended','absent')
         and s.starts_at > coalesce(v_last_block_at, '-infinity'::timestamptz)
       order by s.starts_at desc
    loop
      exit when r.status = 'attended';
      v_streak := v_streak + 1;
    end loop;

    if v_streak >= 3 then
      insert into public.volunteer_blocks(shelter_id, user_id, reason, blocked_until)
      values (v_shift.shelter_id, v_enr.user_id,
              'Três faltas seguidas sem justificativa', now() + interval '30 days');
      perform public._vs_notify(v_enr.user_id, 'volunteer.blocked', v_shift,
        jsonb_build_object('blocked_until', now() + interval '30 days',
                           'blocked_until_label',
                           to_char((now() + interval '30 days') at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')));
    end if;
  end if;

  return v_enr;
end;
$$;

-- ============ UC13: desbloquear voluntário (RF40) ============
create or replace function public.lift_volunteer_block(p_block_id uuid)
returns public.volunteer_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_block public.volunteer_blocks;
  v_shelter_name text;
begin
  select * into v_block from public.volunteer_blocks where id = p_block_id for update;
  if not found then
    perform public._vs_fail('Bloqueio não encontrado.');
  end if;
  if v_uid is null or not public.is_shelter_coordinator(v_block.shelter_id, v_uid) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode remover bloqueios.');
  end if;
  if v_block.lifted_at is not null or v_block.blocked_until <= now() then
    perform public._vs_fail('Este bloqueio já foi encerrado.');
  end if;

  update public.volunteer_blocks
     set lifted_at = now(), lifted_by = v_uid
   where id = p_block_id
  returning * into v_block;

  select name into v_shelter_name from public.shelters where id = v_block.shelter_id;
  insert into public.notifications(user_id, kind, payload)
  values (v_block.user_id, 'volunteer.unblocked',
          jsonb_build_object('shelter_id', v_block.shelter_id, 'shelter_name', v_shelter_name));

  return v_block;
end;
$$;

-- ============ UC09: horas de voluntariado (RF36) ============
create or replace function public.volunteer_hours_summary(
  p_from date default null,
  p_to   date default null
)
returns table (
  shelter_id    uuid,
  shelter_name  text,
  total_minutes bigint,
  shifts_count  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select s.shelter_id, sh.name, sum(e.worked_minutes)::bigint, count(*)::bigint
    from public.shift_enrollments e
    join public.volunteer_shifts s on s.id = e.shift_id
    join public.shelters sh on sh.id = s.shelter_id
   where e.user_id = auth.uid()
     and e.status = 'attended'
     and (p_from is null or (s.starts_at at time zone 'America/Sao_Paulo')::date >= p_from)
     and (p_to   is null or (s.starts_at at time zone 'America/Sao_Paulo')::date <= p_to)
   group by s.shelter_id, sh.name
   order by sh.name;
$$;

-- ============ UC14: indicadores (RF41) ============
create or replace function public.shelter_schedule_indicators(p_shelter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_capacity  bigint;
  v_confirmed bigint;
  v_attended  bigint;
  v_closed    bigint;
  v_uncovered jsonb;
begin
  if not public.is_shelter_coordinator(p_shelter_id, auth.uid()) then
    perform public._vs_fail('Apenas a coordenação do abrigo pode ver os indicadores.');
  end if;

  -- ocupação: turnos agendados dos próximos 7 dias
  select coalesce(sum(capacity), 0), coalesce(sum(confirmed_count), 0)
    into v_capacity, v_confirmed
    from public.volunteer_shifts
   where shelter_id = p_shelter_id
     and status = 'scheduled'
     and starts_at >= now()
     and starts_at < now() + interval '7 days';

  -- presença: inscrições encerradas (com presença registrada) dos últimos 30 dias
  select count(*) filter (where e.status = 'attended'),
         count(*) filter (where e.status in ('attended','absent','excused'))
    into v_attended, v_closed
    from public.shift_enrollments e
    join public.volunteer_shifts s on s.id = e.shift_id
   where s.shelter_id = p_shelter_id
     and s.ends_at <= now()
     and s.ends_at > now() - interval '30 days';

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'title', title, 'starts_at', starts_at, 'ends_at', ends_at, 'capacity', capacity)
           order by starts_at), '[]'::jsonb)
    into v_uncovered
    from public.volunteer_shifts
   where shelter_id = p_shelter_id
     and status = 'scheduled'
     and confirmed_count = 0
     and starts_at >= now()
     and starts_at < now() + interval '7 days';

  return jsonb_build_object(
    'capacity_next_7_days', v_capacity,
    'confirmed_next_7_days', v_confirmed,
    'occupancy_rate', case when v_capacity > 0 then round(v_confirmed * 100.0 / v_capacity) else null end,
    'attended_last_30_days', v_attended,
    'closed_last_30_days', v_closed,
    'attendance_rate', case when v_closed > 0 then round(v_attended * 100.0 / v_closed) else null end,
    'uncovered_shifts', v_uncovered
  );
end;
$$;

-- ============ UC10 / UC11: certificados (RF37, RF38, RN16) ============

create or replace function public.mask_cpf(p_cpf text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_cpf is null then null
    when regexp_replace(p_cpf, '\D', '', 'g') ~ '^\d{11}$' then
      '***.' || substr(regexp_replace(p_cpf, '\D', '', 'g'), 4, 3) || '.'
             || substr(regexp_replace(p_cpf, '\D', '', 'g'), 7, 3) || '-**'
    else null
  end;
$$;

create or replace function public._vs_new_certificate_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code  text;
  i int;
begin
  loop
    v_bytes := extensions.gen_random_bytes(10);
    v_code := '';
    for i in 0..9 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.volunteer_certificates where code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.issue_certificate(
  p_shelter_id uuid,
  p_from date,
  p_to   date
)
returns public.volunteer_certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_minutes bigint;
  v_count bigint;
  v_profile public.profiles;
  v_shelter_name text;
  v_cert public.volunteer_certificates;
begin
  if v_uid is null then
    perform public._vs_fail('Entre na sua conta para emitir o certificado.');
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    perform public._vs_fail('Informe um período válido.');
  end if;
  if p_to - p_from > 366 then
    perform public._vs_fail('O período do certificado pode ter no máximo um ano.');
  end if;

  select coalesce(sum(e.worked_minutes), 0), count(*)
    into v_minutes, v_count
    from public.shift_enrollments e
    join public.volunteer_shifts s on s.id = e.shift_id
   where e.user_id = v_uid
     and s.shelter_id = p_shelter_id
     and e.status = 'attended'
     and (s.starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to;

  if v_count = 0 or v_minutes = 0 then
    perform public._vs_fail('Não há horas registradas neste abrigo no período escolhido.');
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  select name into v_shelter_name from public.shelters where id = p_shelter_id;

  insert into public.volunteer_certificates(
    code, user_id, shelter_id, period_start, period_end, total_minutes, shifts_count,
    volunteer_name, cpf_masked, shelter_name)
  values (
    public._vs_new_certificate_code(), v_uid, p_shelter_id, p_from, p_to, v_minutes, v_count,
    coalesce(v_profile.full_name, 'Voluntário'), public.mask_cpf(v_profile.cpf_encrypted), v_shelter_name)
  returning * into v_cert;

  return v_cert;
end;
$$;

create or replace function public.attach_certificate_file(p_certificate_id uuid, p_file_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.volunteer_certificates
     set file_path = p_file_path
   where id = p_certificate_id
     and user_id = auth.uid()
     and p_file_path like auth.uid()::text || '/%';
  if not found then
    perform public._vs_fail('Certificado não encontrado.');
  end if;
end;
$$;

-- Validação pública: só os dados do certificado, sem o arquivo nem o CPF completo
create or replace function public.verify_certificate(p_code text)
returns table (
  code           text,
  volunteer_name text,
  cpf_masked     text,
  shelter_name   text,
  period_start   date,
  period_end     date,
  total_minutes  int,
  shifts_count   int,
  issued_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.code::text, c.volunteer_name, c.cpf_masked, c.shelter_name,
         c.period_start, c.period_end, c.total_minutes, c.shifts_count, c.issued_at
    from public.volunteer_certificates c
   where c.code = upper(btrim(p_code));
$$;

-- ============ UC12: rotinas agendadas (RF39, RNF12) ============

-- Lembrete ~24h antes; cada inscrição recebe no máximo um (reminder_sent_at)
create or replace function public.send_shift_reminders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with due as (
    update public.shift_enrollments e
       set reminder_sent_at = now()
      from public.volunteer_shifts s
     where s.id = e.shift_id
       and e.status = 'confirmed'
       and e.reminder_sent_at is null
       and s.status = 'scheduled'
       and s.starts_at > now()
       and s.starts_at <= now() + interval '24 hours'
    returning e.user_id, s.id as shift_id, s.title, s.shelter_id, s.starts_at, s.ends_at
  ), ins as (
    insert into public.notifications(user_id, kind, payload)
    select d.user_id, 'shift.reminder',
           jsonb_build_object(
             'shift_id', d.shift_id, 'shift_title', d.title,
             'shelter_id', d.shelter_id, 'shelter_name', sh.name,
             'starts_at', d.starts_at, 'ends_at', d.ends_at,
             'starts_at_label', public._vs_fmt(d.starts_at))
      from due d
      join public.shelters sh on sh.id = d.shelter_id
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

-- Marca como concluídos os turnos que já terminaram
create or replace function public.complete_finished_shifts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.volunteer_shifts
     set status = 'completed'
   where status = 'scheduled' and ends_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============ Permissões de execução ============
-- Internas: não podem ser chamadas pelo /rpc
revoke execute on function public._vs_fail(text, text)                                   from public, anon, authenticated;
revoke execute on function public._vs_fmt(timestamptz)                                    from public, anon, authenticated;
revoke execute on function public._vs_notify(uuid, text, public.volunteer_shifts, jsonb)  from public, anon, authenticated;
revoke execute on function public._vs_refresh_shift(uuid)                                 from public, anon, authenticated;
revoke execute on function public._vs_validate_shift(timestamptz, timestamptz, int)       from public, anon, authenticated;
revoke execute on function public._vs_new_certificate_code()                              from public, anon, authenticated;
revoke execute on function public.promote_waitlist(uuid)                                  from public, anon, authenticated;
revoke execute on function public.send_shift_reminders()                                  from public, anon, authenticated;
revoke execute on function public.complete_finished_shifts()                              from public, anon, authenticated;
revoke execute on function public.active_volunteer_block(uuid, uuid)                      from public, anon;

-- Ações do usuário autenticado (cada função confere auth.uid() e o papel)
revoke execute on function public.create_shift(uuid, text, shift_task, text, timestamptz, timestamptz, int, int) from public, anon;
revoke execute on function public.update_shift(uuid, text, shift_task, text, timestamptz, timestamptz, int)      from public, anon;
revoke execute on function public.cancel_shift(uuid, boolean)                     from public, anon;
revoke execute on function public.delete_shift(uuid)                              from public, anon;
revoke execute on function public.enroll_in_shift(uuid)                           from public, anon;
revoke execute on function public.cancel_enrollment(uuid)                         from public, anon;
revoke execute on function public.release_enrollment(uuid)                        from public, anon;
revoke execute on function public.mark_attendance(uuid, enrollment_status, timestamptz, timestamptz) from public, anon;
revoke execute on function public.lift_volunteer_block(uuid)                      from public, anon;
revoke execute on function public.volunteer_hours_summary(date, date)             from public, anon;
revoke execute on function public.shelter_schedule_indicators(uuid)               from public, anon;
revoke execute on function public.issue_certificate(uuid, date, date)             from public, anon;
revoke execute on function public.attach_certificate_file(uuid, text)             from public, anon;
revoke execute on function public.is_shelter_coordinator(uuid, uuid)              from public, anon;

grant execute on function public.create_shift(uuid, text, shift_task, text, timestamptz, timestamptz, int, int) to authenticated;
grant execute on function public.update_shift(uuid, text, shift_task, text, timestamptz, timestamptz, int)      to authenticated;
grant execute on function public.cancel_shift(uuid, boolean)                     to authenticated;
grant execute on function public.delete_shift(uuid)                              to authenticated;
grant execute on function public.enroll_in_shift(uuid)                           to authenticated;
grant execute on function public.cancel_enrollment(uuid)                         to authenticated;
grant execute on function public.release_enrollment(uuid)                        to authenticated;
grant execute on function public.mark_attendance(uuid, enrollment_status, timestamptz, timestamptz) to authenticated;
grant execute on function public.lift_volunteer_block(uuid)                      to authenticated;
grant execute on function public.volunteer_hours_summary(date, date)             to authenticated;
grant execute on function public.shelter_schedule_indicators(uuid)               to authenticated;
grant execute on function public.issue_certificate(uuid, date, date)             to authenticated;
grant execute on function public.attach_certificate_file(uuid, text)             to authenticated;
grant execute on function public.is_shelter_coordinator(uuid, uuid)              to authenticated;
grant execute on function public.active_volunteer_block(uuid, uuid)              to authenticated;

-- Validação pública (visitante)
grant execute on function public.verify_certificate(text) to anon, authenticated;
