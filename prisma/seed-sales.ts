import { PrismaClient } from '../src/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0)
  return d
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🌱 Seeding realistic sales data...')

  // Get users, medicines, patients
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const pharmacist = await prisma.user.findFirst({ where: { role: 'PHARMACIST' } })
  const patients = await prisma.patient.findMany({ where: { consentFlag: true } })

  const medicines = await prisma.medicine.findMany({
    include: { batches: { orderBy: { expiryDate: 'asc' } } }
  })

  if (!admin || !pharmacist) {
    console.error('❌ No users found. Run npx prisma db seed first.')
    return
  }

  if (medicines.length === 0) {
    console.error('❌ No medicines found. Run npx prisma db seed first.')
    return
  }

  // Delete existing sales for clean slate
  await prisma.saleItem.deleteMany({})
  await prisma.sale.deleteMany({})
  console.log('🧹 Cleared existing sales')

  const users = [admin, pharmacist]
  const paymentMethods = ['CASH', 'CASH', 'CASH', 'CARD'] // 75% cash

  // Realistic daily sales patterns
  // Higher sales on weekends, month ends, and random spikes
  const salesData = []

  for (let day = 89; day >= 0; day--) {
    const date = daysAgo(day)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Number of transactions per day (5-25, more on weekends)
    const txCount = isWeekend
      ? randomInt(12, 25)
      : randomInt(5, 18)

    for (let t = 0; t < txCount; t++) {
      // Pick 1-4 medicines per transaction
      const itemCount = randomInt(1, 4)
      const shuffled = [...medicines].sort(() => Math.random() - 0.5)
      const selectedMeds = shuffled.slice(0, itemCount)

      const user = users[Math.floor(Math.random() * users.length)]
      const patient = Math.random() > 0.4 ? patients[Math.floor(Math.random() * patients.length)] : null
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

      let totalAmount = 0
      const items = []

      for (const med of selectedMeds) {
        const quantity = randomInt(1, 5)
        const unitPrice = Number(med.unitPrice)
        const lineTotal = quantity * unitPrice
        totalAmount += lineTotal
        items.push({
          medicineId: med.id,
          quantity,
          unitPrice,
          totalAmount: lineTotal,
        })
      }

      salesData.push({
        date,
        totalAmount,
        paymentMethod,
        userId: user.id,
        patientId: patient?.id || null,
        items,
      })
    }
  }

  // Create sales in batches
  let created = 0
  for (const sale of salesData) {
    try {
      await prisma.sale.create({
        data: {
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          userId: sale.userId,
          patientId: sale.patientId,
          createdAt: sale.date,
          saleItems: {
            create: sale.items.map(item => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
            }))
          }
        }
      })
      created++
    } catch (e: any) {
      // Skip if batch stock issue
    }
  }

  console.log(`✅ Created ${created} sales transactions over 90 days`)

  // Summary
  const totalRevenue = await prisma.sale.aggregate({ _sum: { totalAmount: true } })
  const totalSales = await prisma.sale.count()
  console.log(`💰 Total revenue: LKR ${Number(totalRevenue._sum.totalAmount ?? 0).toLocaleString()}`)
  console.log(`📊 Total transactions: ${totalSales}`)
  console.log('🎉 Sales seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())