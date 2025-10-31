# Guia: Criar Database no pgAdmin 4

Siga estes passos para criar o banco de dados necessário para o projeto.

---

## 📋 Passo 1: Abrir pgAdmin 4

1. Abra o pgAdmin 4
2. Conecte-se ao seu servidor PostgreSQL local
   - Se pedir senha, use a senha do seu PostgreSQL

---

## 🗄️ Passo 2: Criar o Database

1. **No painel esquerdo**, clique com botão direito em **"Databases"**
2. Selecione **"Create" → "Database..."**
3. Na janela que abrir, preencha:
   - **Database name**: `robotics_evaluation`
   - **Owner**: Deixe `postgres` (ou seu usuário)
   - Outras opções: Deixe padrão
4. Clique em **"Save"**

✅ **Pronto!** O banco está criado.

---

## 🔍 Passo 3: Verificar Conexão (Opcional)

Para testar se tudo está OK:

1. Clique no database `robotics_evaluation`
2. Expanda **"Schemas" → "public"**
3. Deve estar vazio ainda (normal!)

---

## 📝 Passo 4: Anotar Credenciais

Você vai precisar dessas informações:

**Database**: `robotics_evaluation`  
**Host**: `localhost`  
**Port**: `5432`  
**Username**: `postgres` (ou seu usuário)  
**Password**: `???` (sua senha do PostgreSQL)

---

## ⚠️ Importante

**NÃO precisa criar tabelas manualmente!**

O Prisma vai criar automaticamente quando você rodar:
```bash
pnpm run db:migrate
```

Isso cria TODAS as tabelas, relações, indexes, etc.

---

## ✅ Próximo Passo

Após criar o database, você vai:

1. Criar o arquivo `.env` com as credenciais
2. Rodar a migração: `pnpm run db:migrate`
3. Popular com dados: `pnpm run db:seed`

**Tudo será automático!**

---

## 🆘 Troubleshooting

### Erro: "Database already exists"
**Solução**: Delete o database existente e crie novamente, OU mude o nome no `.env`

### Erro: "Connection refused"
**Solução**: Certifique-se que o PostgreSQL está rodando

### Erro: "password authentication failed"
**Solução**: Verifique a senha no `.env`

---

Pronto! Depois de criar o database, me avise e vou ajudar com o `.env` e a migração! 🚀

