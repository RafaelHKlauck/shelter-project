# Escala de voluntariado

Funcionalidade nova do AdotaPet (RF27–RF41, RN06–RN16, RNF08–RNF17). As regras de negócio ficam
no banco (funções PostgreSQL chamadas por RPC); o Next.js só exibe e chama as funções.

## Onde está cada parte

| Parte | Arquivos |
| --- | --- |
| Tipos, tabelas e índices | `supabase/migrations/0014_volunteer_schedule.sql` |
| Regras (vagas, fila, conflito, prazos, presença, horas, certificado, lembretes) | `supabase/migrations/0015_volunteer_functions.sql` |
| RLS, bucket privado `certificates`, Realtime | `supabase/migrations/0016_volunteer_rls.sql` |
| pg_cron (lembretes a cada 15 min, conclusão de turnos) | `supabase/migrations/0017_volunteer_cron.sql` |
| Massa de testes (Tabelas 11 e 12 da proposta) | `supabase/seed.sql` |
| Agenda do voluntário `/volunteering` | `app/(app)/volunteering/` |
| Aba Escala do painel | `app/(app)/shelter-dashboard/schedule/`, `schedule-actions.ts` |
| Horas e certificado no perfil | `app/(app)/profile/VolunteerHoursSection.tsx`, `CertificateForm.tsx` |
| Geração do PDF | `app/api/certificates/route.ts`, `lib/volunteering/certificate-pdf.tsx` |
| Validação pública `/certificates/[code]` | `app/(app)/certificates/` |
| Sino de notificações (navbar) | `components/layout/NotificationBell.tsx` |
| Fuso de Brasília, rótulos, validações | `lib/volunteering/` |
| Testes de banco (pgTAP) | `supabase/tests/*.sql` |
| Testes unitários e de integração (Vitest) | `tests/unit/`, `tests/integration/` |

### Funções RPC

| Função | Caso de uso | Quem pode |
| --- | --- | --- |
| `create_shift`, `update_shift`, `cancel_shift`, `delete_shift` | UC01, UC02 | admin/editor do abrigo |
| `enroll_in_shift` | UC04, UC05 | voluntário do abrigo |
| `cancel_enrollment` | UC06 (+ UC07) | dono da inscrição |
| `release_enrollment` | RN09 (+ UC07) | admin/editor |
| `mark_attendance` | UC08 | admin/editor |
| `lift_volunteer_block` | UC13 | admin/editor |
| `volunteer_hours_summary` | UC09 | o próprio voluntário |
| `issue_certificate`, `attach_certificate_file` | UC10 | o próprio voluntário |
| `verify_certificate` | UC11 | qualquer pessoa (anon) |
| `shelter_schedule_indicators` | UC14 | admin/editor |
| `send_shift_reminders`, `complete_finished_shifts` | UC12 | só pg_cron |

## Rodar localmente

Pré-requisitos: Docker e Supabase CLI.

```bash
supabase start          # sobe o Supabase local
supabase db reset       # aplica as migrations 0001–0017 e o seed.sql
```

Crie `.env.local` (não é versionado) apontando para o Supabase local:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISH_KEY=<Publishable key exibida pelo `supabase start`>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
pnpm dev
```

Usuários de teste (senha `Adotapet@2026`, definida em `supabase/seed.sql`):
`admin@esperanca.test` (Carla), `admin@refugio.test` (Rafael), `voluntaria@adotapet.test` (Maria),
`jorge@adotapet.test`, `lucas@adotapet.test`, `joao@adotapet.test` (candidatura pendente).

## Testes

```bash
pnpm test:db   # pgTAP — 159 asserções cobrindo os casos de teste CT01–CT14 e CTR
pnpm test      # Vitest — unitários + integração (concorrência, realtime, RLS pela API)
```

Os testes de integração precisam do Supabase local no ar e do seed carregado; sem ele são pulados.

## Publicar no projeto do Supabase (produção)

As migrations ainda **não** foram aplicadas no projeto remoto. Quando for a hora:

```bash
supabase db push        # aplica 0014–0017 no projeto linkado
pnpm db:types           # (com o banco local atualizado) regenera lib/supabase/types.ts
```

`pg_cron` precisa estar habilitado no projeto (Database → Extensions). O `seed.sql` é só para o
ambiente local/de testes.
