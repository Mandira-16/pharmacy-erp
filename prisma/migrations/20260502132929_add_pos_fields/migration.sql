-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "doctorName" TEXT,
ADD COLUMN     "doctorSlmc" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';
