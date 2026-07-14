-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "appliesTo" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "Coupon" ADD COLUMN "productIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Coupon" ADD COLUMN "excludedProductIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Coupon" ADD COLUMN "eligibleCollectionId" TEXT;
