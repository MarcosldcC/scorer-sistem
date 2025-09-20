# Sistema de Avaliação de Robótica - Backend

Este documento contém as instruções para configurar e executar o backend do sistema de avaliação de robótica.

## Configuração do Banco de Dados

### 1. Instalar PostgreSQL
- Instale o PostgreSQL em sua máquina
- Configure com usuário `postgres` e senha `1234`
- Crie um banco de dados chamado `robotics_evaluation`

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/robotics_evaluation?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"
```

### 3. Executar Migrações
```bash
# Gerar cliente Prisma
pnpm db:generate

# Aplicar migrações ao banco
pnpm db:push

# Inicializar dados (usuários e equipes)
pnpm db:seed
```

## Estrutura do Backend

### APIs Implementadas

#### Autenticação
- `POST /api/auth/login` - Login de usuários
- `POST /api/auth/verify` - Verificação de token JWT

#### Equipes
- `GET /api/teams` - Listar equipes (com filtros)
- `POST /api/teams` - Criar nova equipe (apenas admin)

#### Avaliações
- `POST /api/evaluations` - Submeter avaliação
- `GET /api/evaluations` - Listar avaliações (com filtros)

#### Rankings
- `GET /api/rankings` - Obter rankings (com filtros)

### Usuários Pré-configurados

**Juízes de Programação:**
- Marina Vitória
- Gabrielly Barreto
- Gabrielly Araújo
- Camila Letícia
- Ana Carolina

**Juízes de Pesquisa:**
- Felipe Leão
- Rafael

**Juiz de Identidade:**
- Lucas Gambarini

**Administrador:**
- Marcos (acesso completo)

**Senha padrão para todos:** `inicial@123`

### Rubricas de Avaliação

#### Programação (225 pontos máximos)
- Missão 1 - Lixo: 10 pontos por unidade (5 und) = 50 pts
- Missão 2 - Mudas: 15 pontos por unidade (3 und) = 45 pts
- Missão 3 - Tartarugas: 20 pontos por unidade (3 und) = 60 pts
- Missão 4 - Coral: 30 pontos
- Missão 5 - Casinha: 40 pontos
- Penalidade: Toque no robô = -5 pontos

#### Pesquisa (40 pontos máximos)
- Desenvolvimento do Cartaz: 10 pontos
- Aprofundamento da Pesquisa: 10 pontos
- Clareza na Apresentação: 10 pontos
- Relevância e Aplicação Prática: 10 pontos

#### Identidade (50 pontos máximos)
- Desenho do Mascote no Cartaz: 10 pontos
- Grito de Garra: 10 pontos
- Animação: 10 pontos
- Criatividade e Originalidade: 10 pontos
- Apresentação e Coerência Visual: 10 pontos

## Funcionalidades Implementadas

### ✅ Gestão de Usuários
- Cadastro de juízes e administradores
- Autenticação com JWT
- Controle de permissões por área de avaliação

### ✅ Gerenciamento de Equipes
- Cadastro de equipes por turma e turno
- Listagem com filtros

### ✅ Sistema de Avaliações
- Submissão de avaliações por área
- Cálculo automático de pontuação
- Aplicação de penalidades
- Armazenamento de comentários e tempo de execução

### ✅ Rankings em Tempo Real
- Cálculo automático de rankings
- Filtros por turno e turma
- Atualização em tempo real

### ✅ Segurança
- Autenticação JWT
- Controle de acesso por área
- Validação de dados

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev

# Build
pnpm build

# Banco de dados
pnpm db:generate    # Gerar cliente Prisma
pnpm db:push        # Aplicar mudanças ao banco
pnpm db:migrate     # Criar migração
pnpm db:seed        # Inicializar dados
pnpm db:studio      # Interface visual do banco
```

## Próximos Passos

1. Configurar o banco PostgreSQL
2. Executar as migrações
3. Inicializar os dados
4. Testar as APIs
5. Integrar com o frontend

## Notas Importantes

- O sistema está configurado para usar PostgreSQL
- Todas as senhas são hasheadas com bcrypt
- Os tokens JWT expiram em 24 horas
- O administrador (Marcos) tem acesso a todas as funcionalidades
- Os juízes só podem avaliar suas áreas específicas
