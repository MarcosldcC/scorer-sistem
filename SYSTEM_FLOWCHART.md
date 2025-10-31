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

**ESTE FLUXOGRAMA ESTÁ PRONTO PARA IMPLEMENTAÇÃO!** 🚀

Todas as decisões arquiteturais, fluxos de trabalho, permissões e comportamentos estão documentados aqui.

Aguardando sua confirmação para iniciar o desenvolvimento completo do sistema! 💪
