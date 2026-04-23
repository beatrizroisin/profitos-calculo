# profitOS SaaS v3.0

**CFO Digital para Agências e PMEs Brasileiras**  
Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth · Vercel

---

## O que é o profitOS

Sistema de inteligência financeira multi-tenant para agências de marketing e PMEs. Cada empresa tem seus dados completamente isolados. Funcionalidades principais:

- **Dashboard financeiro** com KPIs calculados do banco em tempo real
- **Precificação Almah** — calculadora de custo de time + margem + impostos
- **Contas a pagar/receber** com alertas de vencimento
- **Importação de planilhas** (.xlsx/.xls/.csv) com parse automático de colunas
- **Meta de clientes** — quantos precisam para cobrir os custos com margem alvo
- **Análise de churn** com simulador e LTV
- **Perguntas do CEO** — 3 perguntas estratégicas respondidas com dados reais
- **Simulador estratégico** — 5 cenários (contratar, demitir, perder cliente, investir, crescer)
- **Time / Alocações** — custo real por projeto, margem por cliente, capacidade do time
- **Integração RunRun.it** — horas reais vs. horas alocadas com comparativo e diagnóstico

---

## Deploy em produção (≈ 15 minutos)

### Pré-requisitos

- Conta [GitHub](https://github.com) (gratuita)
- Conta [Vercel](https://vercel.com) (gratuita — plano Hobby)
- Conta [Neon](https://neon.tech) (gratuita — PostgreSQL serverless)
- Projeto no [Google Cloud](https://console.cloud.google.com) (gratuito para OAuth)

---

### Passo 1 — Banco de dados no Neon

1. Acesse **neon.tech** → **Create Project**
2. Nome: `profitos` | Region: **South America (São Paulo)**
3. Copie as duas strings de conexão:
   - **Pooled connection string** → será `DATABASE_URL`
   - **Direct connection string** → será `DIRECT_URL`

> Diferença: a URL pooled usa pgbouncer (para a aplicação em produção). A direct é usada pelo Prisma para migrations.

---

### Passo 2 — Repositório GitHub

```bash
# Extrair e enviar para o GitHub
tar -xzf profitos-saas-v3-final.tar.gz
cd profitos-saas

git init
git add .
git commit -m "profitOS v3.0 — deploy inicial"

# Crie um repositório no GitHub (github.com/new), depois:
git remote add origin https://github.com/SEU_USUARIO/profitos.git
git push -u origin main
```

---

### Passo 3 — Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. **New Project** → dê um nome (ex: "profitOS")
3. Menu lateral → **APIs & Services** → **Credentials**
4. **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web Application**
6. Authorized redirect URIs:
   ```
   https://SEU-APP.vercel.app/api/auth/callback/google
   ```
7. Copie **Client ID** (→ `GOOGLE_CLIENT_ID`) e **Client Secret** (→ `GOOGLE_CLIENT_SECRET`)

---

### Passo 4 — Deploy no Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Selecione o repositório `profitos`
3. Framework: **Next.js** (detectado automaticamente)
4. **Build Command**: já está configurado no `vercel.json` (`prisma generate && next build`)
5. **Region**: selecione **São Paulo (gru1)** — já configurado no `vercel.json`

#### Adicione as variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL pooled do Neon |
| `DIRECT_URL` | URL direct do Neon |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://SEU-APP.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-APP.vercel.app` |
| `GOOGLE_CLIENT_ID` | Da console Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Da console Google Cloud |
| `RESEND_API_KEY` | De resend.com (opcional — e-mails) |
| `CRON_SECRET` | `openssl rand -hex 32` |

6. Clique em **Deploy**

---

### Passo 5 — Inicializar o banco (uma vez)

Execute localmente com as variáveis de produção:

```bash
# Configure as vars do Neon localmente
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# Cria as tabelas
npx prisma db push

# Popula com dados demo
npx tsx prisma/seed.ts
```

---

### Passo 6 — Acessar o sistema

Abra `https://SEU-APP.vercel.app` e faça login com as credenciais demo:

| E-mail | Senha | Nível |
|---|---|---|
| `admin@demo.com` | `Demo@2026` | Proprietário |
| `admin2@demo.com` | `Demo@2026` | Administrador |
| `gerente@demo.com` | `Demo@2026` | Gerente |
| `membro@demo.com` | `Demo@2026` | Membro |


> **Importante**: altere as senhas demo imediatamente após o primeiro acesso em produção.

---

## Desenvolvimento local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Criar e popular o banco
npx prisma db push
npx tsx prisma/seed.ts

# 4. Iniciar o servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3000
```

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm run start` | Inicia o servidor de produção (após build) |
| `npm run db:push` | Sincroniza o schema Prisma com o banco |
| `npm run db:migrate` | Aplica migrations em produção |
| `npm run db:seed` | Popula o banco com dados demo |
| `npm run db:studio` | Abre o Prisma Studio (interface visual do banco) |
| `npm run type-check` | Verifica tipos TypeScript sem compilar |
| `npm run lint` | Executa o ESLint |

---

## Arquitetura

```
profitos-saas/
├── prisma/
│   ├── schema.prisma          # 18 modelos, 12 enums
│   └── seed.ts                # Dados demo
├── src/
│   ├── app/
│   │   ├── (auth)/            # Rotas públicas
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── invite/[token]/
│   │   ├── (app)/             # Rotas protegidas (JWT obrigatório)
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── precificacao/
│   │   │   ├── pagar/
│   │   │   ├── receber/
│   │   │   ├── metas/
│   │   │   ├── churn/
│   │   │   ├── ceo/
│   │   │   ├── simulador/
│   │   │   ├── time/
│   │   │   ├── runrunit/
│   │   │   ├── importar/
│   │   │   ├── usuarios/
│   │   │   └── configuracoes/
│   │   ├── api/               # 26 API routes REST
│   │   ├── onboarding/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # 14 itens, filtrados por role
│   │   │   └── Topbar.tsx
│   │   └── ui/index.tsx       # Componentes reutilizáveis
│   └── lib/
│       ├── auth.ts            # NextAuth + helpers de role
│       ├── prisma.ts          # Cliente Prisma singleton
│       ├── runrunit.ts        # Cliente API RunRun.it
│       └── utils.ts           # BRL(), calcPricingItem(), etc.
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                # Build + regiões + cron job
```

---

## Módulos e permissões

| Módulo | Rota | Permissão mínima |
|---|---|---|
| Dashboard | `/dashboard` | VIEWER |
| Clientes | `/clientes` | MEMBER |
| Precificação | `/precificacao` | MANAGER |
| Contas a pagar | `/pagar` | MEMBER |
| Contas a receber | `/receber` | MEMBER |
| Meta de clientes | `/metas` | MEMBER |
| Análise de churn | `/churn` | MEMBER |
| Perguntas do CEO | `/ceo` | MEMBER |
| Simulador estratégico | `/simulador` | MEMBER |
| Time / Alocações | `/time` | MANAGER |
| Integração RunRun.it | `/runrunit` | ADMIN |
| Importar planilhas | `/importar` | MANAGER |
| Usuários | `/usuarios` | ADMIN |
| Configurações | `/configuracoes` | ADMIN |

### Hierarquia de roles

```
OWNER > ADMIN > MANAGER > MEMBER > VIEWER
```

---

## Integração RunRun.it

Após o deploy, para ativar:

1. No profitOS: acesse **RunRun.it → Configuração**
2. No RunRun.it: **Configurações → API e Integrações** → copie App-Key e User-Token
3. Cole as credenciais no profitOS → **Testar conexão** → **Salvar e ativar**
4. Aba **Vínculo de usuários** → vincule cada colaborador ao usuário RunRun.it correspondente
5. Clique em **Sincronizar agora** para importar os timesheets

O cron job Vercel sincroniza automaticamente todos os dias às **7h BRT** (configurado em `vercel.json`).

---

## Variáveis de ambiente — resumo

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL pooled (Neon) |
| `DIRECT_URL` | ✅ | PostgreSQL direct para Prisma |
| `NEXTAUTH_SECRET` | ✅ | Secret JWT do NextAuth |
| `NEXTAUTH_URL` | ✅ | URL base da aplicação |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública (usada no frontend) |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth Google |
| `RESEND_API_KEY` | ⚠️ | E-mails de convite e reset (sem ela, só login manual) |
| `CRON_SECRET` | ⚠️ | Proteção do cron RunRun.it |

---

## Solução de problemas

**Build falha com erro do Prisma**  
→ Verifique se `DATABASE_URL` e `DIRECT_URL` estão corretas no Vercel. O Prisma precisa das duas.

**Login com Google não funciona**  
→ Confira se a Redirect URI no Google Cloud inclui exatamente `https://SEU-APP.vercel.app/api/auth/callback/google`.

**Erro "NEXTAUTH_URL must be set"**  
→ Adicione `NEXTAUTH_URL` nas variáveis de ambiente do Vercel com a URL exata do app.

**Usuários não conseguem criar empresa**  
→ Execute `npx tsx prisma/seed.ts` para criar os dados demo, ou crie manualmente via `/register`.

**Cron do RunRun.it não executa**  
→ Verifique se `CRON_SECRET` está configurado no Vercel. O plano Hobby do Vercel tem suporte a crons.
