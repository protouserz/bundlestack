-- CreateTable
CREATE TABLE "BundleOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offerType" TEXT NOT NULL DEFAULT 'quantity_break',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "productIds" TEXT NOT NULL,
    "tiers" TEXT NOT NULL,
    "revenueGenerated" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "billingPlan" TEXT NOT NULL DEFAULT 'free',
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BundleOffer_shop_status_idx" ON "BundleOffer"("shop", "status");
