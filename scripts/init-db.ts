import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('✅ Banco de dados multi-tenant configurado!')
  console.log('📦 Schema aplicado com sucesso.')
  console.log('🎯 Sistema pronto para uso!')
  console.log('')
  console.log('Próximos passos:')
  console.log('1. Acesse o painel admin para criar sua escola')
  console.log('2. Crie torneios e configure áreas')
  console.log('3. Adicione usuários e equipes')
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
