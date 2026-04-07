# profitOS — Manual do Desenvolvedor

**Versão:** 2.0  
**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth · Tailwind CSS  
**Deploy:** Vercel (região São Paulo — gru1)

---

## Índice

1. [Arquitetura geral](#1-arquitetura-geral)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Banco de dados](#3-banco-de-dados)
4. [Autenticação multi-tenant](#4-autenticação-multi-tenant)
5. [API Routes](#5-api-routes)
6. [Módulo de precificação](#6-módulo-de-precificação)
7. [Setup local](#7-setup-local)
8. [Deploy no Vercel](#8-deploy-no-vercel)
9. [Variáveis de ambiente](#9-variáveis-de-ambiente)
10. [Fluxo de dados](#10-fluxo-de-dados)
11. [Extensão e customização](#11-extensão-e-customização)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Arquitetura geral

```
Browser (Next.js Client Components)
    ↓  fetch()
Next.js App Router (src/app)
    ├── (auth)/       → Telas públicas: login, registro
    ├── (app)/        → Telas protegidas: dashboard, clientes, etc.
    └── api/          → API Routes (REST)
         ├── auth/[...nextauth]  → NextAuth handler
         ├── clients/            → CRUD de clientes
         ├── pricing/            → CRUD de precificações
         └── dashboard/          → KPIs calculados
    ↓  Prisma ORM
PostgreSQL (Neon / Supabase)
```

**Multi-tenant por companyId:** Cada empresa (Company) tem seus próprios usuários, clientes, transações e precificações. O isolamento é feito via `companyId` em todas as queries — nenhuma query busca dados sem filtrar por empresa.

**Autenticação:** NextAuth.js com estratégia JWT. O token carrega `id`, `companyId`, `role` e `companyName`. O middleware protege todas as rotas do grupo `(app)` automaticamente.

---

## 2. Estrutura de pastas

```
profitos-saas/
├── prisma/
│   ├── schema.prisma          # Schema completo do banco
│   └── seed.ts                # Dados de exemplo para desenvolvimento
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx     # Layout público (centralizado, logo)
│   │   │   ├── login/         # Tela de login
│   │   │   └── register/      # Cadastro de empresa + usuário owner
│   │   │
│   │   ├── (app)/
│   │   │   ├── layout.tsx     # Layout protegido (Sidebar + Topbar)
│   │   │   ├── dashboard/     # Visão geral com KPIs
│   │   │   ├── clientes/      # CRUD de clientes
│   │   │   ├── precificacao/  # Calculadora de projetos (planilha Almah)
│   │   │   ├── metas/         # Calculadora de meta de clientes
│   │   │   ├── churn/         # Análise e simulação de churn
│   │   │   ├── ceo/           # Perguntas estratégicas com respostas
│   │   │   ├── simulador/     # Simulador de cenários (5 tipos)
│   │   │   ├── importar/      # Upload de planilhas
│   │   │   └── configuracoes/ # Configurações de conta e empresa
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── clients/route.ts          # GET (lista) + POST (cria)
│   │   │   ├── clients/[id]/route.ts     # PUT (edita) + DELETE
│   │   │   ├── pricing/route.ts          # GET + POST
│   │   │   ├── pricing/[id]/route.ts     # GET + PUT + DELETE
│   │   │   ├── dashboard/route.ts        # GET com KPIs calculados
│   │   │   └── users/register/route.ts   # POST (cria empresa + owner)
│   │   │
│   │   ├── layout.tsx         # Root layout (SessionProvider)
│   │   ├── page.tsx           # Redirect: / → /dashboard ou /login
│   │   ├── providers.tsx      # SessionProvider wrapper
│   │   └── globals.css        # Tailwind + variáveis CSS
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Navegação lateral (usePathname)
│   │   │   └── Topbar.tsx     # Header com period picker + user menu
│   │   └── ui/
│   │       └── index.tsx      # KPICard, Alert, Card, Button, Input, etc.
│   │
│   └── lib/
│       ├── auth.ts            # NextAuthOptions (Credentials provider)
│       ├── prisma.ts          # Singleton do Prisma Client
│       └── utils.ts           # BRL(), calcPricingItem(), SERVICE_TYPE_LABELS
│
├── middleware.ts              # Proteção de rotas via withAuth
├── vercel.json                # Configuração de deploy
├── .env.example               # Template de variáveis
└── package.json
```

---

## 3. Banco de dados

### Modelos principais

| Modelo | Descrição |
|--------|-----------|
| `Company` | Tenant raiz. Cada empresa tem seu slug único. |
| `CompanySettings` | Configurações padrão (imposto, margem, horas/mês). |
| `User` | Usuário vinculado a uma Company. Roles: OWNER, ADMIN, MEMBER, VIEWER. |
| `Session` | Sessões JWT (gerenciadas pelo NextAuth). |
| `Client` | Cliente cadastrado pela empresa. Tem `grossRevenue`, `taxRate`, `netRevenue`. |
| `Category` | Categorias de receita/despesa por empresa. |
| `Transaction` | Lançamentos de entrada/saída com vínculo opcional a cliente e categoria. |
| `Pricing` | Proposta de precificação de projeto. |
| `PricingItem` | Linha da proposta: serviço, time, custo/hora, % projeto, horas alocadas. |

### Comandos úteis

```bash
# Criar banco e aplicar migrations
npx prisma db push

# Gerar cliente Prisma após mudança no schema
npx prisma generate

# Popular com dados de exemplo
npx tsx prisma/seed.ts

# Interface visual do banco
npx prisma studio
```

### Relações chave

```
Company 1──* User
Company 1──* Client
Company 1──* Transaction
Company 1──* Pricing
Pricing  1──* PricingItem
Client   1──* Transaction   (via clientId)
```

### Índices definidos

- `users`: `companyId`
- `clients`: `companyId`, `companyId + status`
- `transactions`: `companyId`, `companyId + type`, `companyId + dueDate`, `companyId + status`
- `pricingItems`: `pricingId`

---

## 4. Autenticação multi-tenant

### Fluxo de login

```
1. Usuário preenche email + senha em /login
2. NextAuth chama o handler authorize() em src/lib/auth.ts
3. Query no banco: User.findUnique por email, includes Company
4. bcrypt.compare(senha, passwordHash)
5. Token JWT criado com: id, companyId, companyName, role
6. Sessão persistida via cookie httpOnly
7. Redirect para /dashboard
```

### Acessando o usuário autenticado

**Server Component (App Router):**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);
const companyId = (session!.user as any).companyId;
```

**Client Component:**
```typescript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
const user = session?.user as any;
console.log(user.companyId, user.role);
```

**API Route:**
```typescript
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const companyId = (session.user as any).companyId;
```

### Criação de empresa (registro)

O endpoint `POST /api/users/register` faz tudo em uma transação:
1. Gera slug único a partir do nome da empresa
2. Cria `Company` com `CompanySettings` default
3. Cria `User` com role `OWNER`
4. Cria categorias padrão de despesa e receita

---

## 5. API Routes

### Padrão de resposta

Todas as rotas seguem:
- `200 OK` — sucesso (GET, PUT)
- `201 Created` — recurso criado (POST)
- `400 Bad Request` — dados inválidos (validação Zod)
- `401 Unauthorized` — sem sessão
- `404 Not Found` — recurso não encontrado na empresa
- `500 Internal Server Error` — erro inesperado

### Rotas disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/users/register` | Cria empresa + owner |
| GET | `/api/dashboard?period=90d` | KPIs calculados |
| GET | `/api/clients` | Lista clientes da empresa |
| POST | `/api/clients` | Cria cliente |
| PUT | `/api/clients/:id` | Atualiza cliente |
| DELETE | `/api/clients/:id` | Remove cliente |
| GET | `/api/pricing` | Lista precificações com itens |
| POST | `/api/pricing` | Cria precificação (recalcula tudo) |
| GET | `/api/pricing/:id` | Busca precificação específica |
| PUT | `/api/pricing/:id` | Atualiza + recalcula |
| DELETE | `/api/pricing/:id` | Remove precificação |

### Adicionando nova rota

```typescript
// src/app/api/nova-rota/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId; // SEMPRE filtrar por empresa

  const data = await prisma.seuModelo.findMany({ where: { companyId } });
  return NextResponse.json(data);
}
```

---

## 6. Módulo de precificação

Baseado na lógica da planilha `precificacao_almah2.xlsx`. A função `calcPricingItem()` em `src/lib/utils.ts` replica as fórmulas da planilha:

```typescript
// Coluna D: CUSTO HR CHEIO 160H
const fullHourCost = costPerHour * hoursPerMonth;

// Coluna E: Preço/h com margem
const pricePerHour = costPerHour * (1 + marginRate / 100);

// Coluna F: COM IMPOSTO
const priceWithTax = pricePerHour * (1 + taxRate / 100);

// Coluna G: CUSTO TIME/HR (mensal total do time naquele serviço)
const teamMonthlyCost = priceWithTax * hoursPerMonth * peopleCount;

// Coluna I: VR HR PROJETO
const projectRevenue = teamMonthlyCost * projectPct;

// Coluna K: CUSTO POR HORA (preço/h para vendas por hora)
// → pricePerHour (já calculado)

// Coluna L: VALOR DE VENDA (por hora alocada)
const saleByHour = hoursAllocated * pricePerHour;
```

### Adicionando serviços padrão

Edite o array `DEFAULT_SERVICES` em `src/app/(app)/precificacao/page.tsx`.

### Exportando proposta como PDF

Para adicionar exportação de PDF, instale `@react-pdf/renderer` e crie um componente de proposta. O endpoint de geração pode ser:

```typescript
// src/app/api/pricing/:id/pdf/route.ts
// Gera PDF com os dados da precificação
```

---

## 7. Setup local

```bash
# 1. Clone e instale
git clone <seu-repo>
cd profitos-saas
npm install

# 2. Configure as variáveis
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Configure o banco (Neon recomendado — neon.tech)
# Crie um projeto em neon.tech e copie a DATABASE_URL

# 4. Aplique o schema
npx prisma generate
npx prisma db push

# 5. Popule com dados de exemplo
npx tsx prisma/seed.ts
# Credenciais: admin@demo.com / Demo@2026

# 6. Inicie o servidor
npm run dev
# Acesse: http://localhost:3000
```

---

## 8. Deploy no Vercel

### Passo a passo completo

**1. Banco de dados (Neon — recomendado)**
- Acesse [neon.tech](https://neon.tech) → Create Project
- Copie as strings `DATABASE_URL` e `DIRECT_URL`
- O Neon suporta serverless nativamente (conexões pooled via pgBouncer)

**Alternativa: Supabase**
- [supabase.com](https://supabase.com) → New Project → Settings → Database
- `DATABASE_URL` usa a string com `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL` é a string direta (sem pgBouncer)

**2. GitHub**
```bash
git init
git add .
git commit -m "feat: profitOS SaaS v2"
git remote add origin https://github.com/seu-usuario/profitos-saas.git
git push -u origin main
```

**3. Vercel**
- [vercel.com](https://vercel.com) → New Project → Import do GitHub
- Framework: Next.js (detectado automaticamente)
- Root Directory: `./` (raiz do projeto)

**4. Variáveis de ambiente no Vercel**

No painel do projeto → Settings → Environment Variables:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://user:pass@host/db` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (gere um) |
| `NEXTAUTH_URL` | `https://seudominio.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://seudominio.vercel.app` |

**5. Build command personalizado** (já no vercel.json)
```json
"buildCommand": "prisma generate && next build"
```

**6. Primeiro deploy**
- Clique em Deploy
- Após deploy, abra o terminal da Vercel (ou acesse localmente com `DATABASE_URL` de produção):
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

**7. Domínio personalizado**
- Vercel → Settings → Domains → Add domain
- Configure DNS: CNAME para `cname.vercel-dns.com`
- Atualize `NEXTAUTH_URL` para o domínio real

---

## 9. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | Connection string com pgBouncer (pool) |
| `DIRECT_URL` | ✅ | Connection string direta (migrations) |
| `NEXTAUTH_SECRET` | ✅ | Chave para assinar tokens JWT (32+ chars) |
| `NEXTAUTH_URL` | ✅ | URL base do app (ex: https://app.com) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Mesma que NEXTAUTH_URL (client-side) |
| `RESEND_API_KEY` | ❌ | Email de recuperação de senha |
| `EMAIL_FROM` | ❌ | Remetente dos emails |
| `BLOB_READ_WRITE_TOKEN` | ❌ | Vercel Blob para uploads de logo |

---

## 10. Fluxo de dados

### Adicionando um cliente

```
1. Usuário preenche formulário em /clientes
2. POST /api/clients com { name, grossRevenue, taxRate, ... }
3. API valida com Zod
4. Calcula netRevenue = grossRevenue * (1 - taxRate/100)
5. prisma.client.create({ companyId, ...data })
6. Return 201 com o cliente criado
7. Frontend atualiza a lista via fetchClients()
```

### Calculando uma precificação

```
1. Usuário preenche itens em /precificacao
2. calcPricingItem() roda em tempo real no cliente (sem request)
3. POST /api/pricing com { name, items: [...], marginRate, taxRate }
4. API itera itens, chama calcPricingItem() para cada um
5. Soma totalCost e totalSale
6. prisma.pricing.create com itens aninhados
7. Return 201 com pricing completo + items calculados
```

### Período global (90d / 6m / 1a / 2a)

O período é um query param `?period=90d` passado nas rotas do grupo `(app)`. O `Topbar` usa `useRouter` para atualizar a URL mantendo os demais params. As páginas `(server components)` leem `searchParams.period` e calculam os totais multiplicando pelo número de meses.

---

## 11. Extensão e customização

### Adicionando um novo serviço na precificação

Edite `DEFAULT_SERVICES` em `src/app/(app)/precificacao/page.tsx`:
```typescript
const DEFAULT_SERVICES = [
  'Inbound Marketing',
  'Performance / Mídia Paga',
  // ... adicione aqui
  'Novo Serviço',
];
```

### Adicionando um novo campo ao cliente

1. Adicione o campo no `schema.prisma`
2. `npx prisma db push`
3. Adicione o campo ao Zod schema em `/api/clients/route.ts`
4. Adicione o input no formulário em `src/app/(app)/clientes/page.tsx`

### Adicionando um novo role de usuário

1. Adicione ao enum `UserRole` no schema.prisma
2. Atualize o `middleware.ts` se precisar de proteção por role
3. Adicione verificações nas API Routes:
```typescript
const role = (session.user as any).role;
if (role !== 'OWNER' && role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Adicionando emails (recuperação de senha)

1. Configure `RESEND_API_KEY` no `.env.local`
2. Instale: `npm install resend`
3. Crie `src/lib/email.ts`:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordReset(email: string, token: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Redefinir senha — profitOS',
    html: `<a href="${process.env.NEXTAUTH_URL}/reset?token=${token}">Redefinir senha</a>`,
  });
}
```

### Adicionando Stripe (planos pagos)

1. Instale: `npm install stripe @stripe/stripe-js`
2. Adicione `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` ao `.env.local`
3. Crie `src/app/api/billing/` com endpoints de checkout e webhook
4. O webhook atualiza `Company.plan` e `Company.planExpires`

---

## 12. Troubleshooting

### "PrismaClientKnownRequestError: P1001" — Não conecta ao banco
- Verifique se `DATABASE_URL` está correto no `.env.local`
- Para Neon: certifique-se que o projeto não está em suspensão (free tier)
- Teste a conexão: `npx prisma db push`

### "NEXTAUTH_URL must be set" — Erro de autenticação em produção
- No Vercel, defina `NEXTAUTH_URL=https://seu-app.vercel.app` nas env vars
- Não use barra no final da URL

### "Module not found: Can't resolve '@prisma/client'"
```bash
npx prisma generate
```

### Build falhando no Vercel: "Error: Cannot find module 'bcryptjs'"
- Verifique se `bcryptjs` está em `dependencies` (não `devDependencies`)
- Adicione ao `next.config.mjs`:
```javascript
experimental: { serverComponentsExternalPackages: ['bcryptjs'] }
```

### Tipos TypeScript — "Property 'companyId' does not exist on type 'User'"
NextAuth não conhece os campos customizados. Use cast:
```typescript
const user = session.user as { id: string; companyId: string; role: string; name: string; email: string; companyName: string };
```

### Middleware não está protegendo rotas
Verifique se o `matcher` no `middleware.ts` cobre o caminho desejado.  
O grupo `(app)` no App Router é removido da URL — `/dashboard` não é `/(app)/dashboard`.
