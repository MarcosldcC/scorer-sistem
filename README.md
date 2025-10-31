# Sistema de Avaliação - Torneio de Robótica

Sistema web completo para avaliação de equipes em um torneio de robótica educacional, desenvolvido com Next.js 14, TypeScript, Prisma ORM e PostgreSQL.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Banco de Dados](#banco-de-dados)
- [Áreas de Avaliação](#áreas-de-avaliação)
- [Funcionalidades](#funcionalidades)
- [Instalação e Configuração](#instalação-e-configuração)
- [Deploy](#deploy)

---

## 🎯 Visão Geral

Este sistema foi desenvolvido para gerenciar e avaliar equipes participantes de um torneio de robótica educacional. Ele permite que juízes especializados em diferentes áreas avaliem equipes de forma estruturada e padronizada, gerando rankings e relatórios automáticos.

### Características Principais

- **Multi-área**: Suporta avaliação em três áreas distintas (Programação, Pesquisa/Storytelling, Torcida)
- **Multi-nível**: Adapta as rubricas conforme a série escolar (2º, 3º, 4º e 5º ano)
- **Usuários Especializados**: Cada juiz avalia apenas sua área de expertise
- **Administração Centralizada**: Usuário administrador com acesso total
- **Rankings Dinâmicos**: Cálculo automático de posições com filtros por turma e turno
- **Relatórios Exportáveis**: Geração de relatórios em CSV com estatísticas completas
- **Interface Responsiva**: Design moderno e adaptável a diferentes dispositivos

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular e escalável:

### Stack Tecnológico

```
Frontend: Next.js 14 (App Router) + React 18 + TypeScript
UI: Tailwind CSS + shadcn/ui + Radix UI
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL
Auth: JWT (JSON Web Tokens) + bcrypt
```

### Fluxo de Dados

```
Usuário → Next.js Frontend → API Routes → Prisma ORM → PostgreSQL
```

### Padrões de Arquitetura

- **API Routes**: Rotas serverless para operações backend
- **Custom Hooks**: Reutilização de lógica de estado e efeitos
- **Component-Based**: UI construída com componentes modulares
- **Type-Safe**: TypeScript em todo o projeto para segurança de tipos

---

## 🛠️ Tecnologias

### Core
- **Next.js 14.2.16**: Framework React com SSR e App Router
- **React 18**: Biblioteca de UI
- **TypeScript 5**: Type safety
- **Prisma 6.16.2**: ORM

### Backend
- **PostgreSQL**: Banco relacional
- **JWT (jsonwebtoken)**: Autenticação
- **bcryptjs**: Hash de senhas

### Frontend
- **Tailwind CSS 4.1.9**: Estilos utility-first
- **shadcn/ui**: Componentes (baseado em Radix UI)
- **Radix UI**: Headless UI primitives
- **Lucide React**: Ícones
- **React Hook Form**: Formulários
- **Zod**: Validação de schemas

### Desenvolvimento
- **pnpm**: Gerenciador de pacotes
- **tsx**: Execução de TypeScript
- **ESLint**: Linter
- **Vercel Analytics**: Analytics opcional

---

## 📁 Estrutura do Projeto

```
scorer-sistem/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticação
│   │   │   ├── login/           # POST - Login de usuários
│   │   │   └── verify/          # POST - Verificação de token
│   │   ├── evaluations/         # CRUD de avaliações
│   │   │   ├── delete/          # DELETE - Exclusão de avaliações
│   │   │   └── route.ts         # GET/POST - Listar/Criar avaliações
│   │   ├── rankings/            # GET - Rankings calculados
│   │   └── teams/               # GET/POST - Equipes
│   ├── dashboard/               # Página principal autenticada
│   ├── evaluate/[area]/        # Página de avaliação dinâmica
│   ├── rankings/                # Página de rankings
│   ├── reports/                 # Página de relatórios
│   ├── globals.css              # Estilos globais
│   ├── layout.tsx               # Layout raiz da aplicação
│   └── page.tsx                 # Página de login (home)
│
├── components/                   # Componentes React
│   ├── ui/                      # Componentes de UI base (shadcn)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...                   # +30 componentes UI
│   ├── dashboard-header.tsx     # Cabeçalho do dashboard
│   ├── dashboard-stats.tsx      # Estatísticas do dashboard
│   ├── evaluation-card.tsx      # Card de área de avaliação
│   ├── evaluation-timer.tsx     # Timer para avaliações
│   ├── rubric-scoring.tsx       # Sistema de pontuação
│   ├── ranking-filters.tsx      # Filtros de rankings
│   ├── ranking-table.tsx        # Tabela de rankings
│   ├── delete-evaluation-modal.tsx # Modal de exclusão
│   ├── login-form.tsx           # Formulário de login
│   └── theme-provider.tsx       # Provider de tema
│
├── hooks/                        # Custom React Hooks
│   ├── use-auth.ts              # Hook de autenticação (legacy)
│   ├── use-auth-api.ts          # Hook de autenticação (API)
│   ├── use-teams.ts             # Hook de equipes
│   ├── use-evaluations.ts       # Hook de avaliações
│   ├── use-rankings.ts          # Hook de rankings
│   ├── use-reports.ts           # Hook de relatórios
│   ├── use-delete-evaluation.ts # Hook de exclusão
│   ├── use-timer.ts             # Hook de timer
│   └── use-toast.ts             # Hook de notificações
│
├── lib/                          # Bibliotecas e utilitários
│   ├── prisma.ts                # Cliente Prisma configurado
│   ├── auth.ts                  # Utilitários de autenticação
│   ├── config.ts                # Configurações da aplicação
│   ├── teams.ts                 # Utilitários de equipes
│   ├── rankings.ts              # Lógica de cálculo de rankings
│   ├── rubrics.ts               # Rubricas de avaliação
│   └── utils.ts                 # Funções utilitárias gerais
│
├── prisma/                       # Prisma Schema
│   └── schema.prisma            # Schema do banco de dados
│
├── scripts/                      # Scripts auxiliares
│   └── init-db.ts               # Script de inicialização do BD
│
├── public/                       # Arquivos estáticos
│   ├── placeholder-logo.png
│   ├── placeholder-user.jpg
│   └── ...
│
├── .env.example                  # Exemplo de variáveis de ambiente
├── components.json               # Configuração shadcn/ui
├── next.config.mjs              # Configuração Next.js
├── package.json                  # Dependências do projeto
├── postcss.config.mjs           # Configuração PostCSS
├── tsconfig.json                # Configuração TypeScript
├── DEPLOYMENT.md                # Guia de deploy
└── README.md                    # Este arquivo
```

---

## 🗄️ Banco de Dados

### Schema Prisma

O banco de dados utiliza PostgreSQL com o seguinte schema:

#### **User** (Usuários)
```prisma
model User {
  id        String   @id @default(cuid())
  name      String                              # Nome do juiz
  email     String?  @unique                    # Email (opcional)
  password  String                              # Senha hashada (bcrypt)
  isAdmin   Boolean  @default(false)            # Privilégios administrativos
  areas     String[]                            # Áreas de avaliação: ["programming", "research", "identity"]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  evaluations Evaluation[]                      # Avaliações realizadas
}
```

**Usuários Pré-configurados**:
- **Marina Vitória**: Programação
- **Gabrielly Barreto**: Programação
- **Gabrielly Araújo**: Programação
- **Camila Letícia**: Programação
- **Ana Carolina**: Programação
- **Felipe Leão**: Pesquisa
- **Rafael**: Pesquisa
- **Lucas Gambarini**: Torcida
- **Marcos**: Admin (todas as áreas)

**Senha padrão**: `inicial@123`

#### **Team** (Equipes)
```prisma
model Team {
  id        String   @id @default(cuid())
  name      String                              # Nome da equipe (ex: "2ºA")
  grade     String                              # Série: "2", "3", "4" ou "5"
  shift     String                              # Turno: "morning" ou "afternoon"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  evaluations Evaluation[]                      # Avaliações recebidas
  
  @@unique([name, grade, shift])               # Equipe única por série+turno
}
```

**Equipes Pré-configuradas**:
- **Manhã**: 2ºA, 2ºB, 3ºA, 3ºB, 4ºA, 4ºB, 5ºA, 5ºB
- **Tarde**: 2ºC, 2ºD, 2ºE, 3ºC, 3ºD, 4ºC, 4ºD, 4ºE, 5ºC, 5ºD

#### **Evaluation** (Avaliações)
```prisma
model Evaluation {
  id            String   @id @default(cuid())
  teamId        String                              # ID da equipe avaliada
  area          String                              # Área: "programming", "research", "identity"
  scores        Json                                # Array de pontuações: [{criterionId, score}]
  comments      String?                             # Comentários do avaliador
  evaluationTime Int                                # Tempo de avaliação em segundos
  evaluatedById String                              # ID do avaliador
  evaluatedAt   DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  team      Team       @relation(...)
  evaluatedBy User     @relation(...)
  penalties Penalty[]                               # Penalidades aplicadas
  
  @@unique([teamId, area, evaluatedById])          # Uma avaliação por área/equipe/avaliador
}
```

#### **Penalty** (Penalidades)
```prisma
model Penalty {
  id          String   @id @default(cuid())
  evaluationId String                              # ID da avaliação
  type        String                              # Tipo: "robot_touch", etc.
  points      Int                                 # Pontos negativos
  description String?                             # Descrição
  createdAt   DateTime @default(now())
  
  evaluation Evaluation @relation(...)
}
```

**Tipos de Penalidades**:
- `robot_touch`: Toque no robô em movimento (-5 pontos por ocorrência)

---

## 📊 Áreas de Avaliação

### 1. Programação
Avalia a execução prática de missões com o robô.

**Missões**:
- **Missão 1 - Lixo**: 10 pontos por lixo (máx. 50 pontos)
- **Missão 2 - Mudas**: 15 pontos por muda (máx. 45 pontos)
- **Missão 3 - Tartarugas**: 20 pontos por tartaruga (máx. 60 pontos)
- **Missão 4 - Coral**: 30 pontos (máx. 30 pontos)
- **Missão 5 - Casinha**: 40 pontos (máx. 40 pontos)

**Total**: 225 pontos

**Tempo Limite**:
- 2º ano: 8 minutos
- 3º a 5º ano: 5 minutos

### 2. Pesquisa/Storytelling
Avalia a pesquisa e apresentação do projeto.

**Rubrica para 3º, 4º e 5º Ano**:
- **Desenvolvimento do Cartaz** (0-10): Visual, hierarquia
- **Aprofundamento da Pesquisa** (0-10): Fundamentação, fontes
- **Clareza na Apresentação** (0-10): Organização, lógica
- **Relevância e Aplicação Prática** (0-10): Praticidade, impacto

**Rubrica para 2º Ano** (Storytelling):
- **Clareza de Apresentação** (0-10)
- **Participação dos Alunos** (0-10)
- **Criatividade** (0-10)
- **Cenário** (0-10)
- **Figurino** (0-10)

**Total**: 40 pontos (2º ano: 50 pontos)

**Escala de Avaliação**:
- 0: Não Demonstrado
- 3: Iniciante
- 5: Em Desenvolvimento
- 7: Finalizado
- 10: Exemplar

### 3. Torcida
Avalia a identidade visual e animação da equipe.

**Rubrica**:
- **Desenho do Mascote no Cartaz** (0-10): Qualidade e conexão conceitual
- **Grito de Garra** (0-10): Criatividade e memorização
- **Animação** (0-10): Execução fluida
- **Criatividade e Originalidade** (0-10): Inovação
- **Apresentação e Coerência Visual** (0-10): Consistência gráfica

**Total**: 50 pontos

**Sem limite de tempo**

---

## ⚙️ Funcionalidades

### 🔐 Autenticação
- Login com nome e senha
- JWT para controle de sessão
- Verificação automática de token
- Permissões por área de avaliação
- Acesso administrativo completo

### 📝 Avaliação
- Seleção de equipe pendente
- Timer automático por série
- Rubrica visual com checkboxes
- Penalidades configuráveis
- Comentários adicionais
- Salvar/atualizar avaliações
- Validação de critérios obrigatórios

### 📊 Dashboard
- Estatísticas gerais
- Progresso por área
- Cards de acesso rápido
- Navegação intuitiva
- Ações rápidas (Rankings, Relatórios)

### 🏆 Rankings
- Cálculo automático de posições
- Ordenação por percentual e pontuação
- Filtros por turno e série
- Visualização por área
- Exclusão de avaliações (admin)
- Atualização em tempo real

### 📈 Relatórios
- Estatísticas consolidadas
- Progresso geral
- Médias de pontuação
- Tabela de rankings detalhada
- Exportação CSV
- Filtros por série e turno

### 🗑️ Gestão
- Exclusão de avaliações (admin)
- Confirmação de ações destrutivas
- Histórico de avaliações
- Auditoria (usuário e timestamp)

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js**: 18+ ou superior
- **pnpm**: Gerenciador de pacotes
- **PostgreSQL**: 12+ ou superior

### Passo 1: Clonar o Repositório

```bash
git clone <repository-url>
cd scorer-sistem
```

### Passo 2: Instalar Dependências

```bash
pnpm install
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/robotics_evaluation?schema=public"

# JWT
JWT_SECRET="sua-chave-secreta-jwt-super-segura-aqui"

# NextAuth (opcional)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-nextauth-secreta"
```

### Passo 4: Configurar Banco de Dados

```bash
# Gerar cliente Prisma
pnpm run db:generate

# Aplicar schema ao banco
pnpm run db:push

# Popular banco com dados iniciais
pnpm run db:seed
```

### Passo 5: Iniciar Servidor de Desenvolvimento

```bash
pnpm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm run dev          # Inicia servidor de desenvolvimento

# Build
pnpm run build        # Gera build de produção
pnpm run start        # Inicia servidor de produção

# Banco de Dados
pnpm run db:generate  # Gera cliente Prisma
pnpm run db:push      # Aplica schema ao banco
pnpm run db:migrate   # Cria migração
pnpm run db:seed      # Popula banco com dados iniciais
pnpm run db:studio    # Abre Prisma Studio

# Qualidade
pnpm run lint         # Executa ESLint
```

---

## 🌐 Deploy

### Vercel (Recomendado)

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXTAUTH_URL`
3. Deploy automático a cada push

### Outras Plataformas

Consulte `DEPLOYMENT.md` para instruções detalhadas.

### Variáveis de Ambiente

**Obrigatórias**:
- `DATABASE_URL`
- `JWT_SECRET`

**Opcionais**:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

---

## 📝 Estrutura de API

### `POST /api/auth/login`
Login de usuário.

**Request**:
```json
{
  "name": "Marina Vitória",
  "password": "inicial@123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "clxxx",
    "name": "Marina Vitória",
    "isAdmin": false,
    "areas": ["programming"]
  }
}
```

### `POST /api/auth/verify`
Verifica token JWT.

**Request**:
```json
{
  "token": "eyJhbGc..."
}
```

### `GET /api/teams`
Lista equipes (com token).

**Query**:
- `shift`: "morning" | "afternoon"
- `grade`: "2" | "3" | "4" | "5"

### `POST /api/evaluations`
Cria/atualiza avaliação.

**Request**:
```json
{
  "teamId": "clxxx",
  "area": "programming",
  "scores": [
    {"criterionId": "mission1", "score": 50},
    {"criterionId": "mission2", "score": 45}
  ],
  "comments": "Excelente execução",
  "evaluationTime": 240,
  "penalties": [
    {"type": "robot_touch", "points": -5, "description": "Toque no robô (1x)"}
  ]
}
```

### `DELETE /api/evaluations/delete`
Exclui avaliação (admin).

**Request**:
```json
{
  "teamId": "clxxx",
  "area": "programming"
}
```

### `GET /api/rankings`
Obtém rankings calculados.

**Query**:
- `shift`: "morning" | "afternoon"
- `grade`: "2" | "3" | "4" | "5"

---

## 🔒 Segurança

### Autenticação
- JWT com expiração de 24h
- Senhas hashadas com bcrypt (10 rounds)
- Verificação de token em todas as rotas protegidas

### Autorização
- Permissões por área de avaliação
- Admin com acesso total
- Validação no backend e frontend

### Validação
- TypeScript para type safety
- Zod para validação de schemas
- Sanitização de inputs

---

## 🎨 UI/UX

### Design System
- **Tema**: Neutro com variáveis CSS
- **Componentes**: shadcn/ui (Radix UI)
- **Ícones**: Lucide React
- **Responsividade**: Mobile-first

### Paleta de Cores
- **Primary**: Azul (pontuações, ações)
- **Secondary**: Cinza (neutro)
- **Destructive**: Vermelho (erros, exclusões)
- **Success**: Verde (sucesso)

### Componentes Principais
- **Cards**: Avaliações, estatísticas
- **Tables**: Rankings, relatórios
- **Modals**: Confirmações, exclusões
- **Forms**: Login, avaliação
- **Alerts**: Erros, sucesso

---

## 📚 Documentação Adicional

- **DEPLOYMENT.md**: Guia de deploy detalhado
- **components.json**: Configuração shadcn/ui
- **prisma/schema.prisma**: Schema do banco
- **scripts/init-db.ts**: Script de inicialização

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é propriedade privada. Todos os direitos reservados.

---

## 👥 Equipe

Desenvolvido para o **Torneio de Robótica Educacional**.

**Juízes**:
- Marina Vitória, Gabrielly Barreto, Gabrielly Araújo, Camila Letícia, Ana Carolina (Programação)
- Felipe Leão, Rafael (Pesquisa)
- Lucas Gambarini (Torcida)
- Marcos (Administrador)

---

**Última atualização**: 2024

