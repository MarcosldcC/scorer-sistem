# Plano de Implementação - Plataforma Multi-Tenant

## 🎯 Status Atual

### ✅ Completado

1. **Schema Prisma Atualizado**
   - Modelos multi-tenant (School, Tournament, TournamentArea)
   - Sistema de Templates
   - Roles e permissões
   - Suporte a histórico de avaliações
   - Sync offline (campos no schema)
   - Branding e configurações

2. **Compatibilidade Retroativa**
   - `lib/compatibility.ts` criado
   - Funções para migração gradual
   - Conversão de dados legados

### 🚧 Em Andamento

1. **Geração Cliente Prisma**
   - Necessário rodar `pnpm run db:generate`
   - Criar migração: `pnpm run db:migrate`

### 📋 Próximos Passos

## Fase 1: Base Multi-Tenant (Prioritário)

### 1.1 Preparação do Banco de Dados
```bash
# Gerar cliente Prisma
pnpm run db:generate

# Criar migração
pnpm run db:migrate --name multi_tenant_base

# Popular dados iniciais
pnpm run db:seed
```

### 1.2 Sistema de Autenticação Atualizado
- [ ] Atualizar `lib/auth.ts` para suportar roles
- [ ] Modificar `app/api/auth/login/route.ts` para incluir schoolId
- [ ] Atualizar hooks de autenticação
- [ ] Middleware de verificação de permissões

### 1.3 Gestão de Escolas (Admin Plataforma)
- [ ] CRUD de Schools
- [ ] Listagem de escolas
- [ ] Criação de administrador por escola
- [ ] Ativação/desativação

**Arquivos a criar:**
- `app/api/schools/route.ts`
- `app/admin/schools/page.tsx`
- `components/school-management.tsx`

## Fase 2: Templates e Torneios

### 2.1 Gestão de Templates
- [ ] CRUD de TournamentTemplate
- [ ] Templates oficiais vs customizados
- [ ] Clone de templates

**Arquivos:**
- `app/api/templates/route.ts`
- `app/templates/page.tsx`
- `components/template-manager.tsx`

### 2.2 Gestão de Torneios
- [ ] CRUD de Tournaments
- [ ] Uso de templates para criar torneios
- [ ] Configuração de áreas avaliativas
- [ ] Configuração de ranking (percentual/bruto, pesos, tie-break)

**Arquivos:**
- `app/api/tournaments/route.ts`
- `app/tournaments/page.tsx`
- `components/tournament-wizard.tsx`

### 2.3 Áreas Avaliativas Configuráveis
- [ ] CRUD de TournamentArea
- [ ] Configuração de tipo de pontuação
- [ ] Rubrica configurável
- [ ] Desempenho configurável
- [ ] Misto configurável

**Arquivos:**
- `app/api/tournament-areas/route.ts`
- `components/area-configurator.tsx`

## Fase 3: Sistema de Papéis e Permissões

### 3.1 Roles
- [ ] Platform Admin: gestão global
- [ ] School Admin: gestão do colégio
- [ ] Judge: avaliação
- [ ] Viewer: visualização

### 3.2 Permissões por Contexto
- [ ] Verificação de permissões por ação
- [ ] Filtros automáticos por tenant
- [ ] Limitação de áreas por juiz

**Arquivos:**
- `lib/permissions.ts`
- `lib/middleware.ts`

## Fase 4: Offline-First

### 4.1 Service Worker + Cache API
- [ ] Configurar service worker
- [ ] Cache de dados essenciais
- [ ] Pré-carregamento antes do evento

### 4.2 Fila de Sincronização
- [ ] IndexedDB para fila local
- [ ] Detecção de conexão
- [ ] Sync automático
- [ ] Interface de status offline

**Arquivos:**
- `lib/offline-sync.ts`
- `workers/sync-service-worker.ts`
- `components/offline-indicator.tsx`

### 4.3 Resolução de Conflitos
- [ ] Implementar last-write-wins
- [ ] Versionamento de avaliações
- [ ] Logs de conflitos

## Fase 5: Interface e Branding

### 5.1 i18n (Internacionalização)
- [ ] Configurar next-intl
- [ ] Traduções PT-BR e EN
- [ ] Seletor de idioma

**Arquivos:**
- `i18n/`
- `messages/pt-BR.json`
- `messages/en-US.json`

### 5.2 Tema Zoom Education
- [ ] Cores da marca
- [ ] Tipografia Montserrat/Inter
- [ ] Componentes de UI atualizados
- [ ] Logotipos dinâmicos

**Arquivos:**
- `tailwind.config.ts`
- `app/layout.tsx` (theme provider)
- `components/theme-customizer.tsx`

### 5.3 Acessibilidade
- [ ] ARIA labels
- [ ] Navegação por teclado
- [ ] Alto contraste
- [ ] Screen readers

## Fase 6: Importação/Exportação

### 6.1 CSV/XLSX Equipes
- [ ] Upload de planilhas
- [ ] Validação de dados
- [ ] Importação em massa
- [ ] Tratamento de erros

**Arquivos:**
- `lib/spreadsheet-importer.ts`
- `components/team-import.tsx`

### 6.2 Exportação de Relatórios
- [ ] CSV de rankings
- [ ] XLSX completo
- [ ] PDF de resultados

**Arquivos:**
- `lib/report-generator.ts`
- `components/report-exporter.tsx`

## Fase 7: Reavaliação e Histórico

### 7.1 Histórico de Avaliações
- [ ] Visualizar versões anteriores
- [ ] Comparar avaliações
- [ ] Última versão ativa

### 7.2 Reavaliação
- [ ] Permitir múltiplas versões
- [ ] Marcar versão ativa
- [ ] Notificações

## Ordem Recomendada de Implementação

### Sprint 1 (Semana 1)
1. Gerar cliente Prisma e migrações
2. Sistema de autenticação atualizado
3. CRUD básico de Escolas (Admin Plataforma)

### Sprint 2 (Semana 2)
4. Templates de Torneio
5. CRUD de Torneios
6. Áreas avaliativas configuráveis

### Sprint 3 (Semana 3)
7. Sistema de papéis implementado
8. Permissões por contexto
9. Filtros automáticos por tenant

### Sprint 4 (Semana 4)
10. Offline-first básico
11. Fila de sincronização
12. Resolução de conflitos

### Sprint 5 (Semana 5)
13. i18n PT-BR/EN
14. Tema Zoom Education
15. Acessibilidade básica

### Sprint 6 (Semana 6)
16. Importação de equipes
17. Exportação de relatórios
18. Reavaliação e histórico

## Migração de Dados

### Script de Migração
```typescript
// scripts/migrate-to-multitenant.ts
1. Criar escola padrão
2. Criar torneio padrão
3. Migrar usuários existentes
4. Criar áreas avaliativas padrão
5. Migrar equipes
6. Migrar avaliações
```

## Testes

### Testes Unitários
- [ ] Funções de compatibilidade
- [ ] Cálculo de rankings
- [ ] Resolução de conflitos

### Testes de Integração
- [ ] Fluxo de avaliação offline
- [ ] Sincronização de dados
- [ ] Multi-tenant isolation

### Testes E2E
- [ ] Criar torneio completo
- [ ] Fluxo de avaliação
- [ ] Exportação de relatórios

## Documentação

- [ ] Atualizar README.md
- [ ] Documentação de API
- [ ] Guia de migração
- [ ] Manual de usuário

## Checklist de Qualidade

- [ ] Zero quebras em funcionalidades existentes
- [ ] Testes passando
- [ ] Performance aceitável
- [ ] Acessibilidade validada
- [ ] Segurança revisada
- [ ] Deploy bem-sucedido

## Notas Importantes

1. **Compatibilidade**: Sempre manter compatibilidade com código existente
2. **Rollback**: Ter plano de rollback caso algo quebre
3. **Performance**: Monitorar queries do Prisma
4. **Segurança**: Validar permissões em todas as rotas
5. **UX**: Manter fluxos intuitivos

## Contatos e Recursos

- Cliente: Zoom Education
- Designer: A definir (fornecerá identidade visual)
- Dados de teste: Serão fornecidos 2 contas iniciais

