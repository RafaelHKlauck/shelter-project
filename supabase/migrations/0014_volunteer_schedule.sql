-- Escala de voluntariado — tipos, tabelas e índices (RF27–RF41, RN06–RN16)
-- Todas as datas são timestamptz (UTC no banco) e exibidas em America/Sao_Paulo (RNF13).

-- ============ Enums (Tabela 8) ============
create type shift_task        as enum ('walk', 'cleaning', 'care', 'event', 'other');
create type shift_status      as enum ('scheduled', 'cancelled', 'completed');
create type enrollment_status as enum ('confirmed', 'waitlisted', 'cancelled', 'attended', 'absent', 'excused');

-- ============ volunteer_shifts ============
create table public.volunteer_shifts (
  id                  uuid primary key default gen_random_uuid(),
  shelter_id          uuid not null references public.shelters(id) on delete cascade,
  title               text not null check (length(btrim(title)) between 2 and 120),
  task_type           shift_task not null default 'other',
  description         text check (description is null or length(description) <= 2000),
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  capacity            int not null check (capacity between 1 and 20),           -- RN13
  status              shift_status not null default 'scheduled',
  recurrence_group_id uuid,
  -- contadores mantidos pelas funções: permitem que o Realtime avise todas as
  -- agendas abertas sem expor as inscrições de outras pessoas (RNF09/RNF14)
  confirmed_count     int not null default 0 check (confirmed_count >= 0),
  waitlist_count      int not null default 0 check (waitlist_count between 0 and 5),
  created_by          uuid references auth.users(id),
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint volunteer_shifts_ends_after_start check (ends_at > starts_at),
  constraint volunteer_shifts_confirmed_le_capacity check (confirmed_count <= capacity) -- RN08
);

create index volunteer_shifts_shelter_starts_idx on public.volunteer_shifts(shelter_id, starts_at);
create index volunteer_shifts_starts_idx         on public.volunteer_shifts(starts_at) where status = 'scheduled';
create index volunteer_shifts_recurrence_idx     on public.volunteer_shifts(recurrence_group_id) where recurrence_group_id is not null;
create index volunteer_shifts_created_by_idx     on public.volunteer_shifts(created_by);

create trigger volunteer_shifts_set_updated_at before update on public.volunteer_shifts
  for each row execute function public.set_updated_at();

-- ============ shift_enrollments ============
-- Guarda a inscrição e também o resultado da presença.
create table public.shift_enrollments (
  id                   uuid primary key default gen_random_uuid(),
  shift_id             uuid not null references public.volunteer_shifts(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  status               enrollment_status not null,
  waitlist_position    int check (waitlist_position between 1 and 5),
  enrolled_at          timestamptz not null default clock_timestamp(),
  cancelled_at         timestamptz,
  cancelled_by         uuid references auth.users(id),
  checked_in_at        timestamptz,
  checked_out_at       timestamptz,
  worked_minutes       int not null default 0 check (worked_minutes >= 0),
  attendance_marked_by uuid references auth.users(id),
  attendance_marked_at timestamptz,
  reminder_sent_at     timestamptz,
  created_at           timestamptz not null default now(),
  constraint shift_enrollments_waitlist_pos check (
    (status = 'waitlisted' and waitlist_position is not null)
    or (status <> 'waitlisted' and waitlist_position is null)
  ),
  constraint shift_enrollments_checkout_after_checkin check (
    checked_in_at is null or checked_out_at is null or checked_out_at > checked_in_at
  )
);

-- RN07/A4: no máximo uma inscrição ativa por pessoa e turno
create unique index shift_enrollments_one_active
  on public.shift_enrollments(shift_id, user_id)
  where status in ('confirmed', 'waitlisted');
create index shift_enrollments_user_idx    on public.shift_enrollments(user_id, status);
create index shift_enrollments_shift_idx   on public.shift_enrollments(shift_id, status);
create index shift_enrollments_reminder_idx on public.shift_enrollments(shift_id)
  where status = 'confirmed' and reminder_sent_at is null;
create index shift_enrollments_marked_by_idx    on public.shift_enrollments(attendance_marked_by);
create index shift_enrollments_cancelled_by_idx on public.shift_enrollments(cancelled_by);

-- ============ shift_attendance_log (RNF15) ============
-- Toda marcação/correção de presença fica registrada com quem fez e quando.
create table public.shift_attendance_log (
  id                 uuid primary key default gen_random_uuid(),
  enrollment_id      uuid not null references public.shift_enrollments(id) on delete cascade,
  previous_status    enrollment_status,
  new_status         enrollment_status not null,
  checked_in_at      timestamptz,
  checked_out_at     timestamptz,
  worked_minutes     int not null,
  marked_by          uuid not null references auth.users(id),
  marked_at          timestamptz not null default clock_timestamp()
);
create index shift_attendance_log_enrollment_idx on public.shift_attendance_log(enrollment_id);
create index shift_attendance_log_marked_by_idx  on public.shift_attendance_log(marked_by);

-- ============ volunteer_blocks (RN11) ============
create table public.volunteer_blocks (
  id            uuid primary key default gen_random_uuid(),
  shelter_id    uuid not null references public.shelters(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reason        text not null,
  blocked_until timestamptz not null,
  lifted_by     uuid references auth.users(id),
  lifted_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index volunteer_blocks_shelter_user_idx on public.volunteer_blocks(shelter_id, user_id, created_at desc);
create index volunteer_blocks_user_idx         on public.volunteer_blocks(user_id);
create index volunteer_blocks_lifted_by_idx    on public.volunteer_blocks(lifted_by);

-- ============ volunteer_certificates (RN16) ============
create table public.volunteer_certificates (
  id            uuid primary key default gen_random_uuid(),
  code          char(10) not null unique check (code ~ '^[A-Z0-9]{10}$'),
  user_id       uuid not null references auth.users(id) on delete cascade,
  shelter_id    uuid not null references public.shelters(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  total_minutes int not null check (total_minutes > 0),
  shifts_count  int not null check (shifts_count > 0),
  -- dados congelados no momento da emissão (o certificado não muda se o perfil mudar)
  volunteer_name text not null,
  cpf_masked     text,
  shelter_name   text not null,
  file_path     text,
  issued_at     timestamptz not null default now(),
  constraint volunteer_certificates_period check (period_end >= period_start)
);
create index volunteer_certificates_user_idx    on public.volunteer_certificates(user_id, issued_at desc);
create index volunteer_certificates_shelter_idx on public.volunteer_certificates(shelter_id);
