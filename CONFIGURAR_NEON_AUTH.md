# 🔐 Configurar Neon Auth (Stack Auth)

Este guia explica como configurar o Neon Auth (Stack Auth) para habilitar login com Google (Gmail) e gerenciamento automático de usuários.

---

## 📋 Pré-requisitos

1. Conta no Neon (https://neon.tech)
2. Projeto PostgreSQL já criado no Neon
3. Acesso ao dashboard do Neon

---

## 🚀 Passo 1: Habilitar Neon Auth no Neon

1. Acesse o **Neon Dashboard**: https://console.neon.tech
2. Selecione seu projeto
3. Vá para a seção **"Auth"** ou **"Authentication"**
4. Clique em **"Enable Neon Auth"** ou **"Set up Authentication"**
5. Siga o assistente de configuração

O Neon criará automaticamente:
- Schema `neon_auth` no seu banco de dados
- Tabela `users_sync` para sincronizar usuários
- Configurações necessárias para OAuth

---

## 🔑 Passo 2: Configurar OAuth Providers (Google)

1. No Neon Dashboard, vá em **Auth → OAuth Providers**
2. Clique em **"Add Provider"** → **"Google"**
3. Configure:

### Para Google OAuth:

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie um novo projeto (ou selecione existente)
3. Vá em **"APIs & Services"** → **"Credentials"**
4. Clique em **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure:
   - **Application type**: Web application
   - **Name**: Neon Auth / Seu App Name
   - **Authorized JavaScript origins**:
     ```
     https://seu-app.vercel.app
     https://auth.stack-auth.com  (URL fornecida pelo Neon)
     ```
   - **Authorized redirect URIs**:
     ```
     https://auth.stack-auth.com/oauth/google/callback
     https://seu-app.vercel.app/api/auth/neon-auth/callback
     ```

6. **Copie** o **Client ID** e **Client Secret**
7. Volte ao Neon Dashboard e cole as credenciais

---

## 🔐 Passo 3: Obter Credenciais do Stack Auth

Após configurar o Neon Auth, você precisará:

1. No Neon Dashboard, vá em **Auth → Settings**
2. Copie:
   - **Stack Auth URL** (exemplo: `https://auth.stack-auth.com`)
   - **Stack Auth API Key** (chave secreta)

---

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

### No Vercel:

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione:

```env
# Neon Auth / Stack Auth
STACK_AUTH_URL=https://auth.stack-auth.com
STACK_AUTH_API_KEY=sua-api-key-do-neon-auth
NEXT_PUBLIC_STACK_AUTH_URL=https://auth.stack-auth.com
```

### Localmente (.env):

```env
# Neon Auth / Stack Auth
STACK_AUTH_URL=https://auth.stack-auth.com
STACK_AUTH_API_KEY=sua-api-key-do-neon-auth
NEXT_PUBLIC_STACK_AUTH_URL=https://auth.stack-auth.com
```

**⚠️ IMPORTANTE**: 
- `STACK_AUTH_URL` e `STACK_AUTH_API_KEY` são variáveis do servidor (não públicas)
- `NEXT_PUBLIC_STACK_AUTH_URL` é pública (usada no frontend)

---

## 🔄 Passo 5: Implementar Callback Handler

O callback já está implementado em `app/api/auth/neon-auth/callback/route.ts`, mas você precisa completá-lo:

```typescript
// app/api/auth/neon-auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNeonAuthConfig } from '@/lib/neon-auth'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.redirect('/?error=missing_code')
    }

    const neonConfig = getNeonAuthConfig()
    
    if (!neonConfig.enabled || !neonConfig.stackAuthUrl) {
      return NextResponse.redirect('/?error=auth_not_configured')
    }

    // Exchange code for token
    const tokenResponse = await fetch(`${neonConfig.stackAuthUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${neonConfig.stackAuthApiKey}`
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect('/?error=token_exchange_failed')
    }

    // Get user info from Stack Auth
    const userResponse = await fetch(`${neonConfig.stackAuthUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!user) {
      // Create new user from OAuth
      user = await prisma.user.create({
        data: {
          name: userData.name || userData.email,
          email: userData.email,
          password: '', // No password for OAuth users
          role: 'judge', // Default role
          isActive: true,
          areas: [],
          schoolId: null
        }
      })
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    )

    // Redirect with token
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('token', jwtToken)
    
    // Set token in cookie or redirect to login page with token
    const response = NextResponse.redirect(redirectUrl.toString())
    response.cookies.set('robotics-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect('/?error=oauth_failed')
  }
}
```

---

## 🧪 Passo 6: Testar

1. Acesse sua aplicação
2. Clique em **"Entrar com Google (Gmail)"**
3. Você será redirecionado para o Google
4. Faça login com sua conta Gmail
5. Você será redirecionado de volta para a aplicação
6. Deve fazer login automaticamente

---

## 🔍 Troubleshooting

### Erro: "Neon Auth não está configurado"

**Solução**: 
- Verifique se as variáveis de ambiente estão configuradas
- Certifique-se que `STACK_AUTH_URL` está correto
- Reinicie o servidor/Vercel

### Erro: "OAuth callback failed"

**Solução**:
- Verifique se as **redirect URIs** no Google Console estão corretas
- Verifique se o **Client ID** e **Client Secret** estão corretos no Neon
- Verifique os logs do servidor para mais detalhes

### Usuário não é criado no banco

**Solução**:
- Verifique se a tabela `User` existe no Prisma
- Verifique se o schema `neon_auth.users_sync` existe
- Verifique os logs para erros de criação de usuário

### Redirect URI mismatch

**Solução**:
- Certifique-se que as URIs no Google Console correspondem exatamente:
  - Protocol (http vs https)
  - Domínio completo
  - Caminho exato

---

## 📚 Recursos Adicionais

- [Neon Auth Documentation](https://neon.tech/docs/auth)
- [Stack Auth Documentation](https://stack-auth.com/docs)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

## ✅ Checklist de Configuração

- [ ] Neon Auth habilitado no Neon Dashboard
- [ ] Google OAuth configurado no Google Console
- [ ] Credenciais do Google adicionadas no Neon
- [ ] Variáveis de ambiente configuradas (STACK_AUTH_URL, STACK_AUTH_API_KEY)
- [ ] Callback handler implementado
- [ ] Redirect URIs configuradas corretamente
- [ ] Teste de login funcionando

---

**Precisa de ajuda?** Verifique os logs e a documentação do Neon Auth!

