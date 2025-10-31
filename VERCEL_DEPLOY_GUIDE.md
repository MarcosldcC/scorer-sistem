# 🚀 Guia de Deploy no Vercel - Produção

Este guia vai te ajudar a fazer o deploy completo no Vercel com banco PostgreSQL.

---

## 📋 Pré-requisitos

1. Conta no Vercel
2. Conta no PostgreSQL (Neon, Supabase, Vercel Postgres, ou outro)
3. Repositório no GitHub conectado

---

## 🗄️ Passo 1: Configurar PostgreSQL na Produção

### Opção A: Neon (Recomendado - Grátis)

1. Acesse: https://neon.tech
2. Crie uma conta (grátis)
3. Clique em **"Create Project"**
4. Escolha:
   - **Region**: São Paulo (ou próximo)
   - **PostgreSQL**: versão mais recente
   - **Branch**: main
5. Clique em **"Create Project"**
6. Copie a **Connection String**:
   ```
   postgresql://user:password@host/database?sslmode=require
   ```

### Opção B: Vercel Postgres

1. No dashboard do Vercel, vá em **Storage**
2. Clique em **"Create Database"**
3. Escolha **Postgres**
4. Clique em **"Create"**
5. Copie a **Connection String** na aba **Environment Variables**

### Opção C: Supabase

1. Acesse: https://supabase.com
2. Crie uma conta e projeto
3. Em **Settings → Database**, copie a **Connection String**

---

## 🔧 Passo 2: Configurar Repositório no Vercel

1. Acesse: https://vercel.com
2. Clique em **"Add New Project"**
3. Importe o repositório: `MarcosldcC/scorer-sistem`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `pnpm run build`
   - **Output Directory**: .next
   - **Install Command**: `pnpm install`

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

No Vercel, vá em **Settings → Environment Variables** e adicione:

### Variáveis Obrigatórias:

```env
# Database PostgreSQL
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Secret (gere uma chave forte)
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-12345
```

### Variáveis Opcionais:

```env
# NextAuth (pode deixar padrão)
NEXTAUTH_URL=https://seu-projeto.vercel.app
NEXTAUTH_SECRET=seu-nextauth-secret
```

### Como Gerar JWT_SECRET Seguro?

Execute no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 Passo 4: Fazer Deploy

1. No Vercel, clique em **"Deploy"**
2. Aguarde o build (pode demorar 2-3 minutos)
3. Se der erro, veja os logs abaixo

---

## 🔍 Passo 5: Configurar Post-Deploy Hook

Após o primeiro deploy, precisamos rodar a migração:

1. Vá em **Settings → Git**
2. Conecte ao repositório se não estiver
3. No próximo deploy, adicione um script de build:

Edite `package.json` e adicione:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**OU** configure no Vercel:
- Build Command: `prisma generate && prisma migrate deploy && next build`

---

## 🧪 Passo 6: Popular Banco com Dados Iniciais

Após o deploy, você precisa popular o banco com dados iniciais:

### Opção A: Via API Admin (Mais fácil)

1. Acesse seu app: `https://seu-projeto.vercel.app`
2. Faça login com usuário admin
3. Use as APIs de administração para criar escolas, torneios, etc.

### Opção B: Via Script Local

1. Configure localmente:
   ```bash
   # Crie .env.local
   DATABASE_URL=sua-connection-string-do-vercel
   JWT_SECRET=seu-jwt-secret
   ```

2. Rode o seed:
   ```bash
   pnpm run db:seed
   ```

---

## ✅ Passo 7: Verificar Tudo Funcionando

Teste:

1. ✅ Home carrega sem erro
2. ✅ Login funciona
3. ✅ Dashboard aparece
4. ✅ Rankings carregam
5. ✅ Avaliações podem ser criadas

---

## 🆘 Troubleshooting

### Erro: "Prisma schema not found"

**Solução**: Certifique-se que `prisma/schema.prisma` está no repositório

### Erro: "DATABASE_URL not found"

**Solução**: Verifique se a variável está configurada no Vercel

### Erro: "Migration failed"

**Solução**: Rode manualmente:
```bash
npx prisma migrate deploy
```

### Build demora muito

**Solução**: Normal na primeira vez (prisma generate + next build)

### Erro 500 no app

**Solução**: Verifique os logs no Vercel Dashboard → Deployments → View Function Logs

---

## 🎯 Próximos Passos Após Deploy

1. ✅ Configurar domínio customizado (opcional)
2. ✅ Configurar analytics
3. ✅ Configurar SSL (automático)
4. ✅ Testar em produção
5. ✅ Criar backup do banco

---

## 📝 Notas Importantes

- ⚠️ **NUNCA** commite `.env` ou `DATABASE_URL` no Git
- ✅ Sempre use HTTPS em produção
- ✅ Configure backups automáticos do banco
- ✅ Monitore logs do Vercel
- ✅ Use branch previews para testar features

---

**Pronto!** Seu app estará rodando em produção! 🎉

Se precisar de ajuda, me chame!

