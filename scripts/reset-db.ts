import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpando banco de dados...')
  console.log('')

  // Delete all data in the correct order (respecting foreign keys)
  try {
    // Delete dependent records first
    await prisma.penalty.deleteMany()
    console.log('   ✓ Penalties deletados')

    await prisma.evaluation.deleteMany()
    console.log('   ✓ Evaluations deletados')

    await prisma.rankingSnapshot.deleteMany()
    console.log('   ✓ Ranking snapshots deletados')

    await prisma.team.deleteMany()
    console.log('   ✓ Teams deletados')

    await prisma.userTournamentArea.deleteMany()
    console.log('   ✓ User tournament areas deletados')

    await prisma.tournamentArea.deleteMany()
    console.log('   ✓ Tournament areas deletados')

    await prisma.tournament.deleteMany()
    console.log('   ✓ Tournaments deletados')

    await prisma.tournamentTemplate.deleteMany()
    console.log('   ✓ Tournament templates deletados')

    await prisma.schoolSettings.deleteMany()
    console.log('   ✓ School settings deletados')

    await prisma.school.deleteMany()
    console.log('   ✓ Schools deletados')

    await prisma.user.deleteMany()
    console.log('   ✓ Users deletados')

    await prisma.platformConfig.deleteMany()
    console.log('   ✓ Platform configs deletados')

    console.log('')
    console.log('✅ Banco de dados limpo com sucesso!')
    console.log('')

    // Create test school for school admin, judge and viewer
    console.log('📚 Criando escola de teste...')
    const testSchool = await prisma.school.create({
      data: {
        name: 'Escola de Teste',
        code: 'TEST001',
        email: 'teste@escola.com',
        status: 'active',
        location: 'Localização de Teste'
      }
    })
    console.log(`   ✓ Escola criada: ${testSchool.name} (${testSchool.code})`)
    console.log('')

    // Create school settings
    await prisma.schoolSettings.create({
      data: {
        schoolId: testSchool.id,
        language: 'pt-BR',
        branding: {}
      }
    })
    console.log('   ✓ Configurações da escola criadas')
    console.log('')

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('inicial@123', 10)

    console.log('👤 Criando contas de teste...')
    console.log('')

    // 1. Platform Admin
    const platformAdmin = await prisma.user.create({
      data: {
        name: 'Administrador da Plataforma',
        email: 'admin@plataforma.com',
        password: hashedPassword,
        role: 'platform_admin',
        isAdmin: true,
        isActive: true,
        isFirstLogin: false,
        areas: []
      }
    })
    console.log('   ✓ Platform Admin criado')
    console.log('      Email: admin@plataforma.com')
    console.log('      Senha: inicial@123')
    console.log('')

    // 2. School Admin
    const schoolAdmin = await prisma.user.create({
      data: {
        name: 'Administrador de Torneio',
        email: 'admin@torneio.com',
        password: hashedPassword,
        role: 'school_admin',
        schoolId: testSchool.id,
        isAdmin: false,
        isActive: true,
        isFirstLogin: false,
        areas: []
      }
    })
    console.log('   ✓ School Admin criado')
    console.log('      Email: admin@torneio.com')
    console.log('      Senha: inicial@123')
    console.log('')

    // 3. Judge
    const judge = await prisma.user.create({
      data: {
        name: 'Juiz de Teste',
        email: 'juiz@torneio.com',
        password: hashedPassword,
        role: 'judge',
        schoolId: testSchool.id,
        isAdmin: false,
        isActive: true,
        isFirstLogin: false,
        areas: []
      }
    })
    console.log('   ✓ Judge criado')
    console.log('      Email: juiz@torneio.com')
    console.log('      Senha: inicial@123')
    console.log('')

    // 4. Viewer (note: user typed "viewr" instead of "viewer")
    const viewer = await prisma.user.create({
      data: {
        name: 'Visualizador de Teste',
        email: 'viewr@torneio.com',
        password: hashedPassword,
        role: 'viewer',
        schoolId: testSchool.id,
        isAdmin: false,
        isActive: true,
        isFirstLogin: false,
        areas: []
      }
    })
    console.log('   ✓ Viewer criado')
    console.log('      Email: viewr@torneio.com')
    console.log('      Senha: inicial@123')
    console.log('')

    console.log('✅ Todas as contas de teste criadas com sucesso!')
    console.log('')
    console.log('📋 Resumo das contas:')
    console.log('   • Platform Admin: admin@plataforma.com / inicial@123')
    console.log('   • School Admin: admin@torneio.com / inicial@123')
    console.log('   • Judge: juiz@torneio.com / inicial@123')
    console.log('   • Viewer: viewr@torneio.com / inicial@123')
    console.log('')
    console.log('🚀 Banco de dados resetado e pronto para uso!')
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

