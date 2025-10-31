# ⚡ Quick Start - Deploy Produção

Guia rápido para fazer o deploy no Vercel SEM precisar testar localmente!

---

## ✅ O que já está pronto:

- ✅ Schema do Prisma completo
- ✅ APIs multi-tenant implementadas
- ✅ Scripts de deploy configurados
- ✅ Build automático no Vercel

---

## 🚀 3 Passos para Produção

### 1️⃣ Criar PostgreSQL Grátis (Neon)

1. Acesse: https://neon.tech
2. **Sign Up** (grátis, com GitHub)
3. **Create Project**:
   - Nome: `scorer-production`
   - Region: `São Paulo` ou `US East`
   - PostgreSQL: Versão mais recente
4. **Create**
5. Vá em **Dashboard** → **Connection Details**
6. Copie a **Connection String**:
   ```
   postgresql://user:pass@host/db?sslmode=require
   ```

### 2️⃣ Configurar Vercel

1. Acesse: https://vercel.com
2. **New Project**
3. Importe repositório: `MarcosldcC/scorer-sistem`
4. Configure:
   - **Framework**: Next.js
   - **Build Command**: `pnpm run vercel-build`
   - **Output**: `.next`
5. **Environment Variables**:
   ```env
   DATABASE_URL=sua-connection-string-do-neon
   JWT_SECRET=use-este-comando-para-gerar:node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   NEXTAUTH_URL=https://seu-app.vercel.app
   ```
6. Clique **Deploy**

### 3️⃣ Popular Banco (Seed)

Após o deploy:

**Opção 1: Via Prisma Studio** (Recomendado)
```bash
# Clone o projeto localmente
git clone https://github.com/MarcosldcC/scorer-sistem.git
cd scorer-sistem

# Configure .env local
DATABASE_URL=sua-connection-string-do-neon
JWT_SECRET=seu-jwt-secret

# Instale e rode seed
pnpm install
pnpm run db:seed
```

**Opção 2: Via SQL direto**
- Copie o conteúdo de `scripts/init-db.ts`
- Execute no console SQL do Neon

**Opção 3: Via API** (depois do primeiro login)
- Use as APIs de administração:
  - `POST /api/schools`
  - `POST /api/tournaments`
  - `POST /api/tournament-areas`
  - etc.

---

## 🎯 Após Deploy

Teste:

1. ✅ Acesse `https://seu-app.vercel.app`
2. ✅ Login funciona
3. ✅ Dashboard carrega
4. ✅ Rankings aparecem

---

## 🆘 Erros Comuns

### Build falha: "Prisma schema"
**Solução**: Certifique-se que `prisma/schema.prisma` está commitado

### Erro 500: "Connection refused"
**Solução**: Verifique se `DATABASE_URL` está correta no Vercel

### Tabelas não criadas
**Solução**: O script `vercel-build` roda a migração automaticamente. 
Se não funcionou, rode manualmente:
```bash
npx prisma migrate deploy
```

### Seed não funciona
**Solução**: Verifique se o script `init-db.ts` está atualizado
- Eu vou atualizar para o novo schema multi-tenant

---

## 📝 Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Configurar domínio customizado
2. ✅ Fazer backup automático do banco
3. ✅ Configurar analytics
4. ✅ Testar todos os fluxos
5. ✅ Criar usuários de teste

---

**Tempo estimado**: 5-10 minutos 🚀

**Precisa de ajuda?** Me chame!

