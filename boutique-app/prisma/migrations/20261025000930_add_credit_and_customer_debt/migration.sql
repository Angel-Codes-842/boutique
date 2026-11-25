-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDITO';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "debt" INTEGER NOT NULL DEFAULT 0;
