# Guia de Setup - Multi-Tenant Platform

Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento completo para a plataforma multi-tenant.

---

## 📋 Pré-requisitos

### Software Necessário

1. **Node.js** (v18 ou superior)
   - Download: https://nodejs.org/
   - Verificar: `node --version`

2. **pnpm** (gerenciador de pacotes)
   - Instalar: `npm install -g pnpm`
   - Verificar: `pnpm --version`

3. **PostgreSQL** (v12 ou superior)
   - Download: https://www.postgresql.org/download/
   - Ou usar Docker: `docker run --name postgres -e POSTGRES_PASSWORD=1234 -p 5432:5432 -d postgres`

### Acesso Necessário

- Git configurado e repositório clonado
- Acesso ao banco de dados PostgreSQL (local ou remoto)
- Editor de código (VS Code recomendado)

---

## 🚀 Passo a Passo

### 1. Clone o Repositório

```bash
git clone https://github.com/MarcosldcC/scorer-sistem.git
cd scorer-sistem
```

### 2. Instale as Dependências

```bash
pnpm install
```

Isso instalará todas as dependências necessárias, incluindo:
- Next.js, React, TypeScript
- Prisma ORM
- shadcn/ui, Tailwind CSS
- E muito mais...

### 3. Configure Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# No Windows
copy .env.example .env

# No Linux/Mac
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
# Database
DATABASE_URL="postgresql://postgres:1234@localhost:5432/robotics_evaluation?schema=public"

# JWT Authentication (IMPORTANTE: Altere em produção!)
JWT_SECRET="sua-chave-secreta-super-segura-aqui"

# NextAuth (opcional)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-nextauth-secreta"
```

**⚠️ IMPORTANTE**: 
- `DATABASE_URL` deve apontar para seu banco PostgreSQL
- `JWT_SECRET` deve ser uma string aleatória segura em produção
- NÃO commite o arquivo `.env` (já está no .gitignore)

### 4. Configure o Banco de Dados

#### Opção A: PostgreSQL Local

1. Instale PostgreSQL localmente
2. Crie o banco de dados:
```sql
CREATE DATABASE robotics_evaluation;
```

3. Configure a `DATABASE_URL` no `.env` com suas credenciais

#### Opção B: PostgreSQL via Docker

```bash
# Iniciar container PostgreSQL
docker run --name robotics-postgres \
  -e POSTGRES_PASSWORD=1234 \
  -e POSTGRES_DB=robotics_evaluation \
  -p 5432:5432 \
  -d postgres

# Ver logs
docker logs -f robotics-postgres
```

#### Opção C: PostgreSQL Cloud (Vercel, Supabase, etc.)

- Use a connection string fornecida pelo serviço
- Substitua `DATABASE_URL` no `.env`

### 5. Gere o Cliente Prisma

```bash
pnpm run db:generate
```

Isso gera o Prisma Client baseado no schema atual.

### 6. Execute a Migração

#### Primeira vez (create migration):

```bash
pnpm run db:migrate
```

Quando solicitado o nome da migração, use:
```
initial_multi_tenant_setup
```

#### Se já existir uma migração (push schema):

```bash
pnpm run db:push
```

**⚠️ NOTA**: `db:push` é mais rápido para desenvolvimento, mas `db:migrate` é melhor para versionamento.

### 7. Popule o Banco com Dados Iniciais

```bash
pnpm run db:seed
```

Isso criará:
- Escola padrão (legado)
- Torneio padrão
- Áreas de avaliação
- Usuários de teste
- Equipes de exemplo

### 8. Inicie o Servidor de Desenvolvimento

```bash
pnpm run dev
```

Abra o navegador em: http://localhost:3000

### 9. Faça Login

Use as credenciais criadas pelo seed:

- **Admin**: marcos@example.com / inicial@123
- **Judge (Programação)**: marina.vitoria@example.com / inicial@123
- **Judge (Pesquisa)**: rafael@example.com / inicial@123
- **Judge (Torcida)**: lucas.gambarini@example.com / inicial@123

---

## 🧪 Testando a Instalação

### 1. Verifique o Banco de Dados

```bash
pnpm run db:studio
```

Isso abre o Prisma Studio em http://localhost:5555
- Verifique se os dados foram criados corretamente
- Explore as tabelas

### 2. Teste as APIs

Você pode usar Postman, Insomnia ou curl:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Marina Vitória","password":"inicial@123"}'

# Listar equipes (necessita token do login acima)
curl http://localhost:3000/api/teams?tournamentId=DEFAULT_TOURNAMENT \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Teste o Frontend

1. Acesse http://localhost:3000
2. Faça login
3. Verifique se consegue:
   - Ver as equipes
   - Fazer avaliações
   - Ver rankings

---

## ⚠️ Problemas Comuns

### Erro: "Can't reach database server"

**Causa**: PostgreSQL não está rodando ou conexão incorreta

**Solução**:
1. Verifique se PostgreSQL está rodando: `psql -U postgres`
2. Confirme a `DATABASE_URL` no `.env`
3. Teste a conexão: `psql "postgresql://postgres:1234@localhost:5432/robotics_evaluation"`

### Erro: "Module '@prisma/client' not found"

**Causa**: Cliente Prisma não foi gerado

**Solução**:
```bash
pnpm run db:generate
```

### Erro: "Table 'xyz' already exists"

**Causa**: Banco já tem tabelas de versão anterior

**Solução**:
```bash
# Resetar banco (CUIDADO: apaga tudo!)
pnpm prisma migrate reset

# Ou deletar e recriar
dropdb robotics_evaluation
createdb robotics_evaluation
pnpm run db:migrate
```

### Erro: "JWT_SECRET is not configured"

**Causa**: Arquivo `.env` não foi criado ou JWT_SECRET está vazio

**Solução**:
1. Crie o arquivo `.env`
2. Configure `JWT_SECRET` com uma string aleatória

### Banco não sincroniza com schema

**Causa**: Schema foi modificado mas migração não foi criada

**Solução**:
```bash
pnpm prisma migrate dev --name nome_da_mudanca
```

---

## 📊 Scripts Úteis

```bash
# Desenvolvimento
pnpm run dev              # Inicia servidor local

# Banco de Dados
pnpm run db:generate      # Gera Prisma Client
pnpm run db:migrate       # Cria/applica migração
pnpm run db:push          # Atualiza schema diretamente
pnpm run db:seed          # Popula com dados iniciais
pnpm run db:studio        # Abre Prisma Studio

# Build & Deploy
pnpm run build            # Build de produção
pnpm run start            # Inicia produção local

# Qualidade
pnpm run lint             # Executa ESLint
```

---

## 🔄 Próximos Passos

Após concluir o setup:

1. ✅ Explore o Prisma Studio (`pnpm run db:studio`)
2. ✅ Teste as APIs no Postman/Insomnia
3. ✅ Faça login e explore a interface
4. 📝 Leia o `SYSTEM_FLOWCHART.md` para entender os fluxos
5. 📚 Consulte `ARCHITECTURE_SUMMARY.md` para detalhes técnicos

---

## 🌐 Deploy em Produção

Para deploy na Vercel (recomendado):

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente na Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - Outras conforme necessário
3. Deploy automático a cada push!

Veja mais em: [DEPLOYMENT.md](./DEPLOYMENT.md) (se existir)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs do terminal
2. Consulte a documentação em `README.md`
3. Verifique o status em `DEVELOPMENT_STATUS.md`
4. Abra uma issue no GitHub

---

**Status**: ✅ Pronto para desenvolvimento!

