import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  // Crear configuración de tienda
  await prisma.storeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Boutique La Moda',
      ruc: '80012345-6',
      address: 'Asunción, Paraguay',
      phone: '021 123 456',
      ticketPrefix: 'T',
      ticketNumber: 1,
    },
  })

  // Crear categorías
  const ropa = await prisma.category.upsert({
    where: { name: 'Ropa' },
    update: {},
    create: { name: 'Ropa', description: 'Prendas de vestir' },
  })

  const calzado = await prisma.category.upsert({
    where: { name: 'Calzado' },
    update: {},
    create: { name: 'Calzado', description: 'Zapatos y zapatillas' },
  })

  const accesorios = await prisma.category.upsert({
    where: { name: 'Accesorios' },
    update: {},
    create: { name: 'Accesorios', description: 'Complementos' },
  })

  // Crear marcas
  const marca1 = await prisma.brand.upsert({
    where: { name: 'Genérica' },
    update: {},
    create: { name: 'Genérica' },
  })

  // Crear productos de ejemplo
  await prisma.product.upsert({
    where: { code: 'PRD-001' },
    update: {},
    create: {
      code: 'PRD-001',
      name: 'Camiseta Básica',
      price: 150000,
      cost: 80000,
      minStock: 5,
      categoryId: ropa.id,
      brandId: marca1.id,
      trackStock: true,
    },
  })

  await prisma.product.upsert({
    where: { code: 'PRD-002' },
    update: {},
    create: {
      code: 'PRD-002',
      name: 'Pantalón Jeans',
      price: 350000,
      cost: 200000,
      minStock: 3,
      categoryId: ropa.id,
      brandId: marca1.id,
      trackStock: true,
    },
  })

  await prisma.product.upsert({
    where: { code: 'PRD-003' },
    update: {},
    create: {
      code: 'PRD-003',
      name: 'Vestido',
      price: 450000,
      cost: 250000,
      minStock: 2,
      categoryId: ropa.id,
      brandId: marca1.id,
      trackStock: true,
    },
  })

  const adminPassword = await hashPassword('admin123')
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  })

  const cashierPassword = await hashPassword('cajero123')
  await prisma.user.upsert({
    where: { username: 'cajero' },
    update: {},
    create: {
      name: 'Cajero',
      username: 'cajero',
      password: cashierPassword,
      role: 'CAJERO',
      active: true,
    },
  })

  console.log('✅ Seed completado')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
