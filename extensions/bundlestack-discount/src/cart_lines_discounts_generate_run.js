// @ts-check

/**
 * BundleStack Discount Function
 *
 * Metafield JSON shape (key: function-configuration):
 * {
 *   "type": "bogo",
 *   "buyQuantity": 1,
 *   "getQuantity": 1,
 *   "getDiscountType": "free" | "percentage" | "fixed",
 *   "getDiscountValue": 100,
 *   "sameProduct": true,
 *   "productIds": ["gid://shopify/Product/..."],
 *   "getProductIds": []
 * }
 */

/**
 * @typedef {{
 *   type?: string,
 *   buyQuantity?: number,
 *   getQuantity?: number,
 *   getDiscountType?: "free" | "percentage" | "fixed",
 *   getDiscountValue?: number,
 *   sameProduct?: boolean,
 *   productIds?: string[],
 *   getProductIds?: string[],
 * }} BogoConfig
 */

/**
 * @param {{
 *   cart: { lines: Array<{
 *     id: string,
 *     quantity: number,
 *     cost: { amountPerQuantity: { amount: string } },
 *     merchandise: { __typename: string, id?: string, product?: { id: string } }
 *   }> },
 *   discount: {
 *     discountClasses: string[],
 *     metafield?: { value?: string } | null
 *   }
 * }} input
 */
export function cartLinesDiscountsGenerateRun(input) {
  const classes = input.discount?.discountClasses ?? [];
  const hasProduct = classes.includes("PRODUCT") || classes.includes("Product");
  if (!hasProduct || !input.cart?.lines?.length) {
    return { operations: [] };
  }

  /** @type {BogoConfig} */
  let config = {};
  try {
    config = JSON.parse(input.discount?.metafield?.value || "{}");
  } catch {
    return { operations: [] };
  }

  if (config.type && config.type !== "bogo") {
    return { operations: [] };
  }

  const buyQuantity = Math.max(1, Number(config.buyQuantity) || 1);
  const getQuantity = Math.max(1, Number(config.getQuantity) || 1);
  const groupSize = buyQuantity + getQuantity;
  const productIds = new Set(config.productIds || []);
  const getProductIds = new Set(
    config.sameProduct === false
      ? config.getProductIds || []
      : config.productIds || [],
  );
  const getDiscountType = config.getDiscountType || "free";
  const getDiscountValue = Number(config.getDiscountValue) || 100;

  const eligibleLines = input.cart.lines.filter((line) => {
    if (line.merchandise?.__typename !== "ProductVariant") return false;
    const productId = line.merchandise.product?.id;
    if (!productId) return false;
    if (productIds.size === 0) return true;
    return productIds.has(productId);
  });

  if (eligibleLines.length === 0) return { operations: [] };

  // Expand units cheapest-first so "get" items receive the discount.
  const units = [];
  for (const line of eligibleLines) {
    const unitPrice = Number(line.cost?.amountPerQuantity?.amount || 0);
    for (let i = 0; i < line.quantity; i += 1) {
      units.push({ lineId: line.id, unitPrice });
    }
  }
  units.sort((a, b) => a.unitPrice - b.unitPrice);

  const discountedQtyByLine = new Map();
  const sets = Math.floor(units.length / groupSize);
  const discountableUnits = sets * getQuantity;

  for (let i = 0; i < discountableUnits; i += 1) {
    const unit = units[i];
    if (!unit) break;
    // When get products differ, only discount matching get products.
    if (config.sameProduct === false) {
      const line = eligibleLines.find((entry) => entry.id === unit.lineId);
      const productId = line?.merchandise?.product?.id;
      if (!productId || !getProductIds.has(productId)) continue;
    }
    discountedQtyByLine.set(
      unit.lineId,
      (discountedQtyByLine.get(unit.lineId) || 0) + 1,
    );
  }

  if (discountedQtyByLine.size === 0) return { operations: [] };

  const targets = [];
  for (const [lineId, quantity] of discountedQtyByLine.entries()) {
    targets.push({
      cartLine: {
        id: lineId,
        quantity,
      },
    });
  }

  let value;
  let message;
  if (getDiscountType === "fixed") {
    value = { fixedAmount: { amount: String(getDiscountValue) } };
    message = `BOGO $${getDiscountValue} off`;
  } else {
    const percentage =
      getDiscountType === "free" ? 100 : Math.min(100, getDiscountValue);
    value = { percentage: { value: String(percentage) } };
    message =
      percentage >= 100
        ? `BOGO Buy ${buyQuantity} Get ${getQuantity} Free`
        : `BOGO ${percentage}% off`;
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message,
              targets,
              value,
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}
