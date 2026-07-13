// @ts-check

/**
 * BundleStack Discount Function
 *
 * Metafield JSON (key: function-configuration) is discriminated by `type`:
 * - bogo | free_gift | mix_match | bundle_builder | fbt
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
 * @param {CartLine[]} lines
 */
function lineSubtotal(lines) {
  return lines.reduce((sum, line) => {
    const unit = Number(line.cost?.amountPerQuantity?.amount || 0);
    return sum + unit * line.quantity;
  }, 0);
}

/**
 * @param {CartLine[]} lines
 */
function lineQuantity(lines) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * @param {Map<string, number>} discountedQtyByLine
 */
function targetsFromMap(discountedQtyByLine) {
  /** @type {Array<{ cartLine: { id: string, quantity: number } }>} */
  const targets = [];
  for (const [lineId, quantity] of discountedQtyByLine.entries()) {
    targets.push({ cartLine: { id: lineId, quantity } });
  }
  return targets;
}

/**
 * @param {"percentage" | "fixed" | "free"} discountType
 * @param {number} discountValue
 * @param {string} message
 */
function discountValue(discountType, discountValueAmount, message) {
  if (discountType === "fixed") {
    return {
      value: { fixedAmount: { amount: String(discountValueAmount) } },
      message,
    };
  }
  const percentage =
    discountType === "free" ? 100 : Math.min(100, discountValueAmount);
  return {
    value: { percentage: { value: String(percentage) } },
    message,
  };
}

/**
 * @param {Map<string, number>} map
 * @param {CartLine[]} lines
 */
function markAllUnits(map, lines) {
  for (const line of lines) {
    map.set(line.id, (map.get(line.id) || 0) + line.quantity);
  }
}

/**
 * @param {Record<string, unknown>} config
 * @param {CartLine[]} cartLines
 */
function runBogo(config, cartLines) {
  const buyQuantity = Math.max(1, Number(config.buyQuantity) || 1);
  const getQuantity = Math.max(1, Number(config.getQuantity) || 1);
  const productIds = new Set(/** @type {string[]} */ (config.productIds || []));
  const getProductIds = new Set(
    /** @type {string[]} */ (config.getProductIds || []),
  );
  const getDiscountType =
    /** @type {"free" | "percentage" | "fixed"} */ (
      config.getDiscountType || "free"
    );
  const getDiscountValue = Number(config.getDiscountValue) || 100;
  const sameProduct = config.sameProduct !== false;

  /** @type {Map<string, number>} */
  const discountedQtyByLine = new Map();

  if (sameProduct) {
    const eligibleLines = filterLines(cartLines, productIds, false);
    if (eligibleLines.length === 0) return { operations: [] };

    const units = expandUnits(eligibleLines);
    const groupSize = buyQuantity + getQuantity;
    const sets = Math.floor(units.length / groupSize);
    takeCheapest(discountedQtyByLine, units, sets * getQuantity);
  } else {
    const buyLines = filterLines(cartLines, productIds, false);
    const getLines = filterLines(
      cartLines,
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

  let message;
  if (getDiscountType === "fixed") {
    message = `BOGO $${getDiscountValue} off`;
  } else {
    const percentage =
      getDiscountType === "free" ? 100 : Math.min(100, getDiscountValue);
    message =
      percentage >= 100
        ? `BOGO Buy ${buyQuantity} Get ${getQuantity} Free`
        : `BOGO ${percentage}% off`;
  }

  const priced = discountValue(getDiscountType, getDiscountValue, message);
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: priced.message,
              targets: targetsFromMap(discountedQtyByLine),
              value: priced.value,
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {CartLine[]} cartLines
 */
function runFreeGift(config, cartLines) {
  const productIds = new Set(/** @type {string[]} */ (config.productIds || []));
  const giftProductIds = new Set(
    /** @type {string[]} */ (config.giftProductIds || []),
  );
  const giftQuantity = Math.max(1, Number(config.giftQuantity) || 1);
  const minSubtotal =
    config.minSubtotal == null ? null : Number(config.minSubtotal);
  const minQuantity =
    config.minQuantity == null ? null : Number(config.minQuantity);

  if (giftProductIds.size === 0) return { operations: [] };

  const qualifyingLines = filterLines(
    cartLines,
    productIds,
    productIds.size === 0,
  );
  // Exclude gift lines from threshold when they are only gifts
  const thresholdLines = qualifyingLines.filter((line) => {
    const productId = line.merchandise.product?.id;
    return !productId || !giftProductIds.has(productId);
  });
  const basisLines = thresholdLines.length > 0 ? thresholdLines : qualifyingLines;

  if (minSubtotal != null && !Number.isNaN(minSubtotal)) {
    if (lineSubtotal(basisLines) < minSubtotal) return { operations: [] };
  }
  if (minQuantity != null && !Number.isNaN(minQuantity)) {
    if (lineQuantity(basisLines) < minQuantity) return { operations: [] };
  }
  if (minSubtotal == null && minQuantity == null) {
    if (lineQuantity(basisLines) < 1) return { operations: [] };
  }

  const giftLines = filterLines(cartLines, giftProductIds, false);
  if (giftLines.length === 0) return { operations: [] };

  /** @type {Map<string, number>} */
  const discountedQtyByLine = new Map();
  takeCheapest(discountedQtyByLine, expandUnits(giftLines), giftQuantity);
  if (discountedQtyByLine.size === 0) return { operations: [] };

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: "Free gift",
              targets: targetsFromMap(discountedQtyByLine),
              value: { percentage: { value: "100" } },
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {CartLine[]} cartLines
 */
function runMixMatch(config, cartLines) {
  const productIds = new Set(/** @type {string[]} */ (config.productIds || []));
  const minItems = Math.max(1, Number(config.minItems) || 1);
  const discountType =
    /** @type {"percentage" | "fixed"} */ (config.discountType || "percentage");
  const discountValueAmount = Number(config.discountValue) || 0;

  const eligible = filterLines(cartLines, productIds, productIds.size === 0);
  if (lineQuantity(eligible) < minItems) return { operations: [] };

  /** @type {Map<string, number>} */
  const map = new Map();
  markAllUnits(map, eligible);

  const priced = discountValue(
    discountType,
    discountValueAmount,
    discountType === "fixed"
      ? `Mix & match $${discountValueAmount} off`
      : `Mix & match ${discountValueAmount}% off`,
  );

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: priced.message,
              targets: targetsFromMap(map),
              value: priced.value,
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {CartLine[]} cartLines
 */
function runBundleBuilder(config, cartLines) {
  const steps = /** @type {Array<{ productIds?: string[], minSelect?: number }>} */ (
    config.steps || []
  );
  const minStepsCompleted = Math.max(
    1,
    Number(config.minStepsCompleted) || 1,
  );
  const discountType =
    /** @type {"percentage" | "fixed"} */ (config.discountType || "percentage");
  const discountValueAmount = Number(config.discountValue) || 0;

  if (steps.length === 0) return { operations: [] };

  /** @type {CartLine[]} */
  const matchedLines = [];
  let completed = 0;

  for (const step of steps) {
    const stepIds = new Set(step.productIds || []);
    const minSelect = Math.max(1, Number(step.minSelect) || 1);
    const stepLines = filterLines(cartLines, stepIds, stepIds.size === 0);
    if (lineQuantity(stepLines) >= minSelect) {
      completed += 1;
      matchedLines.push(...stepLines);
    }
  }

  if (completed < minStepsCompleted) return { operations: [] };

  /** @type {Map<string, number>} */
  const map = new Map();
  markAllUnits(map, matchedLines);

  const priced = discountValue(
    discountType,
    discountValueAmount,
    discountType === "fixed"
      ? `Bundle $${discountValueAmount} off`
      : `Bundle ${discountValueAmount}% off`,
  );

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: priced.message,
              targets: targetsFromMap(map),
              value: priced.value,
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {CartLine[]} cartLines
 */
function runFbt(config, cartLines) {
  const anchors = new Set(
    /** @type {string[]} */ (config.anchorProductIds || config.productIds || []),
  );
  const recommended = new Set(
    /** @type {string[]} */ (config.recommendedProductIds || []),
  );
  const requireAll = config.requireAll !== false;
  const discountType =
    /** @type {"percentage" | "fixed"} */ (config.discountType || "percentage");
  const discountValueAmount = Number(config.discountValue) || 0;

  if (anchors.size === 0 || recommended.size === 0) return { operations: [] };

  const anchorLines = filterLines(cartLines, anchors, false);
  if (anchorLines.length === 0) return { operations: [] };

  const recommendedLines = filterLines(cartLines, recommended, false);
  if (recommendedLines.length === 0) return { operations: [] };

  if (requireAll) {
    for (const id of recommended) {
      const has = recommendedLines.some(
        (line) => line.merchandise.product?.id === id,
      );
      if (!has) return { operations: [] };
    }
  }

  /** @type {Map<string, number>} */
  const map = new Map();
  markAllUnits(map, recommendedLines);

  const priced = discountValue(
    discountType,
    discountValueAmount,
    discountType === "fixed"
      ? `Frequently bought $${discountValueAmount} off`
      : `Frequently bought ${discountValueAmount}% off`,
  );

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: priced.message,
              targets: targetsFromMap(map),
              value: priced.value,
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
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

  /** @type {Record<string, unknown>} */
  let config = {};
  try {
    config = JSON.parse(input.discount?.metafield?.value || "{}");
  } catch {
    return { operations: [] };
  }

  const type = /** @type {string} */ (config.type || "bogo");
  const lines = input.cart.lines;

  switch (type) {
    case "bogo":
      return runBogo(config, lines);
    case "free_gift":
      return runFreeGift(config, lines);
    case "mix_match":
      return runMixMatch(config, lines);
    case "bundle_builder":
      return runBundleBuilder(config, lines);
    case "fbt":
      return runFbt(config, lines);
    default:
      return { operations: [] };
  }
}
