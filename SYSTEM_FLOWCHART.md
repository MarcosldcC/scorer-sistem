# Fluxograma Completo do Sistema - Plataforma Multi-Tenant de Torneios

## 🎯 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATAFORMA DE TORNEIOS                   │
│                   ZOOM EDUCATION (SaaS)                     │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌────────┐          ┌─────────┐          ┌─────────┐
    │ESCOLA A│          │ESCOLA B │          │ESCOLA C │
    │(Tenant)│          │(Tenant) │          │(Tenant) │
    └────────┘          └─────────┘          └─────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────┐          ┌──────────┐        ┌──────────┐
  │Torneio 1 │          │Torneio 2 │        │Torneio 3 │
  │Torneio 2 │          │Torneio 4 │        │          │
  └──────────┘          └──────────┘        └──────────┘
```

---

## 👥 Tipos de Contas e Permissões

### 1. ADMINISTRADOR DA PLATAFORMA (Zoom Education)
```
┌──────────────────────────────────────────────────────────┐
│             ADMINISTRADOR DA PLATAFORMA                  │
│                                                          │
│  Responsabilidades:                                      │
│  ✓ Criar/editar/ativar/desativar ESCOLAS               │
│  ✓ Criar/editar TEMPLATES OFICIAIS                      │
│  ✓ Acesso total a todas as escolas                      │
│  ✓ Configurações globais da plataforma                  │
│  ✓ Visualizar métricas e relatórios globais             │
│                                                          │
│  Áreas de Acesso:                                       │
│  • Dashboard Global                                     │
│  • Gestão de Escolas                                    │
│  • Gestão de Templates Oficiais                         │
│  • Relatórios da Plataforma                             │
│  • Configurações Globais                                │
└──────────────────────────────────────────────────────────┘
```

**Fluxograma de Acesso:**
```
Login (email/senha)
    │
    ▼
Verificar Role = "platform_admin"
    │
    ▼
┌─────────────────────────────────────┐
│     DASHBOARD PLATAFORMA            │
├─────────────────────────────────────┤
│ • Lista de Todas as Escolas         │
│ • Estatísticas Globais              │
│ • Templates Oficiais                │
│ • Ações Rápidas                     │
└─────────────────────────────────────┘
    │
    ├──→ ESCOLAS
    │     ├→ Criar Nova Escola
    │     ├→ Editar Escola Existente
    │     ├→ Ativar/Desativar Escola
    │     └→ Ver Detalhes da Escola
    │
    ├──→ TEMPLATES OFICIAIS
    │     ├→ Criar Template
    │     ├→ Editar Template
    │     └→ Ativar/Desativar
    │
    └──→ RELATÓRIOS PLATAFORMA
          ├→ Métricas de Uso
          ├→ Ativações por Período
          └→ Exportar Dados
```

---

### 2. ADMINISTRADOR DO COLÉGIO/ESCOLA
```
┌──────────────────────────────────────────────────────────┐
│           ADMINISTRADOR DO COLÉGIO                       │
│                                                          │
│  Responsabilidades:                                      │
│  ✓ Gerenciar TORNEIOS da própria escola                 │
│  ✓ Criar/editar EQUIPES                                 │
│  ✓ Configurar ÁREAS AVALIATIVAS                         │
│  ✓ Cadastrar JUÍZES e VISUALIZADORES                    │
│  ✓ Atribuir juízes às áreas                             │
│  ✓ Visualizar rankings e relatórios                     │
│                                                          │
│  Limitações:                                             │
│  ✗ Acesso restrito à própria escola                     │
│  ✗ Não vê dados de outras escolas                       │
│  ✗ Não cria templates oficiais                          │
│                                                          │
│  Áreas de Acesso:                                       │
│  • Dashboard da Escola                                  │
│  • Gestão de Torneios                                   │
│  • Gestão de Equipes                                    │
│  • Configuração de Áreas                                │
│  • Gestão de Usuários (Juízes/Visualizadores)           │
│  • Rankings e Relatórios                                │
└──────────────────────────────────────────────────────────┘
```

**Fluxograma de Acesso:**
```
Login (email/senha)
    │
    ▼
Verificar Role = "school_admin" AND schoolId
    │
    ▼
┌─────────────────────────────────────┐
│     DASHBOARD DA ESCOLA             │
├─────────────────────────────────────┤
│ • Meus Torneios                     │
│ • Estatísticas da Escola            │
│ • Ações Rápidas                     │
└─────────────────────────────────────┘
    │
    ├──→ TORNEIOS
    │     ├→ Criar Novo Torneio
    │     │   ├→ Escolher Template (Oficial ou Próprio)
    │     │   ├→ Definir Configurações
    │     │   ├→ Configurar Áreas
    │     │   ├→ Definir Regras de Ranking
    │     │   └→ Salvar
    │     │
    │     ├→ Editar Torneio Existente
    │     ├→ Ativar/Desativar Torneio
    │     └→ Ver Detalhes
    │
    ├──→ EQUIPES
    │     ├→ Adicionar Equipe Individual
    │     ├→ Importar em Massa (CSV/XLSX)
    │     ├→ Editar Equipe
    │     └→ Remover Equipe
    │
    ├──→ ÁREAS AVALIATIVAS
    │     ├→ Criar Área
    │     │   ├→ Tipo: Rubrica/Desempenho/Misto
    │     │   ├→ Configurar Rubrica (se aplicável)
    │     │   ├→ Configurar Desempenho (se aplicável)
    │     │   ├→ Tempo Limite e Ação
    │     │   ├→ Peso da Área
    │     │   └→ Preço (opcional)
    │     │
    │     ├→ Editar Área
    │     └→ Atribuir Juízes
    │
    ├──→ USUÁRIOS
    │     ├→ Cadastrar Juiz
    │     │   ├→ Nome, Email, Senha
    │     │   └→ Atribuir Áreas
    │     │
    │     ├→ Cadastrar Visualizador
    │     │   └→ Nome, Email, Senha
    │     │
    │     └→ Gerenciar Acesso
    │
    └──→ RELATÓRIOS
          ├→ Rankings por Torneio
          ├→ Estatísticas
          └→ Exportar (CSV/XLSX/PDF)
```

**Criação de Torneio - Fluxo Detalhado:**
```
INÍCIO: Criar Novo Torneio
    │
    ▼
Selecionar Template
    ├→ Template Oficial (Zoom)
    └→ Meu Template Personalizado
    │
    ▼
Definir Informações Básicas
    • Nome do Torneio
    • Código único
    • Descrição
    • Datas (Início/Término)
    │
    ▼
Configurar Áreas Avaliativas
    Para cada área:
    ├→ Nome da Área
    ├→ Código
    ├→ Tipo de Pontuação
    │   ├→ RUBRICA
    │   │   └→ Definir critérios e escalas
    │   ├→ DESEMPENHO
    │   │   └→ Definir missões e pontuações
    │   └→ MISTO
    │       └→ Combinar ambos
    │
    ├→ Tempo Limite (opcional)
    ├→ Ação ao Estourar (alert/block)
    ├→ Peso da Área (default: 1.0)
    └→ Preço (opcional)
    │
    ▼
Configurar Sistema de Ranking
    ├→ Método: Percentual OU Bruto
    ├→ Pesos das Áreas
    └→ Critérios de Desempate
    │
    ▼
Configurar Outras Opções
    ├→ Permitir Reavaliação? (Sim/Não)
    └→ Status: Ativo/Inativo
    │
    ▼
Salvar Torneio
    │
    ▼
Próximos Passos Sugeridos:
    • Importar Equipes
    • Cadastrar Juízes
    • Atribuir Juízes às Áreas
    • Publicar Torneio
```

---

### 3. JUÍZ
```
┌──────────────────────────────────────────────────────────┐
│                     JUÍZ                                 │
│                                                          │
│  Responsabilidades:                                      │
│  ✓ Avaliar EQUIPES nas ÁREAS atribuídas                 │
│  ✓ Editar/Reavaliar avaliações                          │
│  ✓ Ver histórico de suas avaliações                     │
│                                                          │
│  Limitações:                                             │
│  ✗ Acesso APENAS às áreas atribuídas                    │
│  ✗ Não vê rankings completos                            │
│  ✗ Não cadastra equipes                                 │
│  ✗ Não vê rubricas de outros juízes                     │
│  ✗ Sem acesso a telas administrativas                   │
│                                                          │
│  Áreas de Acesso:                                       │
│  • Dashboard do Juiz                                     │
│  • Avaliar Equipes (por área atribuída)                 │
│  • Minhas Avaliações                                     │
│  • Rankings (limitado às suas áreas)                    │
└──────────────────────────────────────────────────────────┘
```

**Fluxograma de Acesso:**
```
Login (email/senha)
    │
    ▼
Verificar Role = "judge" AND schoolId
    │
    ▼
Carregar Áreas Atribuídas
    │
    ▼
┌─────────────────────────────────────┐
│     DASHBOARD DO JUÍZ               │
├─────────────────────────────────────┤
│ • Minhas Áreas de Avaliação         │
│ • Progresso por Área                │
│ • Equipes Pendentes                 │
│ • Últimas Avaliações                │
└─────────────────────────────────────┘
    │
    ├──→ AVALIAR EQUIPE
    │     │
    │     Selecionar Torneio
    │          │
    │          Selecionar Área (das suas áreas)
    │               │
    │               Filtrar Equipes
    │                    ├→ Todas
    │                    ├→ Pendentes
    │                    └→ Já Avaliadas
    │                         │
    │                         Selecionar Equipe
    │                              │
    │                              ┌─────────────────────────┐
    │                              │     AVALIAÇÃO           │
    │                              ├─────────────────────────┤
    │                              │ • Timer (se configurado)│
    │                              │ • Rubrica/Desempenho    │
    │                              │ • Penalidades (se houver)│
    │                              │ • Comentários           │
    │                              │ • Preview da Pontuação  │
    │                              └─────────────────────────┘
    │                                   │
    │                                   ├→ SALVAR
    │                                   │     │
    │                                   │     Checar Conexão
    │                                   │          ├→ Online
    │                                   │          │   └→ Salvar no Servidor
    │                                   │          └→ Offline
    │                                   │                └→ Salvar Local + Fila
    │                                   │
    │                                   └→ REAVALIAR
    │                                         (se permitido)
    │                                         Manter Histórico
    │
    ├──→ MINHAS AVALIAÇÕES
    │     ├→ Listar Todas
    │     ├→ Editar Avaliação
    │     └→ Ver Histórico
    │
    └──→ RANKINGS (limitado)
          Só vê rankings das áreas atribuídas
```

**Fluxo de Avaliação Offline:**
```
INÍCIO: Avaliar Equipe
    │
    ▼
Verificar Conexão
    │
    ├──→ ONLINE ────────────────────────┐
    │     │                              │
    │     Carregar Equipes do Servidor   │
    │     │                              │
    │     Exibir Formulário de Avaliação │
    │     │                              │
    │     Preencher Avaliação            │
    │     │                              │
    │     Clicar em "Salvar"             │
    │     │                              │
    │     Enviar para Servidor           │
    │     │                              │
    │     Sucesso                        │
    │     │                              │
    │     └→ Atualizar Dashboard         │
    │                                    │
    └──→ OFFLINE ────────────────────────┤
          │                              │
          Carregar Cache Local           │
          │                              │
          Exibir Indicador Offline       │
          │                              │
          Exibir Formulário de Avaliação │
          │                              │
          Preencher Avaliação            │
          │                              │
          Clicar em "Salvar"             │
          │                              │
          Salvar em IndexedDB ───────────┼─→ Mesmo Comportamento
          │                              │
          Adicionar à Fila de Sync       │
          │                              │
          Exibir "Salvo Localmente"      │
          │                              │
          └→ Aguardar Reconexão          │
                │                        │
                Detectar Conexão         │
                    │                    │
                    Processar Fila       │
                    │                    │
                    Tentar Sincronizar   │
                    │                    │
                    ├→ Sucesso           │
                    │   └→ Remover Fila  │
                    │                    │
                    └→ Conflito          │
                          │              │
                          Last-Write-Wins┘
```

---

### 4. VISUALIZADOR
```
┌──────────────────────────────────────────────────────────┐
│                  VISUALIZADOR                            │
│                                                          │
│  Responsabilidades:                                      │
│  ✓ Visualizar RANKINGS                                  │
│  ✓ Acessar RELATÓRIOS                                   │
│  ✓ Exportar dados                                       │
│                                                          │
│  Limitações:                                             │
│  ✗ NÃO vê rubricas detalhadas dos juízes                │
│  ✗ NÃO vê formulários de avaliação                      │
│  ✗ NÃO cadastra dados                                   │
│  ✗ NÃO avalia equipes                                   │
│  ✗ SEM acesso administrativo                            │
│                                                          │
│  Áreas de Acesso:                                       │
│  • Rankings Públicos                                    │
│  • Relatórios de Resultados                             │
│  • Exportação de Dados                                  │
└──────────────────────────────────────────────────────────┘
```

**Fluxograma de Acesso:**
```
Login (email/senha)
    │
    ▼
Verificar Role = "viewer" AND schoolId
    │
    ▼
┌─────────────────────────────────────┐
│     DASHBOARD VISUALIZADOR          │
├─────────────────────────────────────┤
│ • Torneios Disponíveis              │
│ • Rankings Atuais                   │
│ • Links Rápidos                     │
└─────────────────────────────────────┘
    │
    ├──→ RANKINGS
    │     │
    │     Selecionar Torneio
    │          │
    │          ┌─────────────────────────┐
    │          │   RANKING FILTRADO      │
    │          ├─────────────────────────┤
    │          │ • Filtros:              │
    │          │   - Turno               │
    │          │   - Série               │
    │          │   - Divisão             │
    │          │                         │
    │          │ • Tabela de Posições    │
    │          │ • Pontuações por Área   │
    │          │ • Percentual Geral      │
    │          │                         │
    │          │ ✗ SEM detalhes de rubrica│
    │          │ ✗ SEM nome dos juízes   │
    │          └─────────────────────────┘
    │
    ├──→ RELATÓRIOS
    │     ├→ Estatísticas Gerais
    │     ├→ Médias por Área
    │     ├→ Distribuição de Pontos
    │     └→ Gráficos e Visualizações
    │
    └──→ EXPORTAR
          ├→ CSV
          ├→ XLSX
          └→ PDF
```

---

## 🔄 Fluxo Completo de Uso - Exemplo Prático

### Cenário: Torneio de Robótica da Escola XYZ

```
═══════════════════════════════════════════════════════════════

FASE 1: CONFIGURAÇÃO (Admin da Plataforma)
────────────────────────────────────────────────────────────────
1. Login como Admin Plataforma
2. Criar Escola "XYZ Robotics"
3. Definir Admin da Escola
   │
   ▼
FASE 2: PREPARAÇÃO (Admin da Escola)
────────────────────────────────────────────────────────────────
4. Login como Admin da Escola XYZ
5. Criar Novo Torneio
   ├→ Escolher Template "Robótica Educacional"
   ├→ Nome: "Torneio Anual 2024"
   ├→ Configurar 3 Áreas:
   │   ├→ Área 1: Programação (Desempenho)
   │   ├→ Área 2: Pesquisa (Rubrica)
   │   └→ Área 3: Torcida (Rubrica)
   ├→ Definir Pesos: 1.5, 1.0, 0.8
   └→ Critério Desempate: Total → Programação
   │
6. Importar Equipes (CSV)
   ├→ 30 equipes
   ├→ Turnos: Manhã/Tarde
   └→ Séries: 2º a 5º
   │
7. Cadastrar Juízes
   ├→ Juiz A: Áreas [Programação]
   ├→ Juiz B: Áreas [Pesquisa]
   ├→ Juiz C: Áreas [Torcida]
   └→ Juiz D: Áreas [Programação, Pesquisa]
   │
8. Atribuir Juízes às Áreas
   │
9. Publicar Torneio
   │
   ▼
FASE 3: AVALIAÇÃO (Juízes)
────────────────────────────────────────────────────────────────
10. Juízes fazem login
11. Cada Juiz acessa:
    ├→ Dashboard com suas áreas
    ├→ Lista de equipes pendentes
    └→ Progresso de avaliação
    │
12. Juiz avalia equipes offline
    ├→ Preenche rubrica/desempenho
    ├→ Salva localmente (offline)
    └→ Sincroniza quando online
    │
13. Equipe concorrente é avaliada
    │
    ▼
FASE 4: ACERTES (Admin da Escola)
────────────────────────────────────────────────────────────────
14. Admin verifica avaliações
15. Detecta problema em avaliação
16. Permite reavaliação (se configurado)
    ├→ Juiz reavalia
    ├→ Histórico é mantido
    └→ Versão mais recente vale
    │
    ▼
FASE 5: RESULTADOS (Todas as Contas)
────────────────────────────────────────────────────────────────
17. Rankings são calculados automaticamente
    ├→ Por Percentual OU Bruto (conforme config)
    ├→ Aplica pesos das áreas
    └→ Resolve empates
    │
18. Visualizadores acessam resultados
    ├→ Veem rankings completos
    ├→ Filtram por turno/série
    └→ Exportam relatórios
    │
19. Admin exporta relatório final (PDF)
    │
20. Torneio finalizado ✅

═══════════════════════════════════════════════════════════════
```

---

## 🔐 Sistema de Permissões Detalhado

```
┌────────────────────────────────────────────────────────────┐
│              MATRIZ DE PERMISSÕES                         │
├────────────────────────────────────────────────────────────┤
│ AÇÃO                    │PA│SA│JU│VI│                      │
├────────────────────────────────────────────────────────────┤
│ Criar Escola            │✓ │✗ │✗ │✗ │ PA = Platform Admin  │
│ Editar Escola           │✓ │○ │✗ │✗ │ SA = School Admin   │
│ Visualizar Todas Escolas│✓ │✗ │✗ │✗ │ JU = Judge          │
├────────────────────────────────────────────────────────────┤
│ Criar Torneio           │✓ │✓ │✗ │✗ │ VI = Viewer         │
│ Editar Torneio          │✓ │✓ │✗ │✗ │ ○ = Próprio apenas  │
│ Configurar Áreas        │✓ │✓ │✗ │✗ │                      │
├────────────────────────────────────────────────────────────┤
│ Criar Template Oficial  │✓ │✗ │✗ │✗ │                      │
│ Criar Template Próprio  │✗ │✓ │✗ │✗ │                      │
├────────────────────────────────────────────────────────────┤
│ Importar Equipes        │✓ │✓ │✗ │✗ │                      │
│ Editar Equipes          │✓ │✓ │✗ │✗ │                      │
├────────────────────────────────────────────────────────────┤
│ Cadastrar Juízes        │✓ │✓ │✗ │✗ │                      │
│ Cadastrar Visualizadores│✓ │✓ │✗ │✗ │                      │
├────────────────────────────────────────────────────────────┤
│ Avaliar Equipes         │✓ │✓ │○ │✗ │ ○ = Áreas atribuídas│
│ Editar Avaliações       │✓ │✓ │○ │✗ │                      │
│ Reavaliar               │✓ │✓ │○ │✗ │                      │
├────────────────────────────────────────────────────────────┤
│ Ver Rankings Completos  │✓ │✓ │○ │○ │ ○ = Limitado        │
│ Ver Rubricas Detalhadas │✓ │✓ │○ │✗ │                      │
│ Ver Relatórios          │✓ │✓ │✗ │✓ │                      │
├────────────────────────────────────────────────────────────┤
│ Exportar CSV/XLSX       │✓ │✓ │✗ │✓ │                      │
│ Exportar PDF            │✓ │✓ │✗ │✓ │                      │
└────────────────────────────────────────────────────────────┘
```

---

## 🌐 Fluxo Offline-First

```
┌──────────────────────────────────────────────────────────────┐
│                  CICLO OFFLINE-FIRST                        │
└──────────────────────────────────────────────────────────────┘

PREPARAÇÃO (Online - Antes do Evento)
────────────────────────────────────────────────────────────────
1. Login e Autenticação
2. Pré-carregar Dados Essenciais
   ├→ Informações do Torneio
   ├→ Lista de Equipes
   ├→ Áreas Configuradas
   ├→ Rubricas/Formas de Avaliação
   └→ Metadados dos Usuários
3. Cache Local (IndexedDB)
   │
   ▼
OPERACIONAL (Offline - Durante Evento)
────────────────────────────────────────────────────────────────
4. Sistema Funciona Completamente Offline
   ├→ Login (autenticação pré-cacheada)
   ├→ Listar Equipes (do cache)
   ├→ Abrir Formulário de Avaliação
   ├→ Preencher Avaliação
   ├→ Salvar Localmente (IndexedDB)
   └→ Adicionar à Fila de Sincronização
   │
   ▼
SINCRONIZAÇÃO (Online - Após Evento)
────────────────────────────────────────────────────────────────
5. Detectar Reconexão
6. Verificar Fila de Pendências
7. Para Cada Item na Fila:
   ├→ Tentar Sincronizar
   ├→ Verificar Conflitos
   │   ├→ Sem Conflito: ✓ Sucesso
   │   └→ Com Conflito: Last-Write-Wins
   └→ Atualizar Status
8. Marcar como Sincronizado
9. Limpar Fila
   │
   ▼
FINALIZAÇÃO (Online - Ao Final)
────────────────────────────────────────────────────────────────
10. Forçar Sincronização Final
11. Validar Dados
12. Gerar Rankings Atualizados
```

---

## 📊 Sistema de Ranking

```
┌────────────────────────────────────────────────────────────┐
│              CÁLCULO DE RANKING                           │
└────────────────────────────────────────────────────────────┘

Para cada Equipe:
    │
    ├──→ MÉTODO: PERCENTUAL
    │     │
    │     Para cada Área Avaliada:
    │     ├→ Calcular % da Área: (Score / Max) × 100
    │     └→ Armazenar Percentual
    │     │
    │     Média Ponderada dos Percentuais:
    │     └→ Σ(Percentual × Peso) / Σ(Pesos)
    │
    └──→ MÉTODO: BRUTO
          │
          Para cada Área Avaliada:
          ├→ Pegar Score Bruto
          └→ Aplicar Peso
          │
          Soma Total Ponderada:
          └→ Σ(Score × Peso)
    │
    ▼
Calcular Pontuação Final
    │
    ▼
Ordenar Equipes
    ├→ Por Pontuação Final (decrescente)
    │
    ├→ DESEMPATE (se necessário):
    │   ├→ Critério 1
    │   ├→ Critério 2
    │   └→ Critério N
    │
    ▼
Atribuir Posições (1º, 2º, 3º, ...)
    │
    ▼
Exibir Ranking Final
```

**Exemplo de Desempate:**
```
┌───────────────────────────────────────────────┐
│ Configuração:                                 │
│ • Método: Percentual                          │
│ • Peso Programação: 1.5                       │
│ • Peso Pesquisa: 1.0                          │
│ • Peso Torcida: 0.8                           │
│ • Desempate: Total → Programação → Tempo     │
└───────────────────────────────────────────────┘

Equipe A: 80% Prog, 90% Pesq, 70% Tor
Equipe B: 85% Prog, 80% Pesq, 75% Tor

Cálculo:
A = (80×1.5 + 90×1.0 + 70×0.8) / (1.5+1.0+0.8)
  = (120 + 90 + 56) / 3.3 = 266 / 3.3 = 80.6%

B = (85×1.5 + 80×1.0 + 75×0.8) / (1.5+1.0+0.8)
  = (127.5 + 80 + 60) / 3.3 = 267.5 / 3.3 = 81.1%

Resultado: B > A (B fica em 1º)

Se empate exato:
→ Desempate por Total de Pontos Brutos
→ Se ainda empate: Por Pontuação em Programação
→ Se ainda empate: Por Tempo de Execução
```

---

## 🔄 Fluxo de Reavaliação

```
┌────────────────────────────────────────────────────────────┐
│              REAVALIAÇÃO DE EQUIPES                       │
└────────────────────────────────────────────────────────────┘

INÍCIO: Juiz/Admin solicita Reavaliação
    │
    ▼
Verificar Configuração do Torneio
    │
    ├──→ Reavaliação BLOQUEADA
    │     └→ Exibir: "Reavaliação não permitida" ❌
    │
    └──→ Reavaliação PERMITIDA
          │
          Verificar Permissão do Usuário
          │
          ├──→ SEM Permissão
          │     └→ Exibir: "Acesso negado" ❌
          │
          └──→ COM Permissão
                │
                ├──→ Buscar Avaliação Atual
                │
                ├──→ Criar NOVA Avaliação
                │     ├→ Vinculada à anterior (parentEvaluationId)
                │     ├→ Mesma Equipe e Área
                │     ├→ Novo Timestamp
                │     └→ Versão +1
                │
                ├──→ Exibir Formulário
                │     ├→ Dados da Avaliação Anterior (read-only)
                │     └→ Formulário para Nova Avaliação
                │
                ├──→ Preencher Nova Avaliação
                │
                ├──→ Salvar Nova Versão
                │
                ├──→ Manter Histórico
                │     ├→ Versão Anterior: Preservada
                │     └→ Nova Versão: Ativa
                │
                ├──→ Atualizar Ranking
                │     └→ Usar apenas Versão Mais Recente
                │
                └──→ Exibir Confirmação
                      └→ "Reavaliação concluída ✓"

VISUALIZAÇÃO DE HISTÓRICO:
┌─────────────────────────────────────────────────┐
│ Avaliação da Equipe XYZ - Área: Programação   │
├─────────────────────────────────────────────────┤
│                                                 │
│ VERSÃO ATUAL (Usada no Ranking)                │
│ ┌───────────────────────────────────────────┐ │
│ │ Data: 2024-03-15 14:30                   │ │
│ │ Pontuação: 150/225 (66.7%)               │ │
│ │ Avaliado por: Juiz A                     │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ ═══════════════════════════════════════════     │
│                                                 │
│ VERSÕES ANTERIORES                              │
│ ┌───────────────────────────────────────────┐ │
│ │ VERSÃO 1 - 2024-03-15 10:00              │ │
│ │ Pontuação: 120/225 (53.3%)               │ │
│ │ Avaliado por: Juiz B                     │ │
│ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Personalização e Branding

```
┌────────────────────────────────────────────────────────────┐
│           SISTEMA DE BRANDING POR ESCOLA                  │
└────────────────────────────────────────────────────────────┘

Configurações Disponíveis:
├──→ CORES
│   ├→ Cor Primária (Azul-marinho Zoom: #0B2341)
│   ├→ Cor Secundária (Azul-claro Zoom: #2D9CDB)
│   ├→ Cor de Energia (Amarelo Zoom: #FFC845)
│   └→ Cor de Fundo
│
├──→ TIPOGRAFIA
│   ├→ Títulos: Montserrat Bold
│   └→ Textos: Inter Regular / Open Sans Regular
│
├──→ LOGOTIPO
│   ├→ Upload de Logo da Escola
│   └→ Posicionamento (Header/Sidebar)
│
├──→ IDIOMA
│   ├→ Português (Brasil) - Padrão
│   └→ Inglês (United States)
│
└──→ ELEMENTOS VISUAIS
    ├→ Ícones customizados
    ├→ Formas geométricas
    └→ Saturação de cores

EXEMPLO: Escola XYZ quer usar suas cores
────────────────────────────────────────────────────────────
1. Admin da Escola acessa: Configurações → Branding
2. Define:
   ├→ Cor Primária: #FF5722 (Laranja)
   ├→ Logotipo: xyz-logo.png
   └→ Idioma: pt-BR
3. Salva configurações
4. Sistema aplica automaticamente:
   ├→ Tudo que era azul vira laranja
   ├→ Logo aparece no header
   └→ Interface em português
```

---

## 📦 Estrutura de Dados JSON

### Template Config
```json
{
  "areas": [
    {
      "name": "Programação",
      "code": "programming",
      "scoringType": "performance",
      "performanceConfig": {
        "missions": [
          {"id": "mission1", "name": "Missão 1", "points": 10, "quantity": 5},
          {"id": "mission2", "name": "Missão 2", "points": 15, "quantity": 3}
        ],
        "penalties": [
          {"type": "robot_touch", "points": -5}
        ]
      },
      "timeLimit": 300,
      "timeAction": "block"
    },
    {
      "name": "Pesquisa",
      "code": "research",
      "scoringType": "rubric",
      "rubricConfig": {
        "criteria": [
          {"id": "criterion1", "name": "Clareza", "maxScore": 10, "options": [0, 3, 5, 7, 10]}
        ]
      }
    }
  ],
  "ranking": {
    "method": "percentage",
    "weights": {"programming": 1.5, "research": 1.0},
    "tieBreak": ["totalScore", "programming", "time"]
  }
}
```

### Team Metadata
```json
{
  "grade": "4",
  "shift": "morning",
  "division": "A",
  "category": "Novos",
  "customField": "valor personalizado"
}
```

### Branding Config
```json
{
  "colors": {
    "primary": "#0B2341",
    "secondary": "#2D9CDB",
    "accent": "#FFC845",
    "background": "#FFFFFF"
  },
  "logo": "/logos/x school/logo.png",
  "logoPosition": "header"
}
```

---

## 🚦 Indicadores e Status

```
┌────────────────────────────────────────────────────────────┐
│              INDICADORES DE SISTEMA                       │
└────────────────────────────────────────────────────────────┘

OFFLINE/ONLINE
├─ 🔴 Offline (vermelho)
│  └─ "Sem conexão - Trabalhando offline"
├─ 🟡 Sincronizando (amarelo)
│  └─ "Sincronizando 3 itens..."
└─ 🟢 Online (verde)
   └─ "Tudo sincronizado"

AVALIAÇÃO
├─ ✅ Concluída
├─ 🟡 Em Progresso
├─ ⏱️ No Tempo
├─ ⚠️ Tempo Esgotado (Alerta)
└─ 🚫 Bloqueada (Tempo Estourado)

EQUIPES
├─ 📊 Total: X equipes
├─ ✅ Avaliadas: Y equipes
├─ ⏳ Pendentes: Z equipes
└─ 📈 Progresso: %%

TORNEIO
├─ 🟢 Ativo
├─ ⏸️ Pausado
├─ 📝 Rascunho
└─ 🏁 Finalizado
```

---

## ✅ RESUMO DO FLUXOGRAMA

```
PLATAFORMA COMPLETA
├─ 4 TIPOS DE CONTA
│  ├─ Platform Admin
│  ├─ School Admin
│  ├─ Judge
│  └─ Viewer
│
├─ MULTI-TENANT
│  ├─ Escolas Isoladas
│  ├─ Torneios por Escola
│  └─ Dados Segregados
│
├─ TEMPLATES
│  ├─ Oficiais (Zoom)
│  └─ Personalizados (Escolas)
│
├─ ÁREAS FLEXÍVEIS
│  ├─ Rubrica
│  ├─ Desempenho
│  └─ Misto
│
├─ OFFLINE-FIRST
│  ├─ Cache Local
│  ├─ Fila de Sync
│  └─ Last-Write-Wins
│
├─ RANKINGS
│  ├─ Percentual/Bruto
│  ├─ Pesos
│  └─ Tie-Break
│
├─ REAVALIAÇÃO
│  ├─ Histórico
│  └─ Última Versão
│
├─ BRANDING
│  ├─ Cores
│  ├─ Logos
│  └─ Idiomas
│
└─ I/O
   ├─ Importação CSV/XLSX
   └─ Exportação CSV/XLSX/PDF
```

---

## 🔒 PONTOS CRÍTICOS E DECISÕES ARQUITETURAIS ADICIONAIS

### 1. CICLO DE VIDA: ESTADOS DE ESCOLA E TORNEIO

#### Estados da ESCOLA
```
┌────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA ESCOLA                    │
├────────────────────────────────────────────────────────────┤
│  DRAFT → ACTIVE → SUSPENDED → ARCHIVED                    │
│                                                           │
│  DRAFT:                                                    │
│  • Criada mas não operacional                             │
│  • Admin não pode criar torneios ainda                    │
│  • Aguardando configuração inicial                        │
│                                                           │
│  ACTIVE:                                                   │
│  • Escola operacional                                     │
│  • Pode criar torneios                                    │
│  • Usuários ativos                                        │
│  • Acesso normal                                          │
│                                                           │
│  SUSPENDED:                                                │
│  • Torneios pausados                                      │
│  • Usuários não podem avaliar                             │
│  • Dados preservados                                      │
│  • Admin pode visualizar histórico                        │
│  • Reativação por Admin Plataforma                        │
│                                                           │
│  ARCHIVED:                                                 │
│  • Escola desativada permanentemente                      │
│  • Sem novos torneios                                     │
│  • Dados read-only                                        │
│  • Usuários desativados                                   │
└────────────────────────────────────────────────────────────┘
```

#### Estados do TORNEIO
```
┌────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA TORNEIO                     │
├────────────────────────────────────────────────────────────┤
│  DRAFT → READY → PUBLISHED → PAUSED → FINISHED → ARCHIVED │
│                                                           │
│  DRAFT:                                                    │
│  • Em configuração                                        │
│  • Não visível para juízes                                │
│  • Admin pode editar tudo                                 │
│  • Sem equipes ou áreas publicadas                        │
│                                                           │
│  READY:                                                    │
│  • Configuração completa                                  │
│  • Equipes importadas                                     │
│  • Juízes atribuídos                                      │
│  • Pronto para publicação                                 │
│  • Admin ainda pode ajustar                               │
│                                                           │
│  PUBLISHED (ATIVO):                                        │
│  • Visível para juízes e visualizadores                   │
│  • Avaliações podem começar                               │
│  • Configuração TRAVADA (lock)                            │
│  • Reavaliação permitida (se configurado)                 │
│  • Rankings calculados em tempo real                      │
│                                                           │
│  PAUSED:                                                   │
│  • Torneio temporariamente pausado                        │
│  • Juízes não podem avaliar (novas)                       │
│  • Avaliações existentes preservadas                      │
│  • Rankings congelados no momento da pausa                │
│  • Admin pode revisar/reavaliar                           │
│                                                           │
│  FINISHED:                                                 │
│  • Torneio concluído                                      │
│  • Último snapshot salvo                                  │
│  • Rankings finais congelados                             │
│  • Nenhuma nova avaliação permitida                       │
│  • Apenas visualização e relatórios                       │
│  • Reabertura possível (para ajustes)                     │
│                                                           │
│  ARCHIVED:                                                 │
│  • Read-only completo                                     │
│  • Relatórios históricos                                  │
│  • Sem edições possíveis                                  │
└────────────────────────────────────────────────────────────┘
```

**Transições Permitidas:**
```
DRAFT → READY → PUBLISHED ↔ PAUSED → FINISHED → ARCHIVED
  ↑                            ↓
  └────────────────────────────┘
   (Reabertura para ajustes - até 30 dias após FINISHED)
```

**LOCK DE CONFIGURAÇÃO:** Ao PUBLICAR um torneio, a configuração fica bloqueada. Apenas Admin da Plataforma pode desbloquear em casos excepcionais.

---

### 2. GOVERNANÇA DE TEMPLATES

```
┌────────────────────────────────────────────────────────────┐
│              GOVERNANÇA DE TEMPLATES                       │
└────────────────────────────────────────────────────────────┘

REGRAS FUNDAMENTAIS:
1. Template Oficial (Zoom) → LOCKADO
2. Escola SEMPRE trabalha com CÓPIA
3. Versionamento automático
4. Lock ao aplicar em torneio publicado

FLUXO:
──────────────────────────────────────────────────────────────
Admin Plataforma cria TEMPLATE OFICIAL
    │
    ├→ Version: v1.0.0
    ├→ isOfficial: true
    └→ Edições futuras → v1.0.1, v1.1.0, etc.
    │
    │
Admin Escola quer usar template oficial
    │
    ▼
ESCOLA SEMPRE CRIA CÓPIA (FORK)
    │
    ├→ Template v1.0.0 clonado
    ├→ Cria: "Meu Template XYZ v1.0.0"
    ├→ isOfficial: false
    └→ schoolId: escola específica
    │
    │
Admin Escola edita seu template
    │
    ├→ Version: v1.0.1 (auto-incremento)
    └→ Histórico preservado
    │
    │
Admin Escola cria torneio baseado no template
    │
    ▼
CONFIG DO TEMPLATE É LOCKADA NO TORNEIO
    │
    ├→ Torneio armazena snapshot da config v1.0.1
    ├→ Futuras edições do template NÃO afetam torneio
    └→ Garantia de consistência
```

**Versionamento de Template:**
```json
{
  "id": "tmpl_123",
  "name": "Robótica Educacional 2024",
  "version": "1.2.3",
  "semanticVersioning": true,
  "changelog": [
    {
      "version": "1.2.3",
      "date": "2024-03-15",
      "changes": ["Adicionada área de Torcida", "Ajuste de pesos"]
    }
  ],
  "appliedInTournaments": ["tourn_1", "tourn_5"],
  "locked": false
}
```

---

### 3. GESTÃO DE USUÁRIOS

```
┌────────────────────────────────────────────────────────────┐
│              ONBOARDING E GESTÃO DE USUÁRIOS              │
└────────────────────────────────────────────────────────────┘

CRIAÇÃO DE USUÁRIO:
──────────────────────────────────────────────────────────────
1. Admin Plataforma/Escola cria usuário
2. Sistema gera SENHA TEMPORÁRIA (8 caracteres aleatórios)
3. Email enviado com:
   ├→ Login (email)
   ├→ Senha temporária
   ├→ Link de primeiro acesso
   └→ Instruções
4. Primeiro acesso:
   ├→ Usuário DEVE trocar senha
   ├→ Pode adicionar foto de perfil
   └→ Confirmar termos
5. Usuário ativo

GESTÃO:
──────────────────────────────────────────────────────────────
Admin pode:
├→ Resetar senha (gera nova temporária)
├→ Desativar conta (não deletar)
├→ Reativar conta
├→ Alterar role
├→ Alterar áreas (para juízes)
└→ Remover usuário (soft delete)

SEGURANÇA:
──────────────────────────────────────────────────────────────
├→ Senha temporária expira em 7 dias
├→ Senhas válidas: min 8 caracteres
├→ Sessão expira em 8 horas inatividade
├→ Multi-dispositivo permitido
└→ Logout automático em caso de suspeita

CONVITE POR EMAIL (Futuro):
──────────────────────────────────────────────────────────────
Admin envia convite → Usuário aceita → Define própria senha
```

---

### 4. MULTI-JUIZ E AGREGAÇÃO

```
┌────────────────────────────────────────────────────────────┐
│              MULTI-JUIZ POR ÁREA/PERÍODO                  │
└────────────────────────────────────────────────────────────┘

PROBLEMA:
- Uma equipe precisa ser avaliada por MÚLTIPLOS juízes
- Como agregar as notas?

SOLUÇÃO: CONFIGURÁVEL POR ÁREA
──────────────────────────────────────────────────────────────
Admin configura, por área:
├→ "Método de Agregação"
│   ├→ Última avaliação vence
│   ├→ Média aritmética
│   ├→ Mediana
│   ├→ Melhor nota
│   ├→ Pior nota
│   └→ Remover outliers (top/bottom)
│
└→ Aplicar automaticamente no ranking

EXEMPLO: Área "Torcida" com 3 juízes
──────────────────────────────────────────────────────────────
Equipe ABC avaliada por:
├→ Juiz 1: 8.5/10
├→ Juiz 2: 9.0/10
└→ Juiz 3: 7.5/10

Agregação = MÉDIA:
Resultado = (8.5 + 9.0 + 7.5) / 3 = 8.33/10

Agregação = MEDIANA:
Resultado = 8.5/10

IMPORTANTE:
- Cada juiz mantém avaliação individual
- Histórico preservado
- Admin pode ver todas as notas
- Visualizador vê apenas resultado agregado
```

---

### 5. RODADAS/PARTIDAS (OPCIONAL)

```
┌────────────────────────────────────────────────────────────┐
│              SISTEMA DE RODADAS                           │
└────────────────────────────────────────────────────────────┘

Quando um torneio tem MÚLTIPLAS TENTATIVAS por área:

EXEMPLO: Torneio com 3 rodadas de Programação
──────────────────────────────────────────────────────────────
Cada equipe compete 3 vezes
├→ Rodada 1: Resultado A
├→ Rodada 2: Resultado B
└→ Rodada 3: Resultado C

Agregação por rodada:
├→ Melhor nota das 3
├→ Média das 3
├→ Soma das 3
└→ Primeiras N rodadas

CONFIGURAÇÃO:
──────────────────────────────────────────────────────────────
Admin configura por área:
├→ "Permitir múltiplas rodadas" (Sim/Não)
├→ Número de rodadas (1-10)
├→ Tempo por rodada
└→ Agregação final (melhor/média/soma)

FLUXO DO JUIZ:
──────────────────────────────────────────────────────────────
1. Selecionar equipe
2. Escolher rodada (1, 2, 3...)
3. Avaliar
4. Salvar
5. Equipe pode ter múltiplas avaliações da mesma área
6. Ranking usa agregação configurada

RANKING CALCULA:
──────────────────────────────────────────────────────────────
Para cada equipe:
├→ Área X, Rodada 1: 80 pontos
├→ Área X, Rodada 2: 90 pontos
├→ Área X, Rodada 3: 85 pontos
│
└→ Se agregação = "melhor":
   Resultado final = 90 pontos

Se agregação = "média":
Resultado final = (80+90+85)/3 = 85 pontos
```

**MODELO DE DADOS:**
```json
{
  "evaluationId": "eval_123",
  "round": 1,
  "maxRounds": 3,
  "aggregationMethod": "best"
}
```

---

### 6. VALIDAÇÕES E LIMITES

```
┌────────────────────────────────────────────────────────────┐
│              VALIDAÇÕES CRÍTICAS                          │
└────────────────────────────────────────────────────────────┘

PENALIDADES:
──────────────────────────────────────────────────────────────
Limites configuráveis por área:
├→ Máximo de penalidades por tipo
├→ Penalidade total não pode negativar escore
├→ Validação em tempo real
└→ Aviso antes de salvar

TEMPO:
──────────────────────────────────────────────────────────────
Anti-trapaça:
├→ Timestamp do servidor (quando online)
├→ Relógio local quando offline
├→ Tolerância: +/- 5 minutos
├→ Diferença excessiva → flag de auditoria
└→ Admin pode revisar avaliações suspeitas

CAMPOS:
──────────────────────────────────────────────────────────────
Importação de equipes:
├→ Validação de nome único (por torneio)
├→ Campos obrigatórios
├→ Formato de dados (ex.: email válido)
└→ Relatório de erros

OFFLINE:
──────────────────────────────────────────────────────────────
Idempotência:
├→ Cada avaliação tem chave única
├→ Duplicatas detectadas e ignoradas
└→ Log de tentativas
```

---

### 7. OFFLINE-FIRST ROBUSTO

```
┌────────────────────────────────────────────────────────────┐
│              LOGIN OFFLINE SEGURO                         │
└────────────────────────────────────────────────────────────┘

PRÉ-AUTORIZAÇÃO (Antes do Evento):
──────────────────────────────────────────────────────────────
1. Admin faz login ONLINE
2. Navega até configurações do torneio
3. Clica "Pré-carregar para Offline"
4. Sistema baixa:
   ├→ Token de autenticação (válido 48h)
   ├→ Lista de equipes
   ├→ Configuração de áreas
   ├→ Rubricas
   ├→ Metadados do usuário
   └→ Chave de sessão
5. Cache armazenado em IndexedDB + localStorage
6. Dispositivo marcado como "offline-enabled"

DURANTE EVENTO (Offline):
──────────────────────────────────────────────────────────────
1. Usuário abre app
2. Sistema verifica:
   ├→ Token ainda válido? ✓/✗
   ├→ Cache disponível? ✓/✗
   └→ Dispositivo autorizado? ✓/✗
3. Se tudo OK → Login automático
4. Interface funciona normalmente

PÓS-EVENTO (Sincronização):
──────────────────────────────────────────────────────────────
1. Conexão restaurada
2. Detectar avaliações pendentes
3. Para cada avaliação:
   ├→ Verificar idempotência (chave única)
   ├→ Comparar timestamps
   ├→ Last-write-wins
   └→ Marcar como sincronizado
4. Se conflito: admin é notificado

MULTI-DISPOSITIVO:
──────────────────────────────────────────────────────────────
Cenário: Juiz usa 2 tablets offline
├→ Tablet 1 avalia Equipe A → 80 pontos
├→ Tablet 2 avalia Equipe A → 90 pontos
└→ Ambos sync quando online

Resultado: Último timestamp vence
├→ Tablet 2 (90) sobrescreve Tablet 1
├→ Histórico preservado
└→ Admin vê ambas as avaliações no log

Se preferir: Pode configurar "Bloquear multi-dispositivo offline"
```

---

### 8. RELATÓRIOS: INTERNOS VS EXTERNOS

```
┌────────────────────────────────────────────────────────────┐
│              SEGMENTAÇÃO DE RELATÓRIOS                    │
└────────────────────────────────────────────────────────────┘

RELATÓRIO INTERNO:
──────────────────────────────────────────────────────────────
Para: Admin, Juízes (áreas atribuídas)
Conteúdo:
├→ Rankings completos
├→ Rubricas detalhadas de cada juiz
├→ Nomes dos avaliadores
├→ Histórico de reavaliações
├→ Tempo de cada avaliação
├→ Discrepâncias entre juízes
└→ Estatísticas avançadas

RELATÓRIO EXTERNO:
──────────────────────────────────────────────────────────────
Para: Visualizadores, Público, Imprensa
Conteúdo:
├→ Rankings (posição + total)
├→ Pontos por área (sem detalhes)
├→ Sem nomes de juízes
├→ Sem rubricas individuais
├→ Anonimização opcional
└→ Design público (branding)

LINK PÚBLICO OPCIONAL:
──────────────────────────────────────────────────────────────
Admin pode gerar:
├→ Link único com expiração
├→ Accesso sem login
├→ Ranking em tempo real
├→ Auto-refresh (ex.: a cada 30s)
└→ Modo "telão" (grande contraste)

EXEMPLO:
──────────────────────────────────────────────────────────────
Link gerado: https://plataforma.com/t/YMpHoKq3
├→ Qualquer um com link acessa
├→ Vê ranking atualizado
├→ Pode filtrar (turno, série)
└→ Não vê rubricas/juízes
```

---

### 9. SNAPSHOTS DE RANKING

```
┌────────────────────────────────────────────────────────────┐
│              SNAPSHOTS AUTOMÁTICOS                        │
└────────────────────────────────────────────────────────────┘

QUANDO SÃO CRIADOS:
──────────────────────────────────────────────────────────────
1. Ao PUBLICAR torneio
2. Ao PAUSAR torneio
3. Ao FINALIZAR torneio
4. Manualmente (admin)
5. Antes de reabertura/reconfiguração

O QUE É SALVO:
──────────────────────────────────────────────────────────────
{
  "tournamentId": "tourn_123",
  "snapshotId": "snap_456",
  "timestamp": "2024-03-15T14:00:00Z",
  "event": "tournament_finished",
  "rankings": [...], // Array completo ordenado
  "metadata": {
    "totalTeams": 30,
    "totalEvaluated": 30,
    "method": "percentage",
    "weights": {...}
  }
}

ACESSO:
──────────────────────────────────────────────────────────────
Admin pode:
├→ Ver histórico de snapshots
├→ Comparar snapshots
├→ Exportar snapshot específico
├→ "Reverter" para snapshot (se apropriado)
└→ Enviar snapshot para cerimônia

CASO DE USO:
──────────────────────────────────────────────────────────────
1. Torneio finaliza em 15/03 14:00
2. Snapshot #1 criado automaticamente
3. Equipe reclama de avaliação incorreta
4. Admin reabre e corrige
5. Rankings recalculados
6. Snapshot #2 criado
7. Cerimônia usa Snapshot #1 (oficial)
8. Admin tem ambos os snapshots
```

---

### 10. FEATURE FLAGS E CUSTOMIZAÇÃO

```
┌────────────────────────────────────────────────────────────┐
│              FEATURE FLAGS POR TORNEIO                    │
└────────────────────────────────────────────────────────────┘

FEATURES CONFIGURÁVEIS:
──────────────────────────────────────────────────────────────
Por torneio, admin pode ativar/desativar:
├→ Reavaliação
├→ Múltiplas rodadas
├→ Penalidades
├→ Timer de prova
├→ Link público de ranking
├→ Agregação multi-juiz
├→ Anonimização
└→ Check-in de equipes (QR code)

BRANDING POR ESCOLA:
──────────────────────────────────────────────────────────────
Configuração persistente:
├→ Cores (primary, secondary, accent)
├→ Logotipo
├→ Tipografia
├→ Favicon
└→ Mensagens customizadas

APLICAÇÃO:
──────────────────────────────────────────────────────────────
Toda interface usa branding da escola:
├→ Header
├→ Botões
├→ Links
├→ Relatórios exportados
└→ Link público

TEMPLATES DE RELATÓRIO:
──────────────────────────────────────────────────────────────
Escola pode salvar:
├→ Templates de exportação
├→ Filtros padrão
├→ Formato preferido
└→ Destinatários (email)
```

---

### 11. MODOS DE TELA

```
┌────────────────────────────────────────────────────────────┐
│              MODOS DE EXIBIÇÃO                            │
└────────────────────────────────────────────────────────────┘

MODO JUÍZ (Tablet/Kiosk):
──────────────────────────────────────────────────────────────
Tela otimizada para avaliação rápida:
├→ Fonte grande (20pt+)
├→ Botões grandes (touch-friendly)
├→ Atalhos de teclado (1-5 para notas)
├→ Timer bem visível
├→ Confirmação clara (salvou/sincronizando)
└→ Sem distrações

MODO PLACAR PÚBLICO (Telão):
──────────────────────────────────────────────────────────────
Ranking para tela grande:
├→ Auto-refresh (30-60s)
├→ Top 10 destacado
├→ Contraste alto
├→ Animação suave
├→ Filtros pré-definidos
└→ Link público compatível

MODO PAINEL COMITÊ (Desktop):
──────────────────────────────────────────────────────────────
Dashboard administrativo:
├→ Resumo de pendências
├→ Sincronização em tempo real
├→ Alertas de conflitos
├→ Tempo médio por avaliação
├→ Distrbuição de avaliadores
└→ Estatísticas avançadas

MODO VISUALIZADOR (Mobile/Tablet):
──────────────────────────────────────────────────────────────
Interface simplificada:
├→ Rankings principais
├→ Filtros básicos
├→ Exportação rápida
└→ Sem funcionalidades administrativas
```

---

### 12. CHECKLIST DE IMPLEMENTAÇÃO

```
┌────────────────────────────────────────────────────────────┐
│           PRIORIDADES DE IMPLEMENTAÇÃO                    │
└────────────────────────────────────────────────────────────┘

FASE 1: FUNDAÇÃO (Obrigatório)
──────────────────────────────────────────────────────────────
✅ Estados de Escola/Torneio
✅ Lock de configuração ao publicar
✅ Governança de templates (sempre cópia)
✅ Versionamento de templates
✅ Gestão de usuários (CRUD + reset)
✅ Multi-juiz com agregação
✅ Validações e limites
✅ Login offline com janela de validade
✅ Conflito offline (last-write-wins robusto)
✅ Snapshot de ranking ao finalizar

FASE 2: CRÍTICO PARA OPERAÇÃO (Obrigatório)
──────────────────────────────────────────────────────────────
✅ Relatórios internos vs externos
✅ Offline-first com fila de sync
✅ Idempotência de avaliações
✅ Log de sincronização
✅ Timer anti-trapaça
✅ Feature flags básicas

FASE 3: UX E BRANDING (Importante)
──────────────────────────────────────────────────────────────
✅ Acessibilidade WCAG AA
✅ i18n completo (pt-BR/en)
✅ Branding por escola
✅ Modos de tela (kiosk, placar, comitê)
✅ Estados vazios e erros claros
✅ Link público opcional

FASE 4: AVANÇADO (Opcional mas Recomendado)
──────────────────────────────────────────────────────────────
⚙️ Sistema de rodadas
⚙️ Check-in de equipes (QR code)
⚙️ Snapshots intermediários
⚙️ Comparação de snapshots
⚙️ Templates de exportação
⚙️ Anonimização avançada
⚙️ Multi-dispositivo bloqueável
⚙️ Auditoria de avaliações suspeitas
```

---

### 13. DIAGRAMA DE DECISÃO: FLUXO CRÍTICO

```
┌────────────────────────────────────────────────────────────┐
│           FLUXO DE DECISÃO: REAVALIAÇÃO                   │
└────────────────────────────────────────────────────────────┘

Usuário solicita reavaliar Equipe X
    │
    ▼
Torneio permite reavaliação?
    ├──→ NÃO
    │     └→ ❌ Bloqueado
    │
    └──→ SIM
          │
          ▼
Usuário tem permissão?
    ├──→ NÃO
    │     └→ ❌ Bloqueado
    │
    └──→ SIM
          │
          ▼
Torneio está ativo/pausado?
    ├──→ NÃO (finalizado/arquivado)
    │     ├──→ Torneio > 30 dias finalizado?
    │     │     ├──→ SIM: ❌ Bloqueado permanentemente
    │     │     └──→ NÃO: ⚠️ Aviso + confirmação admin
    │     └──→ Permitir apenas Admin Plataforma
    │
    └──→ SIM
          │
          ▼
Criar nova avaliação
    │
    ├→ Preservar avaliação anterior
    ├→ Nova timestamp
    ├→ Version = previous + 1
    ├→ Marcar como ativa
    │
    ▼
Salvar
    │
    ├→ Offline?
    │   ├→ Salvar local + fila
    │   └→ Marcar como pending
    │
    └→ Online?
        ├→ Salvar no servidor
        └→ Marcar como synced
    │
    ▼
Recalcular ranking
    │
    └→ Usar apenas versão mais recente
    │
    ▼
Notificar admin (se configurado)
    │
    ▼
✅ Concluído
```

---

**ESTE FLUXOGRAMA ESTÁ COMPLETO E PRONTO PARA IMPLEMENTAÇÃO!** 🚀

Todas as decisões arquiteturais, pontos críticos, validações e estados estão detalhadamente documentados.
