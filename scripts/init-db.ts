import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Inicializando banco de dados...')

  // Hash da senha padrão
  const hashedPassword = await bcrypt.hash('inicial@123', 10)

  // Criar usuários
  const users = [
    {
      name: 'Marina Vitória',
      password: hashedPassword,
      areas: ['programming'],
      isAdmin: false
    },
    {
      name: 'Gabrielly Barreto',
      password: hashedPassword,
      areas: ['programming'],
      isAdmin: false
    },
    {
      name: 'Gabrielly Araújo',
      password: hashedPassword,
      areas: ['programming'],
      isAdmin: false
    },
    {
      name: 'Camila Letícia',
      password: hashedPassword,
      areas: ['programming'],
      isAdmin: false
    },
    {
      name: 'Ana Carolina',
      password: hashedPassword,
      areas: ['programming'],
      isAdmin: false
    },
    {
      name: 'Felipe Leão',
      password: hashedPassword,
      areas: ['research'],
      isAdmin: false
    },
    {
      name: 'Rafael',
      password: hashedPassword,
      areas: ['research'],
      isAdmin: false
    },
    {
      name: 'Lucas Gambarini',
      password: hashedPassword,
      areas: ['identity'],
      isAdmin: false
    },
    {
      name: 'Marcos',
      password: hashedPassword,
      areas: ['programming', 'research', 'identity'],
      isAdmin: true
    }
  ]

  for (const userData of users) {
    const existingUser = await prisma.user.findFirst({
      where: { name: userData.name }
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

  // Criar algumas equipes de exemplo
  const teams = [
    { name: 'Robô Guerreiros', grade: '2', shift: 'morning' },
    { name: 'Tech Titans', grade: '2', shift: 'morning' },
    { name: 'Code Masters', grade: '3', shift: 'morning' },
    { name: 'Robo Rangers', grade: '3', shift: 'afternoon' },
    { name: 'Digital Dragons', grade: '4', shift: 'afternoon' },
    { name: 'Cyber Squad', grade: '4', shift: 'morning' },
    { name: 'Bot Builders', grade: '5', shift: 'afternoon' },
    { name: 'Future Coders', grade: '5', shift: 'morning' }
  ]

  for (const teamData of teams) {
    const existingTeam = await prisma.team.findFirst({
      where: { 
        name: teamData.name,
        grade: teamData.grade,
        shift: teamData.shift
      }
    })
    
    if (existingTeam) {
      await prisma.team.update({
        where: { id: existingTeam.id },
        data: teamData
      })
      console.log(`Equipe ${teamData.name} atualizada`)
    } else {
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
