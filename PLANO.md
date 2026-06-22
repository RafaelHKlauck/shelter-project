# Plano de Implementação — AdotaPet

> Especificação base: `Entregas GA/Requisitos.pdf` (v1.0 — 19/04/2026)
> Design de referência: Figma Make `https://www.figma.com/make/MpA6670zQHUsdP7rlmt2fN/adota` (lido via MCP, código React+Tailwind do design inspecionado em 21/06/2026)
> Nome final do produto: **AdotaPet** (definido pelo design)
> Objetivo: traduzir RF01–RF26, RNF01–RNF07 e RN01–RN05 em um projeto executável sobre a stack já iniciada (Next.js 16 + Supabase + shadcn/ui + Tailwind 4), preservando ao máximo a fidelidade visual ao Figma Make.

---

## 0. Estado atual do repositório

| Item | Situação |
|---|---|
| `next` 16.2.9 + React 19.2 | ✅ instalado |
| `@supabase/ssr` + `@supabase/supabase-js` | ✅ instalado |
| `shadcn` (style `radix-nova`, baseColor `neutral`) | ✅ inicializado, só `button.tsx` instalado |
| Tailwind 4 + `tw-animate-css` | ✅ |
| Supabase CLI linkada ao projeto `umbjttjijqsxcwggshoh` (org `yufcluulhjnfpqyvqbiw`, nome `abrigo`) | ✅ |
| `.env` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISH_KEY` | ✅ (faltam `SUPABASE_SERVICE_ROLE_KEY` para jobs server-only se necessário) |
| `app/page.tsx` é só a tela default do create-next-app | ⏳ a substituir |
| React Hook Form, TanStack Query, Zod | ❌ a instalar (RNF05 exige RHF e TanStack Query) |
| `supabase/migrations` ou `supabase/seed.sql` | ❌ pasta `supabase/` só tem `.temp/` da CLI |

### Quebras de Next 16 a considerar desde o dia 1

- `cookies()`, `headers()`, `params`, `searchParams` são **assíncronos**. Todo helper de Supabase server-side precisa `await cookies()`.
- `middleware.ts` foi renomeado para **`proxy.ts`** (runtime fixo em `nodejs`, sem `edge`). É lá que mora a renovação de sessão do Supabase.
- Imagens remotas só funcionam via `images.remotePatterns` (necessário para o bucket do Supabase Storage).
- Turbopack é default — não precisamos de `--turbopack` no `dev/build`.
- Validar `localPatterns.search` se usarmos `?v=` em imagens locais.

---

## 1. Premissas e questões em aberto

1. **Figma Make (resolvido em 21/06/2026)**: o código React+Tailwind do design foi lido via MCP. O design **não cobre** as telas de autenticação, onboarding, criação de abrigo nem variações para múltiplos abrigos por membro — essas telas serão construídas seguindo o mesmo padrão visual (cards brancos, `blue-600` primário, `gray-50` para muted bg).
2. **Geolocalização** (RF12, RF14, RNF03): usar **PostGIS** habilitado no Postgres do Supabase (`create extension postgis`) e armazenar endereço como `geography(Point,4326)`. Geocoding inicial via **Nominatim/OpenStreetMap** (gratuito) com cache; trocável por Google Maps depois. O design mostra a localização do abrigo como **string** (`"Av. Ipiranga, 1500 - Porto Alegre, RS"`) e distância como **número em km** — vamos guardar ambos (texto humanizado para exibição + `geography` para cálculo).
3. **CPF** (RF04, RF22, RN05): armazenado *hashed* em coluna pública e em **claro** em coluna restrita por RLS apenas para `shelter_member` que recebeu solicitação. Validação de CPF no client + server (algoritmo padrão BR). O Figma exibe CPF formatado (`123.456.789-00`) nos cards de solicitação — coerente com RN05.
4. **Realtime**: Supabase Realtime via `postgres_changes` para `messages` e `requests`. Notificações in-app armazenadas em `notifications`; push/e-mail fora de escopo MVP. A lista de conversas exibe contador `unread` — precisamos rastrear `last_read_at` por participante.
5. **Storage**: dois buckets — `avatars` (público read, write authenticated) e `media` (animais/abrigos: público read, write restrito a membros). O Figma usa imagens do Unsplash; o substituiremos por uploads próprios.
6. **Multi-papel num abrigo**: uma pessoa pode ser membro de `N` abrigos com papéis distintos por abrigo (`admin`, `editor`, `volunteer`). Reflete RF06/RF07/RF08/RF09. O design só desenhou o painel para **um** abrigo — adicionaremos um *shelter switcher* discreto no topo do dashboard se o usuário pertencer a >1.
7. **Suprimentos**: o design trata a lista de suprimentos como `string[]` (chips). Vamos modelar `supply_needs` como tabela (uma linha por item) para suportar contagem por item e finalização individual (RF26); o modal de doação cria **uma `request` por item marcado**.

---

## 2. Stack final e setup pendente

```bash
pnpm add react-hook-form @hookform/resolvers zod @tanstack/react-query @tanstack/react-query-devtools \
  date-fns sonner cmdk

pnpm add -D @types/node
```

Componentes shadcn a instalar (todos via `pnpm dlx shadcn@latest add ...`):

```
button card input label textarea form select badge avatar dialog drawer
sheet dropdown-menu separator tabs toast sonner skeleton checkbox
radio-group switch slider popover command tooltip alert alert-dialog
breadcrumb scroll-area table pagination calendar progress
```

Ajustes em `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'umbjttjijqsxcwggshoh.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'images.unsplash.com' }, // seed/demo
    ],
  },
}
```

Helpers `lib/supabase/`:
- `server.ts` — `createClient()` com `await cookies()`.
- `client.ts` — `createBrowserClient` para client components.
- `admin.ts` — service role só usado em Server Actions sensíveis (ex.: jobs de notificação).

`proxy.ts` na raiz: refresh de sessão via `@supabase/ssr` (substituto do antigo `middleware.ts`).

`app/providers.tsx`: `QueryClientProvider`, `<Toaster />` (sonner), `ThemeProvider` (opcional).

### 2.1 Tokens de design extraídos do Figma Make

O Figma define `--primary: #030213` (quase preto) em `theme.css`, mas as **telas usam o palette do Tailwind direto** — não as variáveis. Vamos seguir as telas (mais consistente com `lucide-react` e os componentes shadcn que o design já lista). Paleta efetiva:

| Token | Cor Tailwind | Uso no design |
|---|---|---|
| Brand / ação primária | `blue-600` (hover `blue-700`) | logo, botões primários, links ativos, abas ativas, badge porte (bg-50) |
| Voluntariado | `green-600` (hover `green-700`, bg `green-50`/`green-100`) | botão "Candidatar-se como Voluntário", badge "Voluntário", "Castrado", "Aprovação" |
| Doação de suprimentos | `orange-500/600` (hover `orange-700`, bg `orange-50/100`) | botão "Doar Suprimentos", chips de suprimento, badge "Precisa de doações" |
| Adoção / coração | `pink-100/600` ícone Heart na grade da home | feature card "Faça a Diferença" |
| Erro / rejeitar | `red-50/200/700` (e `destructive` para destruidor) | botão "Rejeitar" |
| Background app | `gray-50` | `<main>` |
| Cards | `bg-white` com `border-gray-200` e `rounded-xl` | praticamente todas as superfícies |
| Texto base | `gray-900` (títulos), `gray-600` (corpo), `gray-500` (meta), `gray-400` (placeholder) | — |
| Radius | `rounded-lg` (componentes), `rounded-xl` (cards), `rounded-full` (avatares, badges) | `--radius: 0.625rem` |
| Font | sistema default + size base `16px`, headings semi-bold | sem fonte custom |

Decisão: **substituir o atual `app/globals.css`** pelos tokens do design (copiar o `theme.css` do Figma + `--radius: 0.625rem`) e remover dependência do style `radix-nova` do shadcn (manter os componentes shadcn, mas os utilitários do design são Tailwind direto). Manter o `components.json` aceita componentes shadcn novos sem fricção.

Ícones: o design usa **`lucide-react`** (já instalado): `PawPrint`, `Heart`, `MapPin`, `Phone`, `Users`, `Truck`, `CheckCircle`, `XCircle`, `Clock`, `MessageSquare`, `LayoutDashboard`, `Home`, `Building2`, `User`, `Send`, `Search`, `SlidersHorizontal`, `Calendar`, `Award`, `Info`, `AlertCircle`, `Check`.

---

## 3. Modelo de dados (Supabase / Postgres)

> Convenção: `snake_case`, PK `id uuid default gen_random_uuid()`, timestamps `created_at`, `updated_at` (`trigger set_updated_at`). Soft delete só onde houver histórico legal (sem MVP). Todas as tabelas com RLS habilitado.

### 3.1 Diagrama lógico (resumo)

```
auth.users ── 1:1 ── profiles (pessoa física)
                       │
                       ├─ N:M ── shelter_members ── N:1 ── shelters
                       │                                    │
                       │                                    ├─ 1:N animals
                       │                                    └─ 1:N supply_needs
                       │
                       └─ 1:N requests (adoption | volunteer | supply)
                              │
                              ├─ 1:1 conversations
                              │         └─ 1:N messages
                              └─ 1:N notifications (alvo: shelter ou user)
```

### 3.2 ENUMs

```sql
create type user_role        as enum ('user', 'shelter_team'); -- compat. RF05
create type shelter_role     as enum ('admin', 'editor', 'volunteer');
create type animal_size      as enum ('small', 'medium', 'large');
create type animal_species   as enum ('dog', 'cat', 'other');
create type housing_type     as enum ('house', 'apartment');
create type request_kind     as enum ('adoption', 'volunteer', 'supply');
create type request_status   as enum ('pending', 'accepted', 'rejected', 'finalized', 'cancelled');
create type animal_status    as enum ('available', 'reserved', 'adopted', 'unavailable');
create type supply_status    as enum ('open', 'in_progress', 'fulfilled', 'cancelled');
```

### 3.3 Tabelas

**`profiles`** — pessoa física (RF04). 1:1 com `auth.users`.
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null,
  cpf_hash         text not null,           -- hash p/ unicidade pública
  cpf_encrypted    text,                    -- pgcrypto, visível a abrigo via RLS
  birth_date       date not null,
  housing_type     housing_type not null,
  address_line     text not null,
  address_number   text,
  address_city     text not null,
  address_state    char(2) not null,
  address_zip      text not null,
  location         geography(Point, 4326),  -- geocoded
  avatar_url       text,
  role             user_role not null default 'user',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index profiles_cpf_hash_uniq on profiles(cpf_hash);
create index profiles_location_gix on profiles using gist(location);
```

**`shelters`** — abrigo (RF01).
```sql
create table shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,                -- p/ URL /shelters/[slug]
  description text,
  phone text not null,
  email text,
  address_line text not null,
  address_city text not null,
  address_state char(2) not null,
  address_zip text not null,
  location geography(Point, 4326) not null,
  needs_supplies boolean not null default false,
  cover_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shelters_location_gix on shelters using gist(location);
```

**`shelter_media`** — galeria de imagens (RF01).
```sql
create table shelter_media (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references shelters(id) on delete cascade,
  url text not null,
  position int not null default 0
);
```

**`shelter_members`** — vínculo pessoa↔abrigo com papel (RF06–RF09).
```sql
create table shelter_members (
  shelter_id uuid not null references shelters(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       shelter_role not null,
  promoted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (shelter_id, user_id)
);
```

**`animals`** — animal (RF02, RF03, RN01).
```sql
create table animals (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references shelters(id) on delete cascade,
  name text,                                -- opcional (RF02)
  species animal_species not null,
  breed text,                               -- null => "sem raça definida"
  size animal_size not null,
  estimated_age_months int not null check (estimated_age_months >= 0),
  neutered boolean not null default false,
  temperament text[],                       -- ['friendly','calm',...]
  health_notes text,
  status animal_status not null default 'available',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animals_shelter_idx on animals(shelter_id);
create index animals_status_idx on animals(status);
```

**`animal_media`** — imagens (RF02).
```sql
create table animal_media (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  url text not null,
  position int not null default 0
);
```

**`supply_needs`** — necessidade de suprimento (RF11).
```sql
create table supply_needs (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references shelters(id) on delete cascade,
  title text not null,                      -- "Ração filhote 10kg"
  description text,
  quantity_target int,
  quantity_fulfilled int not null default 0,
  unit text,                                -- 'kg', 'un', 'L'
  status supply_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index supply_needs_shelter_idx on supply_needs(shelter_id);
```

**`requests`** — solicitação unificada (RF15–RF20, RF24).
```sql
create table requests (
  id uuid primary key default gen_random_uuid(),
  kind request_kind not null,
  status request_status not null default 'pending',
  shelter_id uuid not null references shelters(id),
  requester_id uuid not null references auth.users(id),
  animal_id uuid references animals(id),            -- só p/ adoption
  supply_need_id uuid references supply_needs(id),  -- só p/ supply
  message text,                                     -- texto livre da candidatura
  quantity_offered int,                             -- p/ supply
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_kind_targets check (
    (kind = 'adoption' and animal_id is not null and supply_need_id is null) or
    (kind = 'supply'   and supply_need_id is not null and animal_id is null) or
    (kind = 'volunteer' and animal_id is null and supply_need_id is null)
  )
);
create index requests_shelter_status_idx on requests(shelter_id, status);
create index requests_requester_idx on requests(requester_id);
-- Garante apenas 1 adoção aceita ativa por animal (RNF04)
create unique index requests_one_active_adoption
  on requests(animal_id) where status in ('accepted','finalized') and kind = 'adoption';
```

**`conversations`** — chat após aceite (RF20).
```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  shelter_id uuid not null references shelters(id),
  requester_id uuid not null references auth.users(id),
  closed_at timestamptz,
  last_message_at timestamptz,                                -- p/ ordenar a lista
  last_message_preview text,                                  -- p/ a sidebar de Mensagens
  requester_last_read_at timestamptz,                         -- contador "unread" do usuário
  shelter_last_read_at  timestamptz,                          -- contador "unread" do abrigo
  created_at timestamptz not null default now()
);
```

Trigger `messages_after_insert` atualiza `last_message_at` e `last_message_preview` na `conversation` correspondente (mantém o sidebar do Figma em sincronia sem joins caros).

**`messages`** — mensagens (RNF06).
```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages(conversation_id, created_at);
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table requests;
```

**`notifications`** — caixa única (RF18).
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),         -- destinatário pessoa, OU
  shelter_id uuid references shelters(id),        -- destinatário abrigo (entrega para todos os members)
  kind text not null,                             -- 'request.created', 'request.accepted', ...
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or shelter_id is not null)
);
```

### 3.4 Triggers e funções

- `set_updated_at()` aplicada a todas tabelas com `updated_at`.
- `requests_after_insert`: cria `notification` para o `shelter` (RF18).
- `requests_after_update_accepted`: se `status` foi para `accepted` em `adoption|supply`, cria a `conversation` (RF20) e notifica o `requester`.
- `requests_after_update_finalized` (adoção): seta `animals.status = 'adopted'` (RF25). Para `supply`: incrementa `supply_needs.quantity_fulfilled`; se atingir alvo, marca `fulfilled` (RF26).
- `prevent_double_acceptance` antes do `update`: impede aceitar `adoption` se o animal já tem requisição aceita ativa (reforça o índice único, com mensagem amigável; RNF04).
- `enforce_volunteer_promotion`: promoção de `volunteer→editor` (RF07/RN04) só permitida se o `auth.uid()` for `admin` daquele abrigo.

### 3.5 Views materializadas / views úteis

- `v_animals_public`: animais com `status='available'`, com `shelter_id`, `location`, etc., usada em listagens. Filtra automaticamente RF25.
- `v_supply_needs_open`: análoga, garante RF26.
- `f_distance_km(geography, geography) returns numeric`: helper para RF12/RF14.

---

## 4. Row Level Security (RNF02, RN05)

> Habilitar RLS em todas as tabelas. Políticas resumidas:

| Tabela | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | dono OU `shelter_member` cujo abrigo recebeu requisição do dono | dono (no signup) | dono | — |
| `profiles.cpf_encrypted` | *via função* `get_profile_for_shelter()` — só acessível a `shelter_member` com requisição do `profile_id` (RN05) | — | — | — |
| `shelters` | público | qualquer usuário autenticado (vira `admin`) | `admin\|editor` do abrigo | `admin` |
| `shelter_members` | membros do abrigo + público (só `role`, `user_id`) | `admin` | `admin` (com `enforce_volunteer_promotion`) | `admin` |
| `animals`, `animal_media`, `shelter_media`, `supply_needs` | público | `admin\|editor` | `admin\|editor` | `admin\|editor` |
| `requests` | `requester` + members do `shelter_id` | `requester == auth.uid()` e role 'user' | members do shelter (status), ou requester (cancel) | — |
| `conversations` | `requester` + members do shelter | criada via trigger | members podem fechar | — |
| `messages` | participantes da conversa | `sender == auth.uid()` e participante | — | — |
| `notifications` | destinatário (user ou members do shelter) | server-only (trigger/service role) | destinatário (marcar lido) | — |

Função auxiliar:
```sql
create or replace function is_member(p_shelter uuid, p_user uuid, p_roles shelter_role[])
returns boolean language sql stable as $$
  select exists (
    select 1 from shelter_members
    where shelter_id = p_shelter and user_id = p_user and role = any(p_roles)
  );
$$;
```

---

## 5. Storage (RNF07)

Buckets:
- `avatars/` — read público, write `authenticated` no path `{uid}/...`.
- `shelter-media/` — read público, write apenas para `is_member(shelter_id, auth.uid(), ARRAY['admin','editor'])` no path `{shelter_id}/...`.
- `animal-media/` — idem, path `{shelter_id}/{animal_id}/...`.

Limites: max 5 MB por imagem; aceitar `image/jpeg|png|webp`. Pré-processar com `next/image` no consumo.

---

## 6. Autenticação e autorização (RNF02)

- Supabase Auth com **e-mail + senha** (MVP). Confirmação por e-mail ON.
- Cadastro em duas etapas:
  1. `signUp` → cria `auth.users`.
  2. Onboarding `/onboarding/profile` ou `/onboarding/shelter` para preencher `profiles` ou criar `shelters` + `shelter_members(admin)`.
- `app/(public)/login`, `app/(public)/signup`, `app/(public)/forgot-password`, `/reset-password`.
- `proxy.ts` chama `supabase.auth.getUser()` para revalidar sessão.
- Server Actions sensíveis usam `getUser()` (não `getSession()` — não confiável para autorização).
- `lib/auth/roles.ts`: helpers `requireUser()`, `requireShelterRole(shelterId, roles[])` que rodam em server-only.

---

## 7. Estrutura de pastas (App Router, Next 16) — alinhada ao Figma

Mantemos as rotas que o design já assume e adicionamos as telas de auth/onboarding como `(auth)`. A *navbar/footer do Figma* vive no `(app)/layout.tsx`; `(auth)` tem layout próprio mais limpo.

```
app/
  layout.tsx                       # html + providers (sem header — cada grupo decide)
  providers.tsx                    # QueryClient + Toaster
  globals.css                      # tokens do design (substitui o do create-next-app)
  (auth)/                          # NÃO ESTAVA NO FIGMA — telas próprias
    layout.tsx                     # logo centrado, card branco no centro
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    onboarding/
      profile/page.tsx             # cria/edita profiles (RF04)
      shelter/page.tsx             # cria primeiro shelter (RF01) + vincula como admin
  (app)/                           # exige sessão; espelha o design
    layout.tsx                     # Header(AdotaPet) + Outlet + Footer (idem Figma)
    page.tsx                       # Home (hero + 4 features + "Como funciona") — vai em "/"
    animals/
      page.tsx                     # Listagem com search/type/size/distance (RF10, RF12, RF13)
      [id]/page.tsx                # Detalhe + modal "Candidatar-se à Adoção" (RF02, RF15)
    shelters/
      page.tsx                     # Listagem com search + distance (RF14)
      [id]/page.tsx                # Hero + info + suprimentos + animais + modais
                                   #   "Voluntariar" e "Doar Suprimentos" (RF01,RF10,RF11,RF16,RF17)
    messages/
      page.tsx                     # Lista de conversas + chat split (RF20, RNF06)
    profile/
      page.tsx                     # Cabeçalho + badge voluntário + adotados + voluntariado (RF04, RF09, RF21)
      edit/page.tsx                # Editar dados pessoais (RF04)
    shelter-dashboard/
      page.tsx                     # Tabs: Solicitações | Animais | Informações
                                   #   (RF05, RF18, RF19, RF22, RF23, RF24, RF06)
                                   # com shelter switcher se membro de >1
      animals/new/page.tsx         # Form de cadastro de animal (RF02, RF10)
      animals/[id]/edit/page.tsx   # Edição
      team/page.tsx                # NÃO ESTAVA NO FIGMA — promover voluntário a editor (RF07, RN04)
  api/
    geocode/route.ts               # proxy p/ Nominatim com cache
components/
  ui/...                           # shadcn
  layout/{Header,Footer}.tsx       # cópia 1:1 do design (6 itens + logo)
  animals/{AnimalCard,AnimalFilters,AnimalForm,AnimalGallery}.tsx
  shelters/{ShelterCard,ShelterHero,ShelterSuppliesList,VolunteerModal,SuppliesDonationModal}.tsx
  requests/{RequestCard,RequestActions,RequesterHistoryModal}.tsx
  messages/{ConversationList,ConversationView,MessageBubble,MessageComposer}.tsx
  profile/{AdoptedAnimalRow,VolunteerShelterRow,VolunteerBadge}.tsx
  forms/{AddressFields,CPFField,ImageDropzone,DistanceSlider}.tsx
  dashboard/{KpiCard,ShelterSwitcher,DashboardTabs}.tsx
features/
  animals/{queries.ts,mutations.ts,schemas.ts}
  shelters/{queries.ts,mutations.ts,schemas.ts}
  requests/{queries.ts,mutations.ts,schemas.ts}
  conversations/{queries.ts,mutations.ts,realtime.ts}
  notifications/{queries.ts,realtime.ts}
lib/
  supabase/{server.ts,client.ts,admin.ts,types.ts}
  auth/roles.ts
  geo/{geocode.ts,distance.ts}
  validation/{cpf.ts,zip.ts,phone.ts}
proxy.ts
supabase/
  migrations/0001_init.sql
  migrations/0002_indexes.sql
  migrations/0003_functions.sql
  migrations/0004_triggers.sql
  migrations/0005_rls.sql
  migrations/0006_storage.sql
  migrations/0007_realtime.sql
  seed.sql
```

> **Rotas do Figma preservadas exatamente:** `/`, `/animals`, `/animals/:id`, `/shelters`, `/shelters/:id`, `/profile`, `/shelter-dashboard`, `/messages`. Os `:id` saem como `[id]` no App Router. Adicionamos apenas o que o design não cobriu (auth, onboarding, criação/edição de animais, team).

---

## 8. Roteamento e correspondência com requisitos

| Tela | Rota (alinhada ao Figma) | RFs |
|---|---|---|
| Home (hero + 4 features + "Como funciona") | `/` | landing |
| Login / Signup / Reset | `/login`, `/signup`, `/forgot-password`, `/reset-password` | RNF02 |
| Onboarding pessoa | `/onboarding/profile` (1ª visita) | RF04 |
| Onboarding abrigo | `/onboarding/shelter` | RF01 |
| Listagem de animais + filtros | `/animals` | RF10, RF12, RF13 |
| Detalhe do animal + candidatura | `/animals/[id]` | RF02, RF15, RF18 |
| Listagem de abrigos + distância | `/shelters` | RF14 |
| Página do abrigo + voluntariado + suprimentos | `/shelters/[id]` | RF01, RF10, RF11, RF16, RF17 |
| Mensagens (split: lista + chat) | `/messages` | RF20, RNF06 |
| Perfil + badge + adoções + voluntariado | `/profile` | RF04, RF09, RF21 |
| Editar dados pessoais | `/profile/edit` | RF04 |
| Painel do abrigo (Solicitações/Animais/Informações) | `/shelter-dashboard` | RF05, RF06, RF18, RF19, RF22, RF23, RF24 |
| Cadastrar/editar animal | `/shelter-dashboard/animals/new`, `/shelter-dashboard/animals/[id]/edit` | RF02, RF10 |
| Gerenciar membros (promover voluntário a editor) | `/shelter-dashboard/team` | RF07, RF08, RN04 |
| Badge "Voluntário" | `components/profile/VolunteerBadge` no perfil | RF09 |

### 8.1 Mapeamento Figma → Next (1:1 com os arquivos lidos via MCP)

| Arquivo Figma Make | Destino no projeto |
|---|---|
| `src/app/App.tsx` (`<RouterProvider>`) | substituído pelo `app/(app)/layout.tsx` (App Router) |
| `src/app/routes.tsx` (createBrowserRouter) | substituído pela estrutura de pastas `app/` (mesmos paths) |
| `src/app/components/Layout.tsx` (header sticky + nav + footer) | `components/layout/Header.tsx` + `components/layout/Footer.tsx`, consumidos em `app/(app)/layout.tsx`. Renderização idêntica (logo `PawPrint` + "AdotaPet" em `text-blue-600` / itens com ícones e estado ativo em `bg-blue-50 text-blue-600`) |
| `src/app/pages/Home.tsx` | `app/(app)/page.tsx` — preservar copy ("Encontre seu novo melhor amigo", "Conectamos pessoas e animais que precisam de um lar") e os 4 feature cards (PawPrint/Users/Truck/Heart) e a seção "Como funciona" |
| `src/app/pages/Animals.tsx` | `app/(app)/animals/page.tsx` — busca + filtros (type/size/distance) + grid responsivo de `AnimalCard`. Estado client em `'use client'` |
| `src/app/components/AnimalCard.tsx` | `components/animals/AnimalCard.tsx` — preservar layout (aspect-square, `group-hover:scale-105`, botão `Heart` flutuante, chips `Porte`/`Castrado`) |
| `src/app/pages/AnimalDetail.tsx` | `app/(app)/animals/[id]/page.tsx` (server) + `AdoptionRequestDialog` client. Manter grid 2 colunas e os 4 cards de meta (Idade/Porte/Castrado/Doenças) + bloco "Temperamento" em `bg-blue-50` |
| `src/app/pages/Shelters.tsx` | `app/(app)/shelters/page.tsx` |
| `src/app/components/ShelterCard.tsx` | `components/shelters/ShelterCard.tsx` — badge `Precisa de doações` em `bg-orange-500` |
| `src/app/pages/ShelterDetail.tsx` | `app/(app)/shelters/[id]/page.tsx` + 2 dialogs (`VolunteerModal`, `SuppliesDonationModal`). Hero aspect 21/9, bloco em `bg-orange-50` para suprimentos, grid de animais |
| `src/app/pages/Profile.tsx` | `app/(app)/profile/page.tsx` — cabeçalho com avatar 24×24, badge "Voluntário" em `bg-green-50`, sessão "Animais Adotados", sessão "Voluntariado" |
| `src/app/pages/ShelterDashboard.tsx` | `app/(app)/shelter-dashboard/page.tsx` — 3 KPI cards (PawPrint/Clock/CheckCircle), tabs Solicitações/Animais/Informações. Requisições pendentes mostram dados RF22 + botões Rejeitar/Aprovar; Aprovações ativas mostram "Conversar"/"Finalizar" |
| `src/app/pages/Messages.tsx` | `app/(app)/messages/page.tsx` — split 320px + chat. Substituir mocks por Supabase Realtime. Bubble user à direita (`bg-blue-600 text-white`), shelter à esquerda (`bg-white border`) |
| `src/app/data/mockData.ts` | usar como referência para o **seed** (`supabase/seed.sql`) |
| `src/styles/theme.css` | base do novo `app/globals.css` (substitui o atual) |
| `src/app/components/ui/*` (49 componentes shadcn) | instalar sob demanda via `pnpm dlx shadcn@latest add ...`; a versão atual do projeto (`radix-nova`) é compatível; a UI do Figma usa Tailwind direto, então a maior parte das telas não precisa dos componentes shadcn (manter para forms/dialogs/tabs) |

### 8.2 Telas faltantes no Figma — como vamos desenhar mantendo o padrão

- **`/login` e `/signup`**: `(auth)/layout.tsx` com fundo `bg-gray-50`, card branco `rounded-xl border border-gray-200 p-8` centralizado (max-w-md), logo `PawPrint`+"AdotaPet" no topo, inputs no padrão `Animals.tsx` (border + focus ring `blue-500`), botão primário `bg-blue-600`.
- **`/onboarding/profile`**: mesmo card branco, campos para nome, CPF (formatado), data de nascimento, endereço (com auto-complete via ViaCEP), tipo de moradia (radio Casa/Apartamento), upload de avatar.
- **`/onboarding/shelter`**: nome, telefone, endereço, descrição, switch `Precisa de suprimentos`, upload de imagem de capa.
- **`/shelter-dashboard/animals/new`**: form embutido na própria tab "Animais" (botão "Adicionar Animal" abre `Dialog` ou navega) — preferimos rota dedicada para suportar upload pesado.
- **`/shelter-dashboard/team`**: tabela simples com avatar + nome + role + ação "Promover a editor" (RN04). Visível apenas para `admin`.

---

## 9. Forms e validação

- **React Hook Form + Zod** (`@hookform/resolvers/zod`).
- Schemas em `features/*/schemas.ts`. Reaproveitar nos Server Actions (`schema.parse(input)`).
- Validações chave:
  - `cpf`: algoritmo BR; trim/format.
  - `cep`: 8 dígitos; auto-completar via ViaCEP.
  - `address`: ao salvar, geocodifica via `/api/geocode` e grava `location`.
  - `animal.estimated_age_months`: inteiro ≥ 0.
  - `request.message`: 10–1000 chars.

---

## 10. Server-side: dados, ações e cache

- **TanStack Query** no client para listas com filtros (feed, lista de abrigos, pipeline) — com `keepPreviousData` e debounce de 250 ms.
- **Server Actions** para mutações (criar abrigo, criar animal, aceitar/recusar, finalizar, promover member). Cada action:
  1. `requireUser()`.
  2. `requireShelterRole(...)` quando aplicável.
  3. `schema.parse(input)`.
  4. Chama Supabase com client server-side.
  5. `revalidateTag(...)` ou `updateTag(...)` conforme leitura/escrita (Next 16: usar `updateTag` em writes para read-your-writes).
- Tags principais: `animals:feed`, `shelter:{id}:requests`, `me:history`, `me:notifications`.

---

## 11. Realtime e notificações

- `messages`: subscribe via `supabase.channel('messages:'+conversationId)` filtrado por `conversation_id`.
- `requests`: members do abrigo subscribe a `requests:shelter:{id}` para atualizar o pipeline.
- `notifications`: subscribe por `user_id = auth.uid()`. UI: ícone sino na navbar (badge contagem `read_at is null`).
- Toast (sonner) ao receber nova solicitação/aceite/recusa.

---

## 12. Geolocalização

1. `create extension postgis;` (verificar suporte na instância — Supabase suporta).
2. Função `f_distance_km(a, b)`:
   ```sql
   create or replace function f_distance_km(a geography, b geography)
   returns numeric language sql immutable as $$
     select round((st_distance(a, b) / 1000)::numeric, 2);
   $$;
   ```
3. Endpoint `/api/geocode?q=...` → Nominatim com `User-Agent` próprio e cache em tabela `geocode_cache(query, lat, lng, fetched_at)`.
4. UX: ao filtrar feed, slider de raio (5/10/25/50/100 km). Default 25 km. Listagem ordena por `f_distance_km(profile.location, animal.shelter.location)`.

---

## 13. Notificações por e-mail (opcional além do MVP)

- Edge Function `notify-on-request` invocada por trigger ou usando `pg_net`. Templates simples via Resend (não obrigatório p/ Grau A).

---

## 14. Migrations e seed

Ordem dos arquivos em `supabase/migrations/`:

1. `0001_init.sql` — extensions, enums, tabelas.
2. `0002_indexes.sql` — índices e constraints adicionais.
3. `0003_functions.sql` — `is_member`, `f_distance_km`, `get_profile_for_shelter`.
4. `0004_triggers.sql` — gatilhos descritos em §3.4.
5. `0005_rls.sql` — políticas.
6. `0006_storage.sql` — criação dos buckets e policies.
7. `0007_realtime.sql` — publicação `supabase_realtime`.

Seed (`supabase/seed.sql`): replica o `mockData.ts` do Figma para demo fiel: **3 abrigos** (Abrigo Esperança, Casa dos Felinos, Refúgio Animal — Porto Alegre/RS), **6 animais** (Luna, Thor, Mia, Rex, Nina, Mel), **~6 supply_needs** ("Ração para cachorro", "Cobertores", "Medicamentos", "Ração para gato", "Areia sanitária", "Brinquedos"), **1 usuário comum** "Pedro Oliveira" com 1 adoção histórica (Bob, dez/2025), **3 solicitações de exemplo** (1 adoption pending de Maria Silva para Luna, 1 volunteer pending de João Santos, 1 supplies approved de Ana Costa). Imagens de Unsplash apenas no seed; em produção use uploads.

Comandos:
```bash
pnpm dlx supabase migration new init
pnpm dlx supabase db push        # aplica nas remotas
pnpm dlx supabase gen types typescript --linked > lib/supabase/types.ts
```

---

## 15. Rastreabilidade (RF → entrega)

| Req | Onde |
|---|---|
| RF01 | `shelters` + `shelter_media`; `/shelters/[slug]/edit` |
| RF02 | `animals` + `animal_media`; `/shelter/.../animals/new` |
| RF03 | FK `animals.shelter_id NOT NULL` + RN01 (check no app) |
| RF04 | `profiles`; `/me/profile` |
| RF05 | grupos de rota `(public)`, `(app)`, `app/shelter/...` |
| RF06–RF09 | `shelter_members.role`; `/shelter/[slug]/team`; `VolunteerBadge` |
| RF10 | `/shelter/[slug]/animals` + `animals.status='available'` |
| RF11 | `/shelter/[slug]/supplies` |
| RF12, RF13 | `/feed` + `AnimalFilters` + `f_distance_km` |
| RF14 | `/shelters` ordenado por distância |
| RF15–RF17 | `requests` + `/requests/new/[kind]` |
| RF18 | trigger `requests_after_insert` + `notifications` |
| RF19 | `/shelter/[slug]/requests` + actions accept/reject |
| RF20 | trigger cria `conversations`; `/requests/[id]` |
| RF21 | `/me/history` (queries em `requests` finalized + `shelter_members` volunteer) |
| RF22 | `/shelter/[slug]/requests/[id]` com `get_profile_for_shelter` |
| RF23 | mesma tela, agregação cross-shelter (RLS especial via função) |
| RF24 | action `finalize` em `requests` |
| RF25 | trigger atualiza `animals.status='adopted'` + view `v_animals_public` |
| RF26 | trigger atualiza `supply_needs.status` |
| RN01 | FK + check |
| RN02 | trigger só cria `conversation` se `status='accepted'` |
| RN03 | RLS exige role em `requests.finalize` |
| RN04 | `enforce_volunteer_promotion` |
| RN05 | `get_profile_for_shelter` + view restritiva |
| RNF01 | layouts distintos `(app)` vs `shelter/[slug]/...` |
| RNF02 | RLS + Server Actions + pgcrypto p/ CPF |
| RNF03 | índices GIST em `location`, filtros server-side |
| RNF04 | índice único `requests_one_active_adoption` |
| RNF05 | stack confirmada (RHF + TanStack a adicionar) |
| RNF06 | Realtime nas tabelas `messages`, `requests`, `notifications` |
| RNF07 | Storage com policies por bucket |

---

## 16. Roadmap em fases

**Fase 0 — Fundação (1 dia)**
- Instalar deps (`react-hook-form`, `zod`, `@tanstack/react-query`, etc.).
- Configurar `lib/supabase/{server,client}.ts`, `proxy.ts`, `providers.tsx`, `next.config.ts` (remotePatterns).
- Instalar componentes shadcn da lista.
- Layout base + tema. Validar contra design Figma (precisa do export/screenshots).

**Fase 1 — Banco e auth (1–2 dias)**
- Escrever migrations 0001–0007.
- `supabase db push`; gerar types.
- Telas `signup`, `login`, `forgot/reset`.
- Onboarding `/me/profile` e `/shelter/new`.

**Fase 2 — Catálogo (2 dias)**
- CRUD de abrigo (admin/editor) com upload.
- CRUD de animais e supply_needs.
- Página pública do abrigo `/shelters/[slug]`.

**Fase 3 — Feed e descoberta (1–2 dias)**
- `/feed` com filtros e distância.
- `/shelters` ordenado por distância.
- Endpoint `/api/geocode` + cache.

**Fase 4 — Solicitações (2 dias)**
- Forms `/requests/new/[kind]`.
- Pipeline `/shelter/[slug]/requests` com accept/reject/finalize.
- Triggers criando `conversation` e `notifications`.

**Fase 5 — Chat e realtime (1 dia)**
- `/requests/[id]` com `ConversationView`.
- Sino de notificações na navbar.

**Fase 6 — Histórico e ajustes (1 dia)**
- `/me/history`, badges, time do abrigo, promover voluntário.

**Fase 7 — Polimento e seed (1 dia)**
- Seed; loading skeletons; estados vazios; revisão de fidelidade ao Figma; checklist de RFs.

> Total estimado: ~10–12 dias úteis de execução focada.

---

## 17. Riscos e itens a confirmar com o orientador / colega

1. ~~**Figma Make**~~ — ✅ resolvido em 21/06/2026 (acesso via MCP). Telas faltantes (auth/onboarding) seguirão o padrão visual extraído.
2. **CPF criptografado** vs apenas em `profiles` com RLS estrita — confirmar exigência. O Figma exibe CPF em texto puro no card de solicitação (RN05) e no perfil do próprio usuário; a RLS já cobre isso. **Sugestão**: começar sem `pgcrypto`, só com RLS; adicionar `cpf_encrypted` se a banca questionar.
3. **Mapa visual**: fora do MVP. RF12/RF14 falam só de distância. O Figma também não tem mapa — só slider e km.
4. **Política de uma só requisição de adoção por animal**: o índice único `requests_one_active_adoption` faz "fail fast". O Figma não trata o caso. **Sugestão**: ao aceitar, o app automaticamente recusa as demais pending do mesmo animal (mensagem amigável no requester).
5. **Voluntário ↔ editor**: voluntário aprovado **não é automaticamente** editor; promoção é ação separada do admin (RN04). Confirmado pelo design (não há esse fluxo desenhado).
6. **Multi-abrigo por membro**: o Figma assume 1 abrigo no painel. Mantemos `shelter-switcher` discreto no topo do dashboard para o caso de membro de >1.
7. **Modelo de suprimentos**: design usa `string[]`, plano usa tabela. **Decisão**: tabela `supply_needs` (RF11/RF26), com modal de doação criando 1 request por item. UX: chips clicáveis que viram checkboxes (idêntico ao Figma) mas com IDs por baixo.
8. **Lista de mensagens**: design mostra preview da última mensagem + contador unread. Decidido: cachear em `conversations.last_message_at/preview` via trigger + duas colunas `last_read_at` por participante.
9. **"AdotaPet" como nome do produto**: vamos usar nas metadatas (`app/layout.tsx` title, README), no header e nas telas de auth.

---

## 18. Próximos passos sugeridos (após aprovação do plano)

1. Subir screenshots/export do Figma Make → ajustar tokens e componentes.
2. Aprovar este plano (ou marcar mudanças nos itens da §17).
3. Iniciar Fase 0 + Fase 1 no mesmo PR.
