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
 * @typedef {{
 *   id: string,
 *   quantity: number,
 *   cost: { amountPerQuantity: { amount: string } },
 *   merchandise: { __typename: string, id?: string, product?: { id: string } }
 * }} CartLine
 */

/**
 * @param {CartLine[]} lines
 * @param {Set<string>} productIds
 * @param {boolean} allowAll
 */
function filterLines(lines, productIds, allowAll) {
  return lines.filter((line) => {
    if (line.merchandise?.__typename !== "ProductVariant") return false;
    const productId = line.merchandise.product?.id;
    if (!productId) return false;
    if (allowAll || productIds.size === 0) return true;
    return productIds.has(productId);
  });
}

/**
 * @param {CartLine[]} lines
 */
function expandUnits(lines) {
  /** @type {Array<{ lineId: string, unitPrice: number }>} */
  const units = [];
  for (const line of lines) {
    const unitPrice = Number(line.cost?.amountPerQuantity?.amount || 0);
    for (let i = 0; i < line.quantity; i += 1) {
      units.push({ lineId: line.id, unitPrice });
    }
  }
  units.sort((a, b) => a.unitPrice - b.unitPrice);
  return units;
}

/**
 * @param {Map<string, number>} discountedQtyByLine
 * @param {Array<{ lineId: string, unitPrice: number }>} units
 * @param {number} count
 */
function takeCheapest(discountedQtyByLine, units, count) {
  for (let i = 0; i < count; i += 1) {
    const unit = units[i];
    if (!unit) break;
    discountedQtyByLine.set(
      unit.lineId,
      (discountedQtyByLine.get(unit.lineId) || 0) + 1,
    );
  }
}

/**
 * @param {{
 *   cart: { lines: CartLine[] },
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
  const productIds = new Set(config.productIds || []);
  const getProductIds = new Set(config.getProductIds || []);
  const getDiscountType = config.getDiscountType || "free";
  const getDiscountValue = Number(config.getDiscountValue) || 100;
  const sameProduct = config.sameProduct !== false;

  /** @type {Map<string, number>} */
  const discountedQtyByLine = new Map();

  if (sameProduct) {
    const eligibleLines = filterLines(input.cart.lines, productIds, false);
    if (eligibleLines.length === 0) return { operations: [] };

    const units = expandUnits(eligibleLines);
    const groupSize = buyQuantity + getQuantity;
    const sets = Math.floor(units.length / groupSize);
    takeCheapest(discountedQtyByLine, units, sets * getQuantity);
  } else {
    // Buy X of productIds, get Y of getProductIds discounted.
    const buyLines = filterLines(input.cart.lines, productIds, false);
    const getLines = filterLines(
      input.cart.lines,
      getProductIds.size > 0 ? getProductIds : productIds,
      false,
    );
    if (buyLines.length === 0 || getLines.length === 0) {
      return { operations: [] };
    }

    const buyUnits = expandUnits(buyLines);
    const getUnits = expandUnits(getLines);
    const sets = Math.min(
      Math.floor(buyUnits.length / buyQuantity),
      Math.floor(getUnits.length / getQuantity),
    );
    takeCheapest(discountedQtyByLine, getUnits, sets * getQuantity);
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
