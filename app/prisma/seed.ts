import { PrismaClient } from '../src/generated/prisma/client.js'

import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/admin-auth'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing todos
  await prisma.todo.deleteMany()

  // Create example todos
  const todos = await prisma.todo.createMany({
    data: [
      { title: 'Buy groceries' },
      { title: 'Read a book' },
      { title: 'Workout' },
    ],
  })

  console.log(`✅ Created ${todos.count} todos`)

  // Create default admin account
  const adminEmail = 'admin@wesmp.com'
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const hashedPassword = await hashPassword('admin')
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        isActive: true,
      },
    })
    console.log('✅ Created default admin account')
    console.log(`   Email: ${adminEmail}`)
    console.log('   Password: admin')
  } else {
    console.log('ℹ️  Admin account already exists')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
