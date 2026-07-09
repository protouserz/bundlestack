-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" REAL NOT NULL,
    "appliesOncePerCustomer" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "discountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_shop_code_key" ON "Coupon"("shop", "code");

-- CreateIndex
CREATE INDEX "Coupon_shop_status_idx" ON "Coupon"("shop", "status");
