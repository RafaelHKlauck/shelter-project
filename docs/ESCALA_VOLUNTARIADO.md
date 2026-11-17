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

Usuários de teste (senha `adota123`, definida em `supabase/seed.sql`):
`admin@esperanca.test` (Carla), `admin@refugio.test` (Rafael), `voluntaria@adotapet.test` (Maria),
`jorge@adotapet.test`, `lucas@adotapet.test`, `joao@adotapet.test` (candidatura pendente).

## Testes

```bash
pnpm test:db          # pgTAP — reseta o banco local e roda 159 asserções (CT01–CT14, CTR)
pnpm test             # Vitest — unitários + integração (concorrência, realtime, RLS pela API)
pnpm test:e2e         # Playwright — 28 casos de ponta a ponta no app local (build + banco resetado)
pnpm e2e:report       # abre o relatório HTML do Playwright (playwright-report/index.html)
pnpm test:e2e:prod    # os mesmos casos contra https://shelter-project-seven.vercel.app
```

- Os testes de integração e E2E precisam do Supabase local no ar (`supabase start`).
- O E2E reseta o banco local antes de rodar (`E2E_SKIP_RESET=1` desliga isso).
- Contra produção, os turnos criados pelos testes são cancelados ao final, e o caso CTR_01
  (que aprovaria de forma permanente a candidatura do João) é pulado. O helper respeita o limite de
  logins do Supabase Auth (30 a cada 5 minutos), então a execução em produção pode pausar.
- No local, `supabase/config.toml` amplia esse limite (`sign_in_sign_ups = 300`) para a suíte rodar
  sem pausas.

## Ambiente publicado (produção)

As migrations 0014–0017 já estão aplicadas no projeto do Supabase. A massa de testes da escala
foi carregada com `supabase/seed_prod_escala.sql`, que complementa os usuários de demonstração do
Grau B. **Senha de todos: `adota123`.**

| Usuário | E-mail | Situação na escala |
| --- | --- | --- |
| Carla Ferreira | admin@esperanca.test | Administradora do Abrigo Esperança (coordenadora) |
| Rafael Lima | admin@refugio.test | Administrador do Refúgio Animal (coordenador) |
| Maria Silva | voluntaria@adotapet.test | Voluntária no Refúgio Animal e no Abrigo Esperança |
| Jorge Menezes | jorge@adotapet.test | Voluntário no Abrigo Esperança |
| Lucas Pereira | lucas@adotapet.test | Voluntário no Abrigo Esperança (disputa por vaga e fila) |
| João Santos | joao@adotapet.test | Candidatura de voluntariado pendente no Abrigo Esperança |

Turnos (Tabela 12), no sábado seguinte à execução do script:

| Turno | Título | Abrigo | Horário | Vagas |
| --- | --- | --- | --- | --- |
| T1 | Passeio com os cães | Abrigo Esperança | 9h às 12h | 3 |
| T2 | Limpeza dos canis | Abrigo Esperança | 13h às 16h | 1 |
| T3 | Feira de adoção | Refúgio Animal | 10h às 14h | 5 |
| T4 | Banho e escovação | Abrigo Esperança | 12h às 13h | 2 |

Para recriar os turnos em outra semana (ou conferir o estado):

```bash
supabase db query --linked -f supabase/seed_prod_escala.sql
supabase db query --linked -o table -f supabase/seed_prod_escala_check.sql
```

O script não duplica usuários, vínculos nem turnos. O `seed.sql` (senha `adota123`) é só para
o banco local e não deve ser rodado em produção.
