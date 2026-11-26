export const en = {
  "nav.dashboard": "Dashboard",
  "nav.offers": "Offers",
  "nav.promotions": "Promotions",
  "nav.coupons": "Coupons",
  "nav.billing": "Billing",
  "nav.support": "Support",

  "footer.helpTrust": "Help & trust",
  "footer.support": "Support",
  "footer.privacy": "Privacy policy",

  "common.loading": "Loading",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.dismiss": "Dismiss",
  "common.pro": "Pro",
  "common.free": "Free",
  "common.tryToFix": "Try to fix",
  "common.fixing": "Fixing…",
  "common.manage": "Manage",
  "common.view": "View",
  "common.upgradeToPro": "Upgrade to Pro",
  "common.deleteAll": "Delete all",
  "common.currentPlan": "Current plan",

  "status.active": "Active",
  "status.draft": "Draft",
  "status.paused": "Paused",
  "status.activeHelpOffer":
    "Offer will be active and available to customers.",
  "status.draftHelpOffer":
    "Offer is saved but discounts are not synced yet.",
  "status.pausedHelpOffer":
    "Offer is paused and discounts will be removed.",
  "status.activeHelpPromo":
    "Offer is live for shoppers and syncs to the Shopify Discount Function.",
  "status.draftHelpPromo":
    "Saved in BundleStack but not offered to shoppers yet.",
  "status.pausedHelpPromo":
    "Hidden from shoppers until you activate it again.",

  "dashboard.title": "Dashboard",
  "dashboard.offerLive": "Your offer is live",
  "dashboard.customizeOffer": "Customize offer",
  "dashboard.createOffer": "Create offer",
  "dashboard.showOnProductPages": "Show on product pages",
  "dashboard.reportingPeriod": "Reporting period: {range}",
  "dashboard.promotionsAndCoupons": "Promotions and coupons",
  "dashboard.promotionsPaid":
    "Free gifts, mix and match, bundle builders, frequently bought together, and checkout discount codes.",
  "dashboard.promotionsFree":
    "Frequently bought together (upsell and cross-sell) is included. Free gifts, mix and match, builders, and coupons unlock on Pro.",
  "dashboard.refreshStats": "Refresh redemption stats",
  "dashboard.planLine": "Current plan: ",
  "dashboard.perMonth": " · ${price}/mo",
  "dashboard.freeTier": " · Free tier",
  "dashboard.viewBilling": "View billing details",
  "dashboard.systemChecks": "System checks",

  "metrics.activeOffers": "Active offers",
  "metrics.totalConfigured": "{count} total configured",
  "metrics.discountRedemptions": "Discount redemptions",
  "metrics.redemptionsSynced": "Synced from Shopify automatic discounts",
  "metrics.redemptionsEmpty": "Updates when shoppers use your bundle tiers",
  "metrics.storeHealth": "Store health",
  "metrics.healthGood": "Good",
  "metrics.healthAttention": "Needs attention",
  "metrics.healthCritical": "Action required",
  "metrics.allOperational": "All systems operational",
  "metrics.reviewChecks": "Review system checks below",

  "setup.heading": "Make it yours",
  "setup.subtitle":
    "The default offer is already live at checkout. Change products and percents first, then optionally show the widget on product pages.",
  "setup.changeProductsTitle": "Change products and discounts",
  "setup.changeProductsBody":
    "Checkout already runs Buy 2 save 10% and Buy 3 save 15% on every product. Pick specific products, change the percents, or switch to BOGO.",
  "setup.showWidgetTitle": "Show this on product pages",
  "setup.showWidgetBody":
    "Checkout already works. One Save in the theme editor puts the widget above Add to cart. Heading and colors are in the block settings.",
  "setup.confirmTitle": "Confirm on a live product",
  "setup.confirmBodyNamed":
    "After you save the theme, open {title}. The same widget should appear above Add to cart.",
  "setup.confirmBody":
    "After you save the theme, open any product. The same widget should appear above Add to cart.",
  "setup.previewLive": "Preview on a live product",
  "setup.createTitle": "Create an offer",
  "setup.createBody":
    "Set Buy 2 / Buy 3 quantity breaks or a buy-one-get-one-free deal, then set the offer to Active.",
  "setup.showOffersTitle": "Show offers on product pages",
  "setup.showOffersBody":
    "Checkout already works once an offer is active. One Save in the theme editor puts the widget on product pages.",

  "theme.liveOnProductPages": "Live on product pages",
  "theme.liveAtCheckout": "Quantity breaks are live at checkout",
  "theme.embedOn":
    "{name} is active on your published theme. Checkout discounts and the product-page widget are both on. Change products, percents, or widget colors anytime.",
  "theme.embedOff":
    "Buy 2 save 10% and Buy 3 save 15% already apply at checkout on every product. Shoppers do not enter a code. Change products or percents anytime.",
  "theme.optionalWidget":
    "Optional: show the same offer on product pages. Enable {name} in the theme editor to set heading and colors, then click Save.",
  "theme.previewNamedOn": "Preview of {title} on a product page.",
  "theme.previewLiveWidget": "Preview of the live product-page widget.",
  "theme.previewNamedCheckout":
    "Preview of {title} — this is already what checkout will discount.",
  "theme.previewInsideApp":
    "Preview inside the app. Checkout already uses these tiers.",
  "theme.previewAria": "Example quantity offers",
  "theme.openLiveProduct": "Open live product",
  "theme.blockFallback": "BundleStack offers",

  "health.activeOffers": "Active offers",
  "health.activeOffersOk": "{count} active offer(s) configured.",
  "health.activeOffersNone":
    "No active offers. Create one and set status to Active.",
  "health.createOffer": "Create offer",
  "health.shopifyDiscounts": "Shopify discounts",
  "health.discountsOk": "All active offers have discount rules linked.",
  "health.discountsMissing":
    "{count} active offer(s) missing synced discounts.",
  "health.syncDiscounts": "Sync discounts",
  "health.verification": "Discount verification",
  "health.verificationOk": "All discount rules verified in Shopify.",
  "health.verificationMissing": "{count} discount(s) missing in Shopify.",
  "health.recreate": "Recreate discounts",
  "health.storefrontApi": "Storefront API",
  "health.storefrontOk": "App proxy configured at /apps/bundlestack/offers",
  "health.ok": "ok",
  "health.warning": "warning",
  "health.error": "error",

  "offers.title": "Offers",
  "offers.create": "Create offer",
  "offers.intro":
    "Quantity-break and buy-one-get-one offers encourage shoppers to buy more — synced automatically as Shopify discounts at checkout.",
  "offers.emptyHeading": "No offers yet",
  "offers.emptyBody":
    'Create a quantity-break offer — e.g. "Buy 2, save 10%" — or a buy-one-get-one-free deal, then assign it to products.',
  "offers.count": "{count} offer",
  "offers.count_other": "{count} offers",
  "offers.deleteAllTitle": "Delete all offers?",
  "offers.deleteAllA11y": "Confirm deleting all offers",
  "offers.deleteAllBody":
    "This will permanently delete {count} offer(s) and remove all synced Shopify discounts. This action cannot be undone.",
  "offers.edit": "Edit offer",
  "offers.editTitle": "Edit offer",
  "offers.createTitle": "Create offer",
  "offers.back": "← Back to offers",
  "offers.details": "Offer details",
  "offers.name": "Offer name",
  "offers.namePlaceholder": "Volume Discount Offer",
  "offers.type": "Offer type",
  "offers.typeQuantity": "Quantity discount",
  "offers.typeBogo": "Buy one get one free",
  "offers.products": "Products",
  "offers.productsHelp":
    "Apply this offer to the whole catalog, or pick specific products.",
  "offers.allProducts": "All products",
  "offers.allProductsBogo":
    "Shoppers get the free item on every product when they buy the required quantity.",
  "offers.allProductsQty":
    "Shoppers see Buy 2 / Buy 3 tiers on every product page.",
  "offers.browse": "Browse products",
  "offers.bogoSection": "Buy one get one",
  "offers.tiersSection": "Quantity tiers",
  "offers.bogoHelp":
    "The cheapest matching units are free once the shopper buys the required quantity of the same product.",
  "offers.tiersHelp": "Set the quantity breaks and discount to apply.",
  "offers.buy": "Buy",
  "offers.getFree": "Get free",
  "offers.minQty": "Minimum quantity",
  "offers.discount": "Discount",
  "offers.removeTier": "Remove tier {n}",
  "offers.remove": "Remove",
  "offers.addTier": "Add tier",
  "offers.summary": "Summary",
  "offers.deal": "Deal",
  "offers.redemptions": "Redemptions",
  "offers.discountsSynced": "Discounts synced",
  "offers.status": "Status",
  "offers.danger": "Danger zone",
  "offers.dangerBody":
    "Permanently delete this offer and remove its Shopify discounts.",
  "offers.productCount": "{count} product",
  "offers.productCount_other": "{count} products",
  "offers.tierCount": "{count} tier",
  "offers.tierCount_other": "{count} tiers",
  "offers.tiersRedemptions":
    "{tiers} tier(s) · {uses} redemptions",
  "offers.syncedToShopify": " · synced to Shopify",
  "offers.buyPlusOff": "Buy {qty}+ → {off}",
  "offers.pctOff": "{value}% off",
  "offers.amtOff": "${value} off",
  "offers.mixed": "Mixed",
  "offers.percentage": "Percentage",
  "offers.fixedAmount": "Fixed amount",
  "offers.bogo": "BOGO",
  "offers.quantityBreak": "Quantity break",
  "offers.upToPct": "Up to {value}% off",
  "offers.upToAmt": "Up to ${value} off",

  "widget.look": "Widget look",
  "widget.lookHelp":
    "Heading and colors for the product-page widget. Match theme uses your store’s buttons and text. Checkout discounts stay the same.",
  "widget.presets": "Look presets",
  "widget.heading": "Heading",
  "widget.matchTheme": "Match theme",
  "widget.emerald": "Emerald",
  "widget.navy": "Navy",
  "widget.liveTheme":
    "Live product pages use Add to cart and text colors from your theme. The preview below is an example.",
  "widget.themeNote": "Colors follow your live theme.",
  "widget.preview": "Preview",
  "widget.accent": "Accent",
  "widget.background": "Background",
  "widget.text": "Text",
  "widget.selectedRow": "Selected row",
  "widget.colorAria": "{label} color",

  "storefront.heading": "Buy more, save more",
  "storefront.buy": "Buy {qty}",
  "storefront.buyGetFree": "Buy {buy} get {get} free",
  "storefront.buySave": "Buy {qty}, save {saving}",
  "storefront.free": "Free",
  "storefront.savePercent": "Save {value}%",
  "storefront.saveAmount": "Save {value}",
  "storefront.each": "each",
  "storefront.unitEach": "{price} each",

  "picker.search": "Search products",
  "picker.empty":
    "No products selected. Click browse to choose products for this offer.",
  "picker.included": "Included in offer",
  "picker.remove": "Remove {title}",

  "table.recent": "Recent offers",
  "table.empty": "No offers yet. ",
  "table.createFirst": "Create your first offer",
  "table.offerName": "Offer name",
  "table.status": "Status",
  "table.products": "Products",
  "table.discountType": "Discount type",
  "table.created": "Created",
  "table.redemptions": "Redemptions",
  "table.edit": "Edit",
  "table.viewAll": "View all offers",

  "top.title": "Top performing offers",
  "top.empty": "Create an offer to see performance here.",
  "top.uses": "{count} uses",

  "chart.title": "Discount redemptions over time",
  "chart.empty":
    "Redemption counts appear here once shoppers use your bundle tiers.",
  "chart.aria": "Discount redemptions over the last 30 days",

  "promotions.title": "Promotions",
  "promotions.introPaid":
    "Grow order value beyond quantity breaks. Each type syncs to checkout automatically — shoppers see the deal on the product page after you save the theme embed.",
  "promotions.introFree":
    "Frequently bought together (upsell and cross-sell) is included. Free gifts, mix & match, builders, and extra BOGO types unlock on Pro.",
  "promotions.count": "{count} promotion",
  "promotions.count_other": "{count} promotions",
  "promotions.live": "{count} live",
  "promotions.bogo": "BOGO",
  "promotions.bogoShort": "BOGO",
  "promotions.bogoDesc":
    "Buy X get Y free or discounted — classic volume upsell.",
  "promotions.bogoExample": "Buy 1, get 1 free",
  "promotions.gifts": "Free gifts",
  "promotions.giftsShort": "Gifts",
  "promotions.giftsDesc":
    "Reward carts that hit a spend or quantity threshold with a free product.",
  "promotions.giftsExample": "Free gift over $50",
  "promotions.mix": "Mix & match",
  "promotions.mixShort": "Mix",
  "promotions.mixDesc":
    "Let shoppers pick any N items from a set and unlock a discount.",
  "promotions.mixExample": "Any 3, 15% off",
  "promotions.builder": "Bundle builder",
  "promotions.builderShort": "Builder",
  "promotions.builderDesc":
    "Guided multi-step kits (pick base, add-ons, extras) with a bundle price.",
  "promotions.builderExample": "Pick a kit, save 10%",
  "promotions.fbt": "Frequently bought together",
  "promotions.fbtShort": "FBT",
  "promotions.fbtDesc":
    "Product-page upsells that discount complementary items bought together.",
  "promotions.fbtExample": "Add-on 10% off",
  "promotions.locked":
    "This promotion type is included on the {plan} plan. Your current plan is {current}.",
  "promotions.deleteConfirm":
    "Delete \"{title}\"? This cannot be undone.",
  "promotions.synced": " · synced at checkout",
  "promotions.pending": " · checkout sync pending",
  "promotions.newTitle": "New {label}",
  "promotions.details": "Offer details",
  "promotions.name": "Name",
  "promotions.getProducts": "Get products",
  "promotions.giftProducts": "Gift products",
  "promotions.recommended": "Recommended products",
  "promotions.rules": "Rules",
  "promotions.buyQty": "Buy quantity",
  "promotions.getQty": "Get quantity",
  "promotions.getDiscount": "Get discount",
  "promotions.free": "Free",
  "promotions.pctOff": "Percentage off",
  "promotions.fixedOff": "Fixed amount off",
  "promotions.discountValue": "Discount value",
  "promotions.sameProduct": "Same product",
  "promotions.sameYes": "Yes (same product)",
  "promotions.sameNo": "No (different get products)",
  "promotions.minSubtotal": "Min subtotal (USD)",
  "promotions.minQty": "Min quantity",
  "promotions.giftQty": "Gift quantity",
  "promotions.autoAdd": "Auto-add gift",
  "promotions.autoNo": "No — customer chooses",
  "promotions.autoYes": "Yes — add automatically",
  "promotions.minItems": "Minimum items",
  "promotions.discountType": "Discount type",
  "promotions.percentage": "Percentage",
  "promotions.fixedAmount": "Fixed amount",
  "promotions.steps": "Steps",
  "promotions.bundleDiscountType": "Bundle discount type",
  "promotions.headline": "Headline",
  "promotions.requireAll": "Require all recommended",
  "promotions.summaryBuyGet": "Buy {buy}, get {get} {deal}",
  "promotions.summaryGiftOver": "Free gift over ${amount}",
  "promotions.summaryGiftAt": "Free gift at {count}+ items",
  "promotions.summaryGift": "Free gift offer",
  "promotions.summaryMix": "Any {count}+ · {off}",
  "promotions.summaryBuilder": "{count} steps · {off}",
  "promotions.summaryFbt": "{count} upsell(s) · {off}",
  "promotions.back": "← Back",
  "promotions.createTitle": "Create {label}",
  "promotions.editTitle": "Edit {label}",
  "promotions.dealFree": "free",
  "promotions.dealPct": "{value}% off",
  "promotions.dealAmt": "${value} off",

  "coupons.title": "Coupons",
  "coupons.locked":
    "Coupons are included on the {plan} plan. Your current plan is {current}.",
  "coupons.create": "Create coupon",
  "coupons.intro":
    "Checkout codes for a percentage or a fixed amount off. Shoppers enter the code at checkout — these are Shopify discount codes, not gift-card balances.",
  "coupons.emptyTitle": "Create your first code",
  "coupons.emptyBody":
    "Try something shoppers will remember, like SAVE10 for 10% off, or a fixed amount for a gift-style credit at checkout.",
  "coupons.noCodes": "No codes yet",
  "coupons.deleteAllTitle": "Delete all coupons?",
  "coupons.deleteAllA11y": "Confirm deleting all coupons",
  "coupons.deleteAllBody":
    "This will permanently delete {count} coupon(s) and remove synced Shopify discount codes.",
  "coupons.deleteConfirm":
    "Delete \"{title}\" ({code})? The synced Shopify discount code will be removed.",
  "coupons.synced": "Synced to Shopify",
  "coupons.notSynced": "Not synced yet",
  "coupons.details": "Coupon details",
  "coupons.name": "Name",
  "coupons.code": "Code",
  "coupons.discount": "Discount",
  "coupons.type": "Type",
  "coupons.pctOff": "Percentage off",
  "coupons.fixedOff": "Fixed amount off",
  "coupons.limits": "Limits & schedule",
  "coupons.usageLimit": "Total usage limit",
  "coupons.oncePer": "Once per customer",
  "coupons.starts": "Starts at",
  "coupons.ends": "Ends at",
  "coupons.summary": "Summary",
  "coupons.usage": "Usage",
  "coupons.status": "Status",
  "coupons.danger": "Danger zone",
  "coupons.back": "← Back to coupons",
  "coupons.createTitle": "Create coupon",
  "coupons.editTitle": "Edit coupon",

  "billing.title": "Billing & uninstall",
  "billing.hosted":
    "Plan changes use Shopify's hosted plan page. Open Support below to approve the $2/month charge in Shopify admin.",
  "billing.intro":
    "The app is free. Add customer support for $2/month, billed through Shopify on a 30-day cycle. Cancel anytime.",
  "billing.current": "Current plan",
  "billing.plan": "Plan",
  "billing.monthly": "Monthly price",
  "billing.redemptions": "Discount redemptions",
  "billing.subscription": "Shopify subscription",
  "billing.active": "Active: {name}",
  "billing.plans": "Pricing plans",
  "billing.plansIntro":
    "Free includes quantity breaks, BOGO, and product-page upsells. The Pro plan unlocks gifts, mix & match, builders, coupons, and email help — approve the $2/month charge in Shopify. You can return to Free anytime without reinstalling.",
  "billing.how": "How billing works",
  "billing.howFree":
    "Free includes unlimited quantity-break and simple BOGO offers, product-page upsells, the theme widget and photo tags, and automatic Shopify discounts",
  "billing.howPro":
    "Pro is $2/month and adds extra BOGO types, free gifts, mix & match, bundle builders, coupons, and email customer support — approve the charge in Shopify (not billed automatically)",
  "billing.howReturn": "Return to Free anytime from this page",
  "billing.howRedemptions":
    "Discount redemptions are counted from your synced Shopify automatic discounts",
  "billing.howUninstall": "Uninstalling stops new charges immediately",
  "billing.uninstall": "Clean uninstall guarantee",
  "billing.uninstallBody":
    "When you uninstall BundleStack, we automatically remove all discount rules created by the app. Offer configuration is kept briefly for a possible reinstall, then deleted when Shopify sends the shop data erasure request (within 48 hours).",
  "billing.deleted": "✓ All BundleStack automatic discounts are deleted",
  "billing.erased":
    "✓ Offer data is erased on Shopify's shop/redact webhook",
  "billing.openTheme": "Open theme editor",
  "billing.choose": "Choose {plan}",
  "billing.downgrade": "Return to Free",
  "billing.currentBadge": "Current plan",
  "billing.freeCap":
    "Quantity breaks, simple BOGO, and product-page upsells",
  "billing.proCap":
    "Extra BOGO types, gifts, mix & match, builders, coupons, and email support",
  "billing.freeF0": "Unlimited quantity-break and simple BOGO offers",
  "billing.freeF1": "Product-page upsells (frequently bought together)",
  "billing.freeF2": "Product-page theme widget and photo tags",
  "billing.freeF3": "Automatic Shopify discount sync",
  "billing.freeF4": "Product picker — no manual IDs",
  "billing.freeF5": "Store health monitor",
  "billing.proF0": "Everything in Free",
  "billing.proF1":
    "Extra BOGO types, free gifts, mix & match, and bundle builders",
  "billing.proF2": "Discount codes (coupons)",
  "billing.proF3": "Email customer support",

  "support.title": "Support",
  "support.thanks":
    "Thanks — your message was received. If a reply is needed, we will use the email on your Shopify staff account.",
  "support.account": "Your Shopify account",
  "support.store": "Store: {shop}",
  "support.signedIn": "Signed in as: {name}",
  "support.replies":
    "Replies go to the email on your Shopify staff account — the same one you use to sign in to Shopify admin.",
  "support.send": "Send a message",
  "support.subject": "Subject",
  "support.subjectPh": "Brief summary of your issue",
  "support.message": "Message",
  "support.messagePh":
    "Include steps to reproduce, offer name, and what you expected to happen.",
  "support.privacyNote":
    "Do not include customer names, emails, or order details. We use your Shopify login email for follow-up — no separate support address is needed.",
  "support.sendBtn": "Send message",
  "support.locked":
    "Email customer support is included with the Pro plan for $2/month, along with gifts, mix & match, builders, and coupons. Quantity breaks and product-page upsells stay on Free.",
  "support.faq": "Common questions",
  "support.faqDiscount": "Discount not at checkout?",
  "support.faqDiscountBody":
    " Confirm the offer is Active, the product is included, and cart quantity meets the tier minimum.",
  "support.faqWidget": "Widget missing?",
  "support.faqWidgetBody":
    " Theme editor → product template → add the BundleStack block. Check Store health on the Dashboard.",
  "support.faqUninstall": "Uninstalling?",
  "support.faqUninstallBody":
    " Discounts and offer data are removed automatically when you uninstall the app.",
  "support.required": "Subject and message are required.",
  "support.proOnly":
    "Customer support is included with the Pro plan ($2/month).",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
