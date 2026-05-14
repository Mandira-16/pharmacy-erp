import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
dotenv.config()

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  console.log('Seeding database...')

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    update: {},
    create: {
      email: 'admin@pharmacy.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  const pharmacistPassword = await bcrypt.hash('Pharma@1234', 12)
  const pharmacist = await prisma.user.upsert({
    where: { email: 'pharmacist@pharmacy.com' },
    update: {},
    create: {
      email: 'pharmacist@pharmacy.com',
      passwordHash: pharmacistPassword,
      name: 'Dr. R. De Silva',
      role: 'PHARMACIST',
      isActive: true,
    },
  })
  console.log('✅ Pharmacist user created:', pharmacist.email)

  const ownerPassword = await bcrypt.hash('Owner@1234', 12)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@pharmacy.com' },
    update: {},
    create: {
      email: 'owner@pharmacy.com',
      passwordHash: ownerPassword,
      name: 'Pharmacy Owner',
      role: 'OWNER',
      isActive: true,
    },
  })
  console.log('✅ Owner user created:', owner.email)

  await prisma.user.upsert({
  where: { email: 'assistant@pharmacy.com' },
  update: {},
  create: {
    email: 'assistant@pharmacy.com',
    name: 'Assistant Pharmacist',
    passwordHash: await bcrypt.hash('Assistant@1234', 12),
    role: 'ASSISTANT',
    isActive: true,
  },
})

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'supplier-001' },
    update: {},
    create: {
      id: 'supplier-001',
      name: 'Hemas Pharmaceuticals',
      contactInfo: 'hemas@pharma.lk | +94 11 4 731 731',
    },
  })

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'supplier-002' },
    update: {},
    create: {
      id: 'supplier-002',
      name: 'CIC Holdings',
      contactInfo: 'cic@pharma.lk | +94 11 2 499 000',
    },
  })
  console.log('✅ Suppliers created')

  // ── Patients ────────────────────────────────────────────────────────────────
  const patients = [
    {
      id: 'patient-001',
      name: 'Kumara Wijesekara',
      nic: '700123456V',
      phone: '077-1234567',
      email: 'kumara.w@gmail.com',
      consentFlag: true,
    },
    {
      id: 'patient-002',
      name: 'Samantha Rajapaksa',
      nic: '850234567V',
      phone: '071-2345678',
      email: 'samantha.r@gmail.com',
      consentFlag: true,
    },
    {
      id: 'patient-003',
      name: 'Nimal Jayawardena',
      nic: '580345678V',
      phone: '076-3456789',
      email: null,
      consentFlag: false,
    },
    {
      id: 'patient-004',
      name: 'Dilini Weerasinghe',
      nic: '920456789V',
      phone: '078-4567890',
      email: 'dilini.w@yahoo.com',
      consentFlag: false,
    },
    {
      id: 'patient-005',
      name: 'Ruwan Bandara',
      nic: '800567890V',
      phone: '072-5678901',
      email: 'ruwan.b@gmail.com',
      consentFlag: true,
    },
    {
      id: 'patient-006',
      name: 'Priyanka Fernando',
      nic: '910678901V',
      phone: '077-6789012',
      email: 'priyanka.f@gmail.com',
      consentFlag: true,
    },
    {
      id: 'patient-007',
      name: 'Sunil Perera',
      nic: '650789012V',
      phone: '071-7890123',
      email: null,
      consentFlag: true,
    },
  ]

  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: {},
      create: patient,
    })
  }

  console.log('✅ Patients seeded')

  // ── Medicines ──────────────────────────────────────────────────────────────
  // Mix of scenarios:
  // - Some with expiry < 90 days and surplus stock  → triggers FR12 Expiry Liquidation
  // - Some with low stock vs predicted demand       → triggers FR13 Stockout Risk

  const medicines = [
    {
      id: 'med-001',
      sku: 'AMX-500',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      category: 'Antibiotic',
      unitPrice: 45.00,
      reorderPoint: 100,
      avgDailySales: 25,
      supplierId: supplier1.id,
      batches: [
        { batchNumber: 'B001-A', quantity: 800, expiryDate: daysFromNow(20) },  // expiry soon → FR12
        { batchNumber: 'B001-B', quantity: 200, expiryDate: daysFromNow(180) },
      ],
    },
    {
      id: 'med-002',
      sku: 'MET-250',
      name: 'Metformin 250mg',
      genericName: 'Metformin HCl',
      category: 'Antidiabetic',
      unitPrice: 12.50,
      reorderPoint: 200,
      avgDailySales: 40,
      supplierId: supplier1.id,
      batches: [
        { batchNumber: 'B002-A', quantity: 50, expiryDate: daysFromNow(365) },  // low stock → FR13
      ],
    },
    {
      id: 'med-003',
      sku: 'AML-5',
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine Besylate',
      category: 'Antihypertensive',
      unitPrice: 8.75,
      reorderPoint: 150,
      avgDailySales: 30,
      supplierId: supplier2.id,
      batches: [
        { batchNumber: 'B003-A', quantity: 500, expiryDate: daysFromNow(45) },  // expiry 45 days → FR12
        { batchNumber: 'B003-B', quantity: 100, expiryDate: daysFromNow(400) },
      ],
    },
    {
      id: 'med-004',
      sku: 'OMS-20',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      category: 'Antacid',
      unitPrice: 22.00,
      reorderPoint: 100,
      avgDailySales: 35,
      supplierId: supplier2.id,
      batches: [
        { batchNumber: 'B004-A', quantity: 30, expiryDate: daysFromNow(300) },  // very low stock → FR13 critical
      ],
    },
    {
      id: 'med-005',
      sku: 'PCM-500',
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      category: 'Analgesic',
      unitPrice: 5.50,
      reorderPoint: 300,
      avgDailySales: 80,
      supplierId: supplier1.id,
      batches: [
        { batchNumber: 'B005-A', quantity: 2000, expiryDate: daysFromNow(500) },
        { batchNumber: 'B005-B', quantity: 1000, expiryDate: daysFromNow(600) },
      ],
    },
    {
      id: 'med-006',
      sku: 'ATR-10',
      name: 'Atorvastatin 10mg',
      genericName: 'Atorvastatin Calcium',
      category: 'Antilipemic',
      unitPrice: 35.00,
      reorderPoint: 100,
      avgDailySales: 20,
      supplierId: supplier2.id,
      batches: [
        { batchNumber: 'B006-A', quantity: 600, expiryDate: daysFromNow(60) },  // 60 days → FR12
      ],
    },
    {
      id: 'med-007',
      sku: 'CET-10',
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine HCl',
      category: 'Antihistamine',
      unitPrice: 15.00,
      reorderPoint: 80,
      avgDailySales: 15,
      supplierId: supplier1.id,
      batches: [
        { batchNumber: 'B007-A', quantity: 0, expiryDate: daysFromNow(365) },   // zero stock → FR13 critical
      ],
    },
    {
      id: 'med-008',
      sku: 'IBP-400',
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      category: 'NSAID',
      unitPrice: 18.00,
      reorderPoint: 120,
      avgDailySales: 28,
      supplierId: supplier2.id,
      batches: [
        { batchNumber: 'B008-A', quantity: 450, expiryDate: daysFromNow(730) },
      ],
    },
    {
      id: 'med-009',
      sku: 'ASP-75',
      name: 'Aspirin 75mg',
      genericName: 'Acetylsalicylic Acid',
      category: 'Antiplatelet',
      unitPrice: 6.00,
      reorderPoint: 200,
      avgDailySales: 45,
      supplierId: supplier1.id,
      batches: [
        { batchNumber: 'B009-A', quantity: 100, expiryDate: daysFromNow(200) }, // low stock vs demand → FR13
      ],
    },
    {
      id: 'med-010',
      sku: 'GLC-500',
      name: 'Glibenclamide 500mg',
      genericName: 'Glibenclamide',
      category: 'Antidiabetic',
      unitPrice: 28.00,
      reorderPoint: 80,
      avgDailySales: 18,
      supplierId: supplier2.id,
      batches: [
        { batchNumber: 'B010-A', quantity: 700, expiryDate: daysFromNow(25) },  // expiry soon surplus → FR12
        { batchNumber: 'B010-B', quantity: 50, expiryDate: daysFromNow(400) },
      ],
    },
  ]

  for (const med of medicines) {
    const { batches, ...medData } = med
    await prisma.medicine.upsert({
      where: { id: med.id },
      update: {},
      create: medData,
    })
    for (const batch of batches) {
      await prisma.batch.create({ data: { ...batch, medicineId: med.id } })
    }
  }
  console.log('✅ Medicines and batches created (10 medicines)')

  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('── Login Credentials ──────────────────')
  console.log('Admin:      admin@pharmacy.com / Admin@1234')
  console.log('Pharmacist: pharmacist@pharmacy.com / Pharma@1234')
  console.log('Owner:      owner@pharmacy.com / Owner@1234')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })