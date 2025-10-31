import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('✅ Banco de dados multi-tenant configurado!')
  console.log('📦 Schema aplicado com sucesso.')
  console.log('')
  
  // Create a platform admin user for initial setup
  const hashedPassword = await bcrypt.hash('admin@123', 10)
  
  const platformAdmin = await prisma.user.findFirst({
    where: { role: 'platform_admin' }
  })
  
  if (!platformAdmin) {
    await prisma.user.create({
      data: {
        name: 'Administrador da Plataforma',
        email: 'admin@scorer.platform',
        password: hashedPassword,
        role: 'platform_admin',
        isAdmin: true,
        isActive: true,
        isFirstLogin: false
      }
    })
    console.log('👤 Admin da plataforma criado!')
    console.log('   Email: admin@scorer.platform')
    console.log('   Senha: admin@123')
    console.log('')
  }
  
  console.log('🎯 Sistema pronto para uso!')
  console.log('')
  console.log('Próximos passos:')
  console.log('1. Faça login com o admin da plataforma')
  console.log('2. Crie sua escola')
  console.log('3. Crie torneios e configure áreas')
  console.log('4. Adicione usuários e equipes')
  console.log('')
  console.log('🚀 Aproveite o sistema!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
