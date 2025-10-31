import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Inicializando banco de dados Multi-Tenant...')

  // Hash da senha padrão
  const hashedPassword = await bcrypt.hash('inicial@123', 10)

  // Criar escola padrão para compatibilidade legada
  let legacySchool = await prisma.school.findFirst({
    where: { code: 'DEFAULT_LEGACY' }
  })

  if (!legacySchool) {
    legacySchool = await prisma.school.create({
      data: {
        name: 'Sistema Legado',
        code: 'DEFAULT_LEGACY',
        email: 'legacy@system.local',
        status: 'active'
      }
    })
    console.log('Escola padrão criada')
  }

  // Criar usuários com novo modelo multi-tenant
  const users = [
    {
      name: 'Marina Vitória',
      email: 'marina.vitoria@example.com',
      password: hashedPassword,
      areas: ['programming'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Gabrielly Barreto',
      email: 'gabrielly.barreto@example.com',
      password: hashedPassword,
      areas: ['programming'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Gabrielly Araújo',
      email: 'gabrielly.araujo@example.com',
      password: hashedPassword,
      areas: ['programming'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Camila Letícia',
      email: 'camila.leticia@example.com',
      password: hashedPassword,
      areas: ['programming'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Ana Carolina',
      email: 'ana.carolina@example.com',
      password: hashedPassword,
      areas: ['programming'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Felipe Leão',
      email: 'felipe.leao@example.com',
      password: hashedPassword,
      areas: ['research'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Rafael',
      email: 'rafael@example.com',
      password: hashedPassword,
      areas: ['research'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Lucas Gambarini',
      email: 'lucas.gambarini@example.com',
      password: hashedPassword,
      areas: ['identity'],
      role: 'judge',
      isAdmin: false,
      schoolId: legacySchool.id
    },
    {
      name: 'Marcos',
      email: 'marcos@example.com',
      password: hashedPassword,
      areas: ['programming', 'research', 'identity'],
      role: 'school_admin',
      isAdmin: true,
      schoolId: legacySchool.id
    }
  ]

  for (const userData of users) {
    const existingUser = await prisma.user.findFirst({
      where: { email: userData.email }
    })
    
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: userData
      })
      console.log(`Usuário ${userData.name} atualizado`)
    } else {
      await prisma.user.create({
        data: userData
      })
      console.log(`Usuário ${userData.name} criado`)
    }
  }

  // Criar torneio padrão para compatibilidade
  let defaultTournament = await prisma.tournament.findFirst({
    where: { code: 'DEFAULT_TOURNAMENT' }
  })

  if (!defaultTournament) {
    defaultTournament = await prisma.tournament.create({
      data: {
        schoolId: legacySchool.id,
        name: 'Torneio Principal',
        code: 'DEFAULT_TOURNAMENT',
        status: 'published',
        rankingMethod: 'percentage',
        allowReevaluation: true,
        configLocked: false
      }
    })
    console.log('Torneio padrão criado')
  }

  // Criar áreas avaliativas padrão
  const areas = [
    {
      tournamentId: defaultTournament.id,
      name: 'Programação',
      code: 'programming',
      scoringType: 'performance',
      weight: 1.0,
      order: 1
    },
    {
      tournamentId: defaultTournament.id,
      name: 'Pesquisa/Storytelling',
      code: 'research',
      scoringType: 'rubric',
      weight: 1.0,
      order: 2
    },
    {
      tournamentId: defaultTournament.id,
      name: 'Torcida',
      code: 'identity',
      scoringType: 'rubric',
      weight: 1.0,
      order: 3
    }
  ]

  for (const areaData of areas) {
    const existingArea = await prisma.tournamentArea.findFirst({
      where: {
        tournamentId: areaData.tournamentId,
        code: areaData.code
      }
    })
    
    if (!existingArea) {
      await prisma.tournamentArea.create({
        data: areaData
      })
      console.log(`Área ${areaData.name} criada`)
    }
  }

  // Criar equipes conforme estrutura do torneio
  const teams = [
    // Turno Manhã
    { name: '2ºA', grade: '2', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '2ºB', grade: '2', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '3ºA', grade: '3', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '3ºB', grade: '3', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '4ºA', grade: '4', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '4ºB', grade: '4', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '5ºA', grade: '5', shift: 'morning', tournamentId: defaultTournament.id },
    { name: '5ºB', grade: '5', shift: 'morning', tournamentId: defaultTournament.id },
    
    // Turno Tarde
    { name: '2ºC', grade: '2', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '2ºD', grade: '2', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '2ºE', grade: '2', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '3ºC', grade: '3', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '3ºD', grade: '3', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '4ºC', grade: '4', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '4ºD', grade: '4', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '4ºE', grade: '4', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '5ºC', grade: '5', shift: 'afternoon', tournamentId: defaultTournament.id },
    { name: '5ºD', grade: '5', shift: 'afternoon', tournamentId: defaultTournament.id }
  ]

  for (const teamData of teams) {
    const existingTeam = await prisma.team.findFirst({
      where: { 
        tournamentId: teamData.tournamentId,
        name: teamData.name
      }
    })
    
    if (!existingTeam) {
      await prisma.team.create({
        data: teamData
      })
      console.log(`Equipe ${teamData.name} criada`)
    }
  }

  console.log('Banco de dados inicializado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
