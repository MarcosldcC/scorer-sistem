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

  // Criar equipes conforme estrutura do torneio
  const teams = [
    // Turno Manhã
    { name: '2ºA', grade: '2', shift: 'morning' },
    { name: '2ºB', grade: '2', shift: 'morning' },
    { name: '3ºA', grade: '3', shift: 'morning' },
    { name: '3ºB', grade: '3', shift: 'morning' },
    { name: '4ºA', grade: '4', shift: 'morning' },
    { name: '4ºB', grade: '4', shift: 'morning' },
    { name: '5ºA', grade: '5', shift: 'morning' },
    { name: '5ºB', grade: '5', shift: 'morning' },
    
    // Turno Tarde
    { name: '2ºC', grade: '2', shift: 'afternoon' },
    { name: '2ºD', grade: '2', shift: 'afternoon' },
    { name: '2ºE', grade: '2', shift: 'afternoon' },
    { name: '3ºC', grade: '3', shift: 'afternoon' },
    { name: '3ºD', grade: '3', shift: 'afternoon' },
    { name: '4ºC', grade: '4', shift: 'afternoon' },
    { name: '4ºD', grade: '4', shift: 'afternoon' },
    { name: '4ºE', grade: '4', shift: 'afternoon' },
    { name: '5ºC', grade: '5', shift: 'afternoon' },
    { name: '5ºD', grade: '5', shift: 'afternoon' }
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
