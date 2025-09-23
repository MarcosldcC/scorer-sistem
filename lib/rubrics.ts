// Evaluation rubrics and scoring system

export interface RubricCriterion {
  id: string
  name: string
  description: string
  maxScore: number
  options?: number[]
}

export interface ProgrammingMission {
  id: string
  name: string
  description: string
  points: number
  quantity?: number
  enabled: boolean
}

export interface RubricLevel {
  level: number
  name: string
  description: string
  enabled: boolean
}

export interface DetailedRubricCriterion {
  id: string
  name: string
  levels: RubricLevel[]
}

export interface EvaluationRubric {
  area: "programming" | "research" | "identity"
  criteria: RubricCriterion[]
  timeLimit: {
    grade2: number // minutes
    grade3to5: number // minutes
  }
}

export const PROGRAMMING_MISSIONS: ProgrammingMission[] = [
  {
    id: "mission1",
    name: "Missão 1",
    description: "Cada lixo levado à área de descarte (5 und)",
    points: 10,
    quantity: 5,
    enabled: true,
  },
  {
    id: "mission2",
    name: "Missão 2",
    description: "Cada muda colocada no quadrante verde (3 und)",
    points: 15,
    quantity: 3,
    enabled: true,
  },
  {
    id: "mission3",
    name: "Missão 3",
    description: "Cada tartaruga entregue ao mar (3 und)",
    points: 20,
    quantity: 3,
    enabled: true,
  },
  {
    id: "mission4",
    name: "Missão 4",
    description: "Coral posicionado corretamente (1)",
    points: 30,
    quantity: 1,
    enabled: true,
  },
  {
    id: "mission5",
    name: "Missão 5",
    description: "Casinha no ponto correto (1)",
    points: 40,
    quantity: 1,
    enabled: true,
  },
]

export const PROGRAMMING_PENALTIES = [
  {
    id: "robot_touch",
    name: "Toque no robô em movimento",
    points: -5,
  },
]

// Rubrica para 2º ano (Storytelling)
export const STORYTELLING_DETAILED_RUBRIC: DetailedRubricCriterion[] = [
  {
    id: "presentation_clarity",
    name: "Clareza de Apresentação",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "A apresentação não é clara e não transmite a mensagem de forma compreensível.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A apresentação tem algumas informações claras, mas falta organização e fluidez.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A apresentação é razoavelmente clara, mas pode ser melhor estruturada para facilitar a compreensão.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A apresentação é clara, bem organizada e transmite a mensagem de forma eficaz.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A apresentação é excepcionalmente clara, fluida e transmite a mensagem de forma perfeita e envolvente.", 
        enabled: true 
      },
    ],
  },
  {
    id: "student_participation",
    name: "Participação dos Alunos",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "Os alunos não participam ativamente da apresentação ou demonstram pouco engajamento.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "Alguns alunos participam, mas de forma limitada e sem coordenação.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "Os alunos participam de forma razoável, mas pode haver melhor distribuição de responsabilidades.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "Os alunos participam ativamente e de forma coordenada na apresentação.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "Todos os alunos participam de forma excepcional, demonstrando total engajamento e coordenação perfeita.", 
        enabled: true 
      },
    ],
  },
  {
    id: "creativity",
    name: "Criatividade",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "A apresentação não demonstra criatividade ou elementos inovadores.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A apresentação apresenta algumas ideias criativas, mas de forma limitada.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A apresentação é criativa, mas pode explorar mais elementos inovadores.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A apresentação é criativa e apresenta elementos inovadores de forma eficaz.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A apresentação é extremamente criativa e inovadora, destacando-se pela originalidade.", 
        enabled: true 
      },
    ],
  },
  {
    id: "scenario",
    name: "Cenário",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O cenário não está adequado ou não contribui para a apresentação.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O cenário é simples e tem pouca relação com o tema da apresentação.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O cenário é adequado, mas pode ser mais elaborado e conectado ao tema.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O cenário é bem elaborado e contribui efetivamente para a apresentação.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O cenário é excepcionalmente elaborado e perfeitamente integrado à apresentação.", 
        enabled: true 
      },
    ],
  },
  {
    id: "costume",
    name: "Figurino",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O figurino não está adequado ou não contribui para a apresentação.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O figurino é simples e tem pouca relação com o tema da apresentação.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O figurino é adequado, mas pode ser mais elaborado e conectado ao tema.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O figurino é bem elaborado e contribui efetivamente para a apresentação.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O figurino é excepcionalmente elaborado e perfeitamente integrado à apresentação.", 
        enabled: true 
      },
    ],
  },
]

// Rubrica para 3º, 4º e 5º anos (Pesquisa)
export const RESEARCH_DETAILED_RUBRIC: DetailedRubricCriterion[] = [
  {
    id: "poster_development",
    name: "Desenvolvimento do Cartaz",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O cartaz não é visualmente atrativo e carece de hierarquia. As informações não são claras.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O cartaz apresenta algumas informações, mas falta clareza e uma organização visual eficiente.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O cartaz é visualmente atrativo, mas a hierarquia de informações pode ser aprimorada para facilitar a leitura.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O cartaz é bem organizado e apresenta hierarquia clara, com as informações principais bem destacadas.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O cartaz é excepcionalmente visual e claro, com uma hierarquia de informações perfeita e atraente.", 
        enabled: true 
      },
    ],
  },
  {
    id: "research_depth",
    name: "Aprofundamento da Pesquisa",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "A pesquisa não apresenta embasamento adequado e falta fontes confiáveis.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A pesquisa apresenta algumas fontes, mas carece de aprofundamento e diferentes pontos de vista.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A pesquisa apresenta um bom número de fontes e explora o tema, mas ainda pode ser mais abrangente.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A pesquisa é bem fundamentada, com fontes confiáveis e diferentes pontos de vista bem apresentados.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A pesquisa é excepcionalmente detalhada, explorando amplamente o tema com diversas fontes confiáveis e perspectivas.", 
        enabled: true 
      },
    ],
  },
  {
    id: "presentation_clarity",
    name: "Clareza na Apresentação",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O conteúdo do cartaz é confuso, sem uma organização lógica clara.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A organização do cartaz não é totalmente intuitiva e algumas informações são difíceis de entender.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O cartaz é organizado de forma razoável, mas pode ser melhor estruturado para facilitar a compreensão.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O conteúdo do cartaz é bem organizado, lógico e acessível.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O conteúdo do cartaz é perfeitamente organizado, com uma apresentação lógica e intuitiva, de fácil compreensão.", 
        enabled: true 
      },
    ],
  },
  {
    id: "relevance_practical",
    name: "Relevância e Aplicação Prática",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O projeto não demonstra aplicação prática ou relevância.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A pesquisa sugere soluções, mas com pouca relação prática e aplicabilidade limitada.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A pesquisa apresenta algumas soluções viáveis, mas não explora totalmente a aplicabilidade no mundo real.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A pesquisa apresenta soluções viáveis e práticas, com impacto real no problema abordado.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A pesquisa demonstra soluções altamente práticas e impactantes, com aplicação real significativa para o problema abordado.", 
        enabled: true 
      },
    ],
  },
]

export const IDENTITY_DETAILED_RUBRIC: DetailedRubricCriterion[] = [
  {
    id: "mascot_design",
    name: "Desenho do Mascote no Cartaz",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O mascote não é bem desenhado ou não reflete o conceito do projeto.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O mascote é simples e pouco original, com relação fraca ao tema do projeto.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O mascote é bem desenhado, mas poderia ser mais criativo e alinhado ao conceito do projeto.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O mascote é bem desenhado, refletindo claramente o conceito do projeto de forma criativa e original.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O mascote é excepcionalmente bem desenhado, com forte conexão ao conceito do projeto, original e criativo.", 
        enabled: true 
      },
    ],
  },
  {
    id: "battle_cry",
    name: "Grito de Garra",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O grito de garra não é claro, nem criativo, e não transmite espírito de equipe.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O grito de garra é simples, mas não tem fácil memorização ou forte conexão com o tema.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O grito de garra é criativo, mas poderia ser mais memorável e alinhado ao projeto.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O grito de garra é criativo, original e de fácil memorização, alinhado ao tema do projeto e transmite espírito de equipe.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O grito de garra é altamente criativo, memorável e transmite de forma eficaz o espírito de equipe e motivação.", 
        enabled: true 
      },
    ],
  },
  {
    id: "animation",
    name: "Animação",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "A animação não é executada de forma eficaz ou não se conecta com a identidade do projeto.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A animação tem uma execução simples, mas falta fluidez e conexão com o projeto.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A animação é bem executada, mas poderia ser mais fluida e reforçar melhor a identidade do projeto.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A animação é bem executada, fluida, com boa conexão com a identidade do projeto, agregando valor à apresentação.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A animação é excepcionalmente bem executada, fluida e reforça de forma perfeita a identidade do projeto.", 
        enabled: true 
      },
    ],
  },
  {
    id: "creativity_originality",
    name: "Criatividade e Originalidade",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "O projeto não é original ou criativo, não se destaca das demais propostas.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "O projeto apresenta algumas ideias criativas, mas falta originalidade e inovação.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "O projeto é criativo e apresenta boas ideias, mas poderia ser mais inovador e original.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "O projeto é original e criativo, destacando-se pela inovação nos elementos como mascote, animação e grito de garra.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "O projeto é extremamente original e criativo, com elementos inovadores que o destacam de outras propostas.", 
        enabled: true 
      },
    ],
  },
  {
    id: "visual_presentation",
    name: "Apresentação e Coerência Visual",
    levels: [
      { 
        level: 0, 
        name: "Não Demonstrado", 
        description: "A identidade visual é inconsistente, sem harmonia entre os elementos gráficos.", 
        enabled: true 
      },
      { 
        level: 3, 
        name: "Iniciante", 
        description: "A identidade visual apresenta alguns elementos, mas falta coesão e harmonia.", 
        enabled: true 
      },
      { 
        level: 5, 
        name: "Em Desenvolvimento", 
        description: "A identidade visual é boa, mas poderia ser mais consistente em termos de cores, fontes e elementos gráficos.", 
        enabled: true 
      },
      { 
        level: 7, 
        name: "Finalizado", 
        description: "A identidade visual é consistente e harmônica, com boa aplicação de cores, fontes e elementos gráficos, reforçando a mensagem do projeto.", 
        enabled: true 
      },
      { 
        level: 10, 
        name: "Exemplar", 
        description: "A identidade visual é perfeitamente coesa e consistente, com uma aplicação impecável de cores, fontes e elementos gráficos, reforçando a mensagem de forma clara e impactante.", 
        enabled: true 
      },
    ],
  },
]

export const RUBRICS: Record<string, EvaluationRubric> = {
  programming: {
    area: "programming",
    criteria: [
      {
        id: "mission1",
        name: "Missão 1 - Lixo",
        description: "Cada lixo levado à área de descarte (5 und) - 10 pontos por unidade",
        maxScore: 50,
        options: [10, 20, 30, 40, 50],
      },
      {
        id: "mission2",
        name: "Missão 2 - Mudas",
        description: "Cada muda colocada no quadrante verde (3 und) - 15 pontos por unidade",
        maxScore: 45,
        options: [15, 30, 45],
      },
      {
        id: "mission3",
        name: "Missão 3 - Tartarugas",
        description: "Cada tartaruga entregue ao mar (3 und) - 20 pontos por unidade",
        maxScore: 60,
        options: [20, 40, 60],
      },
      {
        id: "mission4",
        name: "Missão 4 - Coral",
        description: "Coral posicionado corretamente (1)",
        maxScore: 30,
        options: [30],
      },
      {
        id: "mission5",
        name: "Missão 5 - Casinha",
        description: "Casinha no ponto correto (1)",
        maxScore: 40,
        options: [40],
      },
    ],
    timeLimit: {
      grade2: 8,
      grade3to5: 5,
    },
  },
  research: {
    area: "research",
    criteria: [
      {
        id: "poster_development",
        name: "Desenvolvimento do Cartaz",
        description: "Qualidade visual e hierarquia de informações do cartaz",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "research_depth",
        name: "Aprofundamento da Pesquisa",
        description: "Fundamentação e fontes confiáveis da pesquisa",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "presentation_clarity",
        name: "Clareza na Apresentação",
        description: "Organização lógica e compreensão do conteúdo",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "relevance_practical",
        name: "Relevância e Aplicação Prática",
        description: "Aplicabilidade prática e impacto real da pesquisa",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
    ],
    timeLimit: {
      grade2: 10,
      grade3to5: 10,
    },
  },
  identity: {
    area: "identity",
    criteria: [
      {
        id: "mascot_design",
        name: "Desenho do Mascote no Cartaz",
        description: "Qualidade do desenho e conexão com o conceito do projeto",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "battle_cry",
        name: "Grito de Garra",
        description: "Criatividade, memorização e espírito de equipe",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "animation",
        name: "Animação",
        description: "Execução fluida e conexão com a identidade do projeto",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "creativity_originality",
        name: "Criatividade e Originalidade",
        description: "Inovação e destaque das demais propostas",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
      {
        id: "visual_presentation",
        name: "Apresentação e Coerência Visual",
        description: "Consistência e harmonia dos elementos gráficos",
        maxScore: 10,
        options: [0, 3, 5, 7, 10],
      },
    ],
    timeLimit: {
      grade2: 0,
      grade3to5: 0,
    },
  },
}

export interface EvaluationScore {
  criterionId: string
  score: number
}

export interface TeamEvaluation {
  teamId: string
  area: "programming" | "research" | "identity"
  scores: EvaluationScore[]
  comments: string
  evaluationTime: number // in seconds
  evaluatedBy: string
  evaluatedAt: Date
}

export function calculateTotalScore(scores: EvaluationScore[]): number {
  return scores.reduce((total, score) => total + score.score, 0)
}

export function calculatePercentage(totalScore: number, maxPossibleScore: number): number {
  return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0
}

export function getMaxPossibleScore(rubric: EvaluationRubric): number {
  return rubric.criteria.reduce((total, criterion) => total + criterion.maxScore, 0)
}

// Função para obter a rubrica correta baseada na série
export function getRubricForGrade(area: "programming" | "research" | "identity", grade: string): EvaluationRubric {
  if (area === "research" && grade === "2") {
    // Rubrica de Storytelling para 2º ano
    return {
      area: "research",
      criteria: [
        {
          id: "presentation_clarity",
          name: "Clareza de Apresentação",
          description: "Clareza e fluidez da apresentação",
          maxScore: 10,
          options: [0, 3, 5, 7, 10],
        },
        {
          id: "student_participation",
          name: "Participação dos Alunos",
          description: "Engajamento e coordenação dos alunos",
          maxScore: 10,
          options: [0, 3, 5, 7, 10],
        },
        {
          id: "creativity",
          name: "Criatividade",
          description: "Elementos criativos e inovadores",
          maxScore: 10,
          options: [0, 3, 5, 7, 10],
        },
        {
          id: "scenario",
          name: "Cenário",
          description: "Adequação e elaboração do cenário",
          maxScore: 10,
          options: [0, 3, 5, 7, 10],
        },
        {
          id: "costume",
          name: "Figurino",
          description: "Adequação e elaboração do figurino",
          maxScore: 10,
          options: [0, 3, 5, 7, 10],
        },
      ],
      timeLimit: {
        grade2: 10,
        grade3to5: 10,
      },
    }
  }
  
  // Retorna a rubrica padrão para outras séries
  return RUBRICS[area]
}
