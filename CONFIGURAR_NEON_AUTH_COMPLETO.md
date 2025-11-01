# 🔐 Configuração Completa do Neon Auth

## ✅ Informações do seu projeto

Com base nas informações que você forneceu:

- **Project ID**: `943a990c-c185-43e6-84e7-ce3268101e84`
- **API Base URL**: `https://api.stack-auth.com`
- **JWKS URL**: `https://api.stack-auth.com/api/v1/projects/943a990c-c185-43e6-84e7-ce3268101e84/.well-known/jwks.json`

---

## ⚙️ Variáveis de Ambiente Necessárias

### No Vercel (Settings → Environment Variables):

```env
# Stack Auth - Obrigatório
NEXT_PUBLIC_STACK_PROJECT_ID=943a990c-c185-43e6-84e7-ce3268101e84
STACK_SECRET_SERVER_KEY=sua-api-key-secreta-aqui

# Opcional (valores padrão serão usados se não especificar)
NEXT_PUBLIC_STACK_AUTH_URL=https://auth.stack-auth.com
STACK_AUTH_API_URL=https://api.stack-auth.com
```

### Localmente (.env ou .env.local):

```env
# Stack Auth - Obrigatório
NEXT_PUBLIC_STACK_PROJECT_ID=943a990c-c185-43e6-84e7-ce3268101e84
STACK_SECRET_SERVER_KEY=sua-api-key-secreta-aqui

# Opcional
NEXT_PUBLIC_STACK_AUTH_URL=https://auth.stack-auth.com
STACK_AUTH_API_URL=https://api.stack-auth.com
```

---

## 🔑 Onde obter o STACK_SECRET_SERVER_KEY?

1. Acesse o **Neon Dashboard**: https://console.neon.tech
2. Selecione seu projeto
3. Vá em **"Auth"** ou **"Authentication"**
4. Procure por **"API Keys"** ou **"Server Keys"**
5. Copie a **Server Key** ou **Secret Key**

**⚠️ IMPORTANTE**: 
- Esta é uma chave secreta - NUNCA exponha no frontend
- Use `STACK_SECRET_SERVER_KEY` (não `NEXT_PUBLIC_`)
- Mantenha esta chave segura

---

## 🔄 Como funciona o fluxo OAuth

1. **Usuário clica em "Entrar com Google"**
   - Frontend redireciona para: `https://auth.stack-auth.com/oauth/google?redirect_uri=...`

2. **Google autentica o usuário**
   - Google redireciona de volta para o Stack Auth

3. **Stack Auth redireciona para seu callback**
   - URL: `https://seu-app.vercel.app/api/auth/neon-auth/callback?code=...`

4. **Seu servidor troca o code por um token**
   - Chamada para: `https://api.stack-auth.com/api/v1/projects/{projectId}/oauth/callback`
   - Com o token, obtém informações do usuário

5. **Usuário é criado/logado no seu sistema**
   - Token JWT é gerado e salvo
   - Usuário é redirecionado para o dashboard

---

## ✅ Checklist de Configuração

- [x] Project ID obtido: `943a990c-c185-43e6-84e7-ce3268101e84`
- [x] JWKS URL verificada
- [ ] `STACK_SECRET_SERVER_KEY` obtida do Neon Dashboard
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Google OAuth configurado no Google Console
- [ ] Redirect URIs configuradas no Google Console
- [ ] Teste de login funcionando

---

## 🧪 Testar

Após configurar as variáveis de ambiente:

1. Acesse sua aplicação
2. Clique em **"Entrar com Google (Gmail)"**
3. Você deve ser redirecionado para o Google
4. Faça login com sua conta Gmail
5. Você deve ser redirecionado de volta e fazer login automaticamente

---

## 🆘 Troubleshooting

### Erro: "Neon Auth não está configurado"

**Causa**: Variáveis de ambiente não estão configuradas

**Solução**: 
- Verifique se `NEXT_PUBLIC_STACK_PROJECT_ID` está configurado
- Verifique se `STACK_SECRET_SERVER_KEY` está configurado
- Reinicie o servidor/Vercel após adicionar variáveis

### Erro: "Token exchange failed"

**Causa**: API Key incorreta ou endpoint errado

**Solução**:
- Verifique se `STACK_SECRET_SERVER_KEY` está correto
- Verifique se o Project ID está correto
- Verifique os logs do servidor para mais detalhes

### Erro: "User not found" ou "User not synced"

**Causa**: Usuário não existe na tabela `neon_auth.users_sync`

**Solução**:
- Verifique se o schema `neon_auth` existe no banco
- Verifique se a tabela `users_sync` existe
- O usuário precisa fazer login pelo menos uma vez via OAuth para ser sincronizado

### Erro: Redirect URI mismatch

**Causa**: URI de redirect no Google Console não corresponde

**Solução**:
- No Google Console, adicione exatamente: `https://seu-app.vercel.app/api/auth/neon-auth/callback`
- Certifique-se que o protocolo (https) e domínio estão corretos

---

## 📚 Recursos

- [Stack Auth API Documentation](https://stack-auth.com/docs)
- [Neon Auth Guide](https://neon.tech/docs/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)

---

## 🎯 Próximos Passos

1. Obter `STACK_SECRET_SERVER_KEY` do Neon Dashboard
2. Configurar variáveis de ambiente no Vercel
3. Configurar Google OAuth no Google Console
4. Testar o fluxo de login

**Precisa de ajuda?** Verifique os logs e a documentação do Stack Auth!

