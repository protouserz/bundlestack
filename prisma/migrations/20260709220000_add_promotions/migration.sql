-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promotionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "config" TEXT NOT NULL DEFAULT '{}',
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "collectionIds" TEXT NOT NULL DEFAULT '[]',
    "discountIds" TEXT NOT NULL DEFAULT '[]',
    "discountUses" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Promotion_shop_promotionType_status_idx" ON "Promotion"("shop", "promotionType", "status");

-- CreateIndex
CREATE INDEX "Promotion_shop_status_idx" ON "Promotion"("shop", "status");
