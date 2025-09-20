import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testando conexão com o banco de dados...')
    await prisma.$connect()
    console.log('✅ Conexão com banco de dados estabelecida!')
    
    // Testar contagem de usuários
    const userCount = await prisma.user.count()
    console.log(`📊 Usuários cadastrados: ${userCount}`)
    
    // Testar contagem de equipes
    const teamCount = await prisma.team.count()
    console.log(`📊 Equipes cadastradas: ${teamCount}`)
    
    // Testar contagem de avaliações
    const evaluationCount = await prisma.evaluation.count()
    console.log(`📊 Avaliações cadastradas: ${evaluationCount}`)
    
    return true
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error)
    return false
  }
}

async function testUserLogin() {
  try {
    console.log('\n🔍 Testando login de usuário...')
    
    const user = await prisma.user.findFirst({
      where: { name: 'Marcos' }
    })
    
    if (!user) {
      console.log('❌ Usuário Marcos não encontrado')
      return false
    }
    
    const isValidPassword = await bcrypt.compare('inicial@123', user.password)
    
    if (isValidPassword) {
      console.log('✅ Login do usuário funcionando!')
      console.log(`   Nome: ${user.name}`)
      console.log(`   Admin: ${user.isAdmin}`)
      console.log(`   Áreas: ${user.areas.join(', ')}`)
      return true
    } else {
      console.log('❌ Senha incorreta')
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao testar login:', error)
    return false
  }
}

async function testTeamsData() {
  try {
    console.log('\n🔍 Testando dados das equipes...')
    
    const teams = await prisma.team.findMany({
      take: 3
    })
    
    if (teams.length === 0) {
      console.log('❌ Nenhuma equipe encontrada')
      return false
    }
    
    console.log('✅ Equipes encontradas:')
    teams.forEach(team => {
      console.log(`   - ${team.name} (${team.grade}º ${team.shift})`)
    })
    
    return true
  } catch (error) {
    console.error('❌ Erro ao testar equipes:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando testes do sistema...\n')
  
  const dbTest = await testDatabaseConnection()
  if (!dbTest) {
    console.log('\n❌ Testes falharam - verifique a configuração do banco de dados')
    process.exit(1)
  }
  
  const loginTest = await testUserLogin()
  const teamsTest = await testTeamsData()
  
  console.log('\n📋 Resumo dos testes:')
  console.log(`   Banco de dados: ${dbTest ? '✅' : '❌'}`)
  console.log(`   Login: ${loginTest ? '✅' : '❌'}`)
  console.log(`   Equipes: ${teamsTest ? '✅' : '❌'}`)
  
  if (dbTest && loginTest && teamsTest) {
    console.log('\n🎉 Todos os testes passaram! O sistema está funcionando corretamente.')
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a configuração.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro durante os testes:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
