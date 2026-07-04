-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BundleOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offerType" TEXT NOT NULL DEFAULT 'quantity_break',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "productIds" TEXT NOT NULL,
    "tiers" TEXT NOT NULL,
    "discountIds" TEXT NOT NULL DEFAULT '[]',
    "revenueGenerated" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BundleOffer" ("createdAt", "id", "offerType", "productIds", "revenueGenerated", "shop", "status", "tiers", "title", "updatedAt") SELECT "createdAt", "id", "offerType", "productIds", "revenueGenerated", "shop", "status", "tiers", "title", "updatedAt" FROM "BundleOffer";
DROP TABLE "BundleOffer";
ALTER TABLE "new_BundleOffer" RENAME TO "BundleOffer";
CREATE INDEX "BundleOffer_shop_status_idx" ON "BundleOffer"("shop", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
