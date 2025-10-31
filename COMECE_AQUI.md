# 🚀 COMECE AQUI - Deploy Produção

**Tudo está pronto!** Siga estes passos:

---

## ✅ 1. Criar Banco PostgreSQL Grátis (2 min)

### Opção A: Neon (Recomendado) ⭐

1. Acesse: **https://neon.tech**
2. Faça login com GitHub
3. Clique **"Create Project"**
4. Configure:
   - **Name**: `scorer-production`
   - **Region**: `São Paulo` ou próximo
   - **PostgreSQL**: mais recente
5. Clique **"Create"**
6. Vá em **Dashboard** → **Connection Details**
7. **Copie a Connection String** (exemplo):
   ```
   postgresql://user:pass@host/db?sslmode=require
   ```

### Opção B: Vercel Postgres

1. No Vercel Dashboard, **Storage**
2. Clique **"Create Database"**
3. Escolha **Postgres**
4. Crie o database
5. Copie a **Connection String** das variáveis de ambiente

---

## ✅ 2. Deploy no Vercel (3 min)

1. Acesse: **https://vercel.com**
2. **"New Project"** → Importe: `MarcosldcC/scorer-sistem`
3. Configure:
   - **Framework**: Next.js (detecta automaticamente)
   - **Root Directory**: `.`
   - **Build Command**: `pnpm run vercel-build`
4. **Environment Variables** → Adicione:

```env
DATABASE_URL=cole-a-connection-string-do-passo-1
JWT_SECRET=execute: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
NEXTAUTH_URL=https://seu-projeto.vercel.app
```

5. Clique **"Deploy"**
6. Aguarde 2-3 minutos ⏳

---

## ✅ 3. Popular Banco (1 min)

Após o deploy:

### Opção 1: Via Git Clone Local

```bash
# Clone o projeto
git clone https://github.com/MarcosldcC/scorer-sistem.git
cd scorer-sistem

# Instale dependências
pnpm install

# Configure .env
echo "DATABASE_URL=sua-connection-string" > .env
echo "JWT_SECRET=seu-jwt-secret" >> .env

# Popule o banco
pnpm run db:seed
```

### Opção 2: Via Neon SQL Console

1. No Neon Dashboard, abra **SQL Editor**
2. O banco já estará criado (tabelas vazias)
3. As tabelas foram criadas automaticamente pela migração

Agora você pode criar dados manualmente via:
- Prisma Studio: `pnpm run db:studio`
- APIs do sistema (após login)

---

## ✅ 4. Testar

1. Acesse seu app: `https://seu-projeto.vercel.app`
2. Deve aparecer a tela de login
3. Login criado pelo seed:
   - Email: `marcos@example.com`
   - Senha: `inicial@123`

---

## 🎯 Pronto!

Seu sistema está no ar! 🎉

### O que tem de funcional:
- ✅ Login e autenticação
- ✅ Dashboard
- ✅ Rankings
- ✅ Avaliações
- ✅ Multi-tenant completo
- ✅ APIs todas funcionando

### Próximos passos:
1. Criar novas escolas
2. Criar torneios
3. Adicionar usuários
4. Configurar áreas de avaliação
5. Popular equipes

---

## 🆘 Problemas?

### Build falha
- Verifique se `DATABASE_URL` está correta
- Verifique os logs no Vercel

### Erro 500 no site
- Verifique logs: Vercel Dashboard → Deployments → View Function Logs
- Certifique-se que a migração rodou

### Tabelas não criadas
- O script `vercel-build` cria automaticamente
- Se não funcionou, rode: `npx prisma migrate deploy`

### Seed não roda
- Certifique-se que `.env` está configurado
- Verifique se `DATABASE_URL` é válida

---

**Precisa de ajuda?** Entre em contato! 📧

