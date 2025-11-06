/**
 * Biblioteca de normalização de texto para filtros inteligentes
 * Permite correspondência tolerante a variações de escrita, acentuação e formatação
 */

/**
 * Remove acentuação de uma string
 */
function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normaliza caracteres especiais (º, °, ª → o/a)
 */
function normalizeSpecialChars(text: string): string {
  return text
    .replace(/[º°]/g, 'o')
    .replace(/ª/g, 'a')
    .replace(/[^\w\s]/g, ' ') // Remove outros caracteres especiais, substituindo por espaço
}

/**
 * Remove espaços extras e normaliza
 */
function normalizeSpaces(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços viram um único espaço
}

/**
 * Trata abreviações e sinônimos comuns
 */
function expandAbbreviations(text: string): string {
  const abbreviations: Record<string, string> = {
    'ens': 'ensino',
    'ens.': 'ensino',
    'em': 'ensino medio',
    'medio': 'medio',
    'med': 'medio',
    'fund': 'fundamental',
    'fund.': 'fundamental',
    'ef': 'ensino fundamental',
    'ef.': 'ensino fundamental',
  }

  let result = text.toLowerCase()
  
  // Substituir abreviações
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    result = result.replace(regex, full)
  }

  return result
}

/**
 * Normaliza um texto completamente para comparação
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  
  return normalizeSpaces(
    expandAbbreviations(
      normalizeSpecialChars(
        removeAccents(text.toLowerCase())
      )
    )
  )
}

/**
 * Calcula similaridade entre duas strings usando Levenshtein
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calcula similaridade entre duas strings (0 a 1, onde 1 é idêntico)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  
  const distance = levenshteinDistance(str1, str2)
  return 1 - (distance / maxLen)
}

/**
 * Verifica se um texto corresponde a um valor esperado com tolerância a erros
 */
function matchesValue(
  normalizedInput: string,
  normalizedExpected: string,
  threshold: number = 0.8
): boolean {
  // Correspondência exata
  if (normalizedInput === normalizedExpected) return true
  
  // Correspondência parcial (includes)
  if (normalizedInput.includes(normalizedExpected) || normalizedExpected.includes(normalizedInput)) {
    return true
  }
  
  // Similaridade por Levenshtein
  const similarity = calculateSimilarity(normalizedInput, normalizedExpected)
  return similarity >= threshold
}

/**
 * Normaliza e identifica o turno de uma string
 * Retorna: 'manha' | 'tarde' | null
 */
export function normalizeShift(input: string | null | undefined): 'manha' | 'tarde' | null {
  if (!input) return null

  const normalized = normalizeText(input)
  
  // Valores oficiais normalizados
  const manhaVariations = [
    'manha',
    'manha1',
    'turno manha',
    'morning', // Formato do sistema
  ]
  
  const tardeVariations = [
    'tarde',
    'tard',
    'turno tarde',
    'afternoon', // Formato do sistema
  ]

  // Verificar correspondência com manhã
  for (const variation of manhaVariations) {
    if (matchesValue(normalized, variation, 0.7)) {
      return 'manha'
    }
  }

  // Verificar correspondência com tarde
  for (const variation of tardeVariations) {
    if (matchesValue(normalized, variation, 0.7)) {
      return 'tarde'
    }
  }

  return null
}

/**
 * Normaliza e identifica a turma de uma string
 * Retorna: string normalizada (ex: '2º ano', '3º ano ensino medio') | null
 */
export function normalizeGrade(input: string | null | undefined): string | null {
  if (!input) return null

  const normalized = normalizeText(input)
  
  // Padrões de correspondência para anos do fundamental
  const fundamentalPatterns: Record<string, string> = {
    '2': '2º ano',
    '3': '3º ano',
    '4': '4º ano',
    '5': '5º ano',
    '6': '6º ano',
    '7': '7º ano',
    '8': '8º ano',
    '9': '9º ano',
  }

  // Padrões de correspondência para ensino médio
  const medioPatterns: Record<string, string> = {
    '1': '1º ano ensino medio',
    '2': '2º ano ensino medio',
    '3': '3º ano ensino medio',
  }

  // Verificar se contém referência a ensino médio
  const hasMedio = normalized.includes('medio') || normalized.includes('ensino medio') || normalized.includes('em')

  if (hasMedio) {
    // Tentar identificar o ano do ensino médio
    for (const [year, pattern] of Object.entries(medioPatterns)) {
      const yearPattern = new RegExp(`\\b${year}\\b|${year}\\s*(ano|ano ensino|ano medio|ano em)`, 'i')
      if (yearPattern.test(normalized)) {
        return pattern
      }
    }
    
    // Se não encontrou ano específico, mas tem "medio", pode ser genérico
    // Vamos tentar extrair o número
    const yearMatch = normalized.match(/\b([123])\b/)
    if (yearMatch) {
      const year = yearMatch[1]
      return medioPatterns[year] || null
    }
  } else {
    // Verificar anos do fundamental (2º ao 9º)
    for (const [year, pattern] of Object.entries(fundamentalPatterns)) {
      // Padrões mais flexíveis para correspondência
      const patterns = [
        new RegExp(`\\b${year}\\s*(ano|ano ensino|ano fundamental|ano fund)`, 'i'),
        new RegExp(`^${year}\\s*ano`, 'i'),
        new RegExp(`${year}\\s*ano$`, 'i'),
        new RegExp(`\\b${year}\\b`), // Apenas o número, se estiver isolado
      ]
      
      for (const regex of patterns) {
        if (regex.test(normalized)) {
          return pattern
        }
      }
    }
  }

  return null
}

/**
 * Converte turno normalizado para formato usado no sistema
 * 'manha' -> 'morning'
 * 'tarde' -> 'afternoon'
 */
export function shiftToSystemFormat(shift: 'manha' | 'tarde' | null): 'morning' | 'afternoon' | null {
  if (shift === 'manha') return 'morning'
  if (shift === 'tarde') return 'afternoon'
  return null
}

/**
 * Converte turno do sistema para formato normalizado
 * 'morning' -> 'manha'
 * 'afternoon' -> 'tarde'
 */
export function shiftFromSystemFormat(shift: string | null | undefined): 'manha' | 'tarde' | null {
  if (!shift) return null
  const normalized = normalizeText(shift)
  if (normalized === 'morning' || normalized === 'manha') return 'manha'
  if (normalized === 'afternoon' || normalized === 'tarde') return 'tarde'
  return null
}

/**
 * Normaliza e padroniza os dados de uma equipe durante a importação
 */
export function normalizeTeamData(data: {
  name: string
  code?: string
  grade?: string
  shift?: string
}): {
  name: string
  code?: string
  grade: string | null
  shift: string | null
  normalizedGrade: string | null
  normalizedShift: 'manha' | 'tarde' | null
} {
  const normalizedShift = normalizeShift(data.shift)
  const normalizedGrade = normalizeGrade(data.grade)
  
  // Converter turno normalizado para formato do sistema
  const systemShift = shiftToSystemFormat(normalizedShift)

  return {
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    grade: normalizedGrade || data.grade?.trim() || null,
    shift: systemShift || data.shift?.trim() || null,
    normalizedGrade,
    normalizedShift,
  }
}

