import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  ProductDiscountCandidateValue,
} from "../generated/api";
import {
  checkoutMessages,
  interpolate,
  type CheckoutMessages,
} from "./messages";

type QuantityTier = {
  minQty: number;
  discountValue: number;
};

type FunctionConfig = {
  type?: string;
  productIds?: string[];
  tiers?: QuantityTier[];
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountType?: string;
  getDiscountValue?: number;
  sameProduct?: boolean;
  getProductIds?: string[];
  minSubtotal?: number | null;
  minQuantity?: number | null;
  giftProductIds?: string[];
  giftQuantity?: number;
  minItems?: number;
  discountType?: string;
  discountValue?: number;
  steps?: Array<{ productIds?: string[]; minSelect?: number }>;
  minStepsCompleted?: number;
  anchorProductIds?: string[];
  recommendedProductIds?: string[];
  requireAll?: boolean;
};

type MatchingLine = {
  id: string;
  quantity: number;
  productId: string;
  unitPrice: number;
};

function parseConfig(value: unknown): FunctionConfig | null {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  return parsed as FunctionConfig;
}

function isBogoConfig(config: FunctionConfig | null): boolean {
  if (!config) return false;
  if (String(config.type ?? "").toLowerCase() === "bogo") return true;
  const buyQuantity = Number(config.buyQuantity);
  const getQuantity = Number(config.getQuantity);
  return (
    Number.isFinite(buyQuantity) &&
    buyQuantity > 0 &&
    Number.isFinite(getQuantity) &&
    getQuantity > 0 &&
    (!config.tiers || config.tiers.length === 0)
  );
}

function bestTier(tiers: QuantityTier[], quantity: number): QuantityTier | null {
  const MAX_PERCENT = 50;
  const eligible = tiers
    .filter(
      (tier) =>
        Number.isFinite(tier.minQty) &&
        Number.isFinite(tier.discountValue) &&
        tier.minQty > 0 &&
        tier.discountValue > 0 &&
        tier.discountValue <= MAX_PERCENT &&
        quantity >= tier.minQty,
    )
    .sort((a, b) => b.minQty - a.minQty || b.discountValue - a.discountValue);

  return eligible[0] ?? null;
}

function matchingLines(input: CartInput, productIds: string[]): MatchingLine[] {
  const restrictToProducts = productIds.length > 0;
  const allowedProducts = new Set(productIds);

  const lines: MatchingLine[] = [];
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const productId = line.merchandise.product.id;
    if (restrictToProducts && !allowedProducts.has(productId)) continue;
    lines.push({
      id: line.id,
      quantity: line.quantity,
      productId,
      unitPrice: Number(line.cost.amountPerQuantity.amount),
    });
  }
  return lines;
}

function languageFromInput(input: CartInput): CheckoutMessages {
  const iso = (
    input as CartInput & {
      localization?: { language?: { isoCode?: string } };
    }
  ).localization?.language?.isoCode;
  return checkoutMessages(iso);
}

function runBogo(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const buyQuantity = Math.max(1, Math.floor(Number(config.buyQuantity) || 1));
  const getQuantity = Math.max(1, Math.floor(Number(config.getQuantity) || 1));
  const groupSize = buyQuantity + getQuantity;
  const discountedQtyByLine = new Map<string, number>();

  const byProduct = new Map<string, MatchingLine[]>();
  for (const line of lines) {
    const group = byProduct.get(line.productId) ?? [];
    group.push(line);
    byProduct.set(line.productId, group);
  }

  for (const productLines of byProduct.values()) {
    const units: Array<{ lineId: string; unitPrice: number }> = [];
    for (const line of productLines) {
      for (let i = 0; i < line.quantity; i += 1) {
        units.push({ lineId: line.id, unitPrice: line.unitPrice });
      }
    }
    units.sort((a, b) => a.unitPrice - b.unitPrice);
    const freeCount = Math.floor(units.length / groupSize) * getQuantity;
    for (let i = 0; i < freeCount; i += 1) {
      const unit = units[i];
      if (!unit) break;
      discountedQtyByLine.set(
        unit.lineId,
        (discountedQtyByLine.get(unit.lineId) ?? 0) + 1,
      );
    }
  }

  if (discountedQtyByLine.size === 0) {
    return { operations: [] };
  }

  const linesById = new Map(lines.map((line) => [line.id, line]));
  const message = interpolate(m.buyGetFree, {
    buy: buyQuantity,
    get: getQuantity,
  });

  return {
    operations: [
      {
        productDiscountsAdd: {
          // One candidate per line so mixed-price variants stay exact. Use a
          // fixed amount instead of 100% — Shopify drops some 100% Function
          // product discounts at checkout when another product discount also
          // targets the line.
          candidates: [...discountedQtyByLine.entries()].map(
            ([id, quantity]) => ({
              message,
              targets: [{ cartLine: { id, quantity } }],
              value: {
                fixedAmount: {
                  amount: Number(linesById.get(id)?.unitPrice ?? 0).toFixed(2),
                  appliesToEachItem: true,
                },
              },
            }),
          ),
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

function linesForProducts(
  lines: MatchingLine[],
  productIds: string[],
  allowAll: boolean,
): MatchingLine[] {
  if (allowAll || productIds.length === 0) return lines;
  const allowed = new Set(productIds);
  return lines.filter((line) => allowed.has(line.productId));
}

function expandUnits(lines: MatchingLine[]) {
  const units: Array<{ lineId: string; unitPrice: number }> = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i += 1) {
      units.push({ lineId: line.id, unitPrice: line.unitPrice });
    }
  }
  units.sort((a, b) => a.unitPrice - b.unitPrice);
  return units;
}

function takeCheapest(
  discountedQtyByLine: Map<string, number>,
  units: Array<{ lineId: string; unitPrice: number }>,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    const unit = units[i];
    if (!unit) break;
    discountedQtyByLine.set(
      unit.lineId,
      (discountedQtyByLine.get(unit.lineId) ?? 0) + 1,
    );
  }
}

function lineSubtotal(lines: MatchingLine[]) {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

function lineQuantity(lines: MatchingLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function markAllUnits(map: Map<string, number>, lines: MatchingLine[]) {
  for (const line of lines) {
    map.set(line.id, (map.get(line.id) ?? 0) + line.quantity);
  }
}

function addLineDiscount(
  message: string,
  map: Map<string, number>,
  value: ProductDiscountCandidateValue,
): CartLinesDiscountsGenerateRunResult {
  if (map.size === 0) return { operations: [] };
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message,
              targets: [...map.entries()].map(([id, quantity]) => ({
                cartLine: { id, quantity },
              })),
              value,
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

function runCrossProductBogo(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const buyQuantity = Math.max(1, Math.floor(Number(config.buyQuantity) || 1));
  const getQuantity = Math.max(1, Math.floor(Number(config.getQuantity) || 1));
  const buyLines = linesForProducts(lines, config.productIds ?? [], false);
  const getIds = config.getProductIds ?? [];
  const getLines = linesForProducts(
    lines,
    getIds.length > 0 ? getIds : config.productIds ?? [],
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
  const discountedQtyByLine = new Map<string, number>();
  takeCheapest(discountedQtyByLine, getUnits, sets * getQuantity);
  if (discountedQtyByLine.size === 0) return { operations: [] };

  const getDiscountType = config.getDiscountType || "free";
  const getDiscountValue = Number(config.getDiscountValue) || 100;
  if (getDiscountType === "fixed") {
    return addLineDiscount(
      interpolate(m.bogoAmount, { value: getDiscountValue }),
      discountedQtyByLine,
      { fixedAmount: { amount: String(getDiscountValue) } },
    );
  }
  if (getDiscountType === "percentage" && getDiscountValue < 100) {
    return addLineDiscount(
      interpolate(m.bogoPct, { value: getDiscountValue }),
      discountedQtyByLine,
      { percentage: { value: getDiscountValue } },
    );
  }

  const linesById = new Map(lines.map((line) => [line.id, line]));
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [...discountedQtyByLine.entries()].map(
            ([id, quantity]) => ({
              message: interpolate(m.buyGetFree, {
                buy: buyQuantity,
                get: getQuantity,
              }),
              targets: [{ cartLine: { id, quantity } }],
              value: {
                fixedAmount: {
                  amount: Number(linesById.get(id)?.unitPrice ?? 0).toFixed(2),
                  appliesToEachItem: true,
                },
              },
            }),
          ),
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

function runFreeGift(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const giftProductIds = config.giftProductIds ?? [];
  if (giftProductIds.length === 0) return { operations: [] };

  const qualifying = linesForProducts(
    lines,
    config.productIds ?? [],
    (config.productIds ?? []).length === 0,
  );
  const giftSet = new Set(giftProductIds);
  const thresholdLines = qualifying.filter((line) => !giftSet.has(line.productId));
  const basis = thresholdLines.length > 0 ? thresholdLines : qualifying;

  if (config.minSubtotal != null && Number.isFinite(Number(config.minSubtotal))) {
    if (lineSubtotal(basis) < Number(config.minSubtotal)) return { operations: [] };
  }
  if (config.minQuantity != null && Number.isFinite(Number(config.minQuantity))) {
    if (lineQuantity(basis) < Number(config.minQuantity)) return { operations: [] };
  }
  if (config.minSubtotal == null && config.minQuantity == null) {
    if (lineQuantity(basis) < 1) return { operations: [] };
  }

  const giftLines = linesForProducts(lines, giftProductIds, false);
  const discountedQtyByLine = new Map<string, number>();
  takeCheapest(
    discountedQtyByLine,
    expandUnits(giftLines),
    Math.max(1, Number(config.giftQuantity) || 1),
  );
  if (discountedQtyByLine.size === 0) return { operations: [] };

  const linesById = new Map(lines.map((line) => [line.id, line]));
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [...discountedQtyByLine.entries()].map(
            ([id, quantity]) => ({
              message: m.freeGift,
              targets: [{ cartLine: { id, quantity } }],
              value: {
                fixedAmount: {
                  amount: Number(linesById.get(id)?.unitPrice ?? 0).toFixed(2),
                  appliesToEachItem: true,
                },
              },
            }),
          ),
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

function runMixMatch(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const eligible = linesForProducts(
    lines,
    config.productIds ?? [],
    (config.productIds ?? []).length === 0,
  );
  const minItems = Math.max(1, Number(config.minItems) || 1);
  if (lineQuantity(eligible) < minItems) return { operations: [] };

  const map = new Map<string, number>();
  markAllUnits(map, eligible);
  const discountType = config.discountType || "percentage";
  const discountValue = Number(config.discountValue) || 0;
  return addLineDiscount(
    interpolate(
      discountType === "fixed" ? m.mixAmount : m.mixPct,
      { value: discountValue },
    ),
    map,
    discountType === "fixed"
      ? { fixedAmount: { amount: String(discountValue) } }
      : { percentage: { value: discountValue } },
  );
}

function runBundleBuilder(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const steps = config.steps ?? [];
  const minStepsCompleted = Math.max(1, Number(config.minStepsCompleted) || 1);
  if (steps.length === 0) return { operations: [] };

  const matched: MatchingLine[] = [];
  let completed = 0;
  for (const step of steps) {
    const stepIds = step.productIds ?? [];
    const minSelect = Math.max(1, Number(step.minSelect) || 1);
    const stepLines = linesForProducts(lines, stepIds, stepIds.length === 0);
    if (lineQuantity(stepLines) >= minSelect) {
      completed += 1;
      matched.push(...stepLines);
    }
  }
  if (completed < minStepsCompleted) return { operations: [] };

  const map = new Map<string, number>();
  markAllUnits(map, matched);
  const discountType = config.discountType || "percentage";
  const discountValue = Number(config.discountValue) || 0;
  return addLineDiscount(
    interpolate(
      discountType === "fixed" ? m.bundleAmount : m.bundlePct,
      { value: discountValue },
    ),
    map,
    discountType === "fixed"
      ? { fixedAmount: { amount: String(discountValue) } }
      : { percentage: { value: discountValue } },
  );
}

function runFbt(
  config: FunctionConfig,
  lines: MatchingLine[],
  m: CheckoutMessages,
): CartLinesDiscountsGenerateRunResult {
  const anchors = config.anchorProductIds?.length
    ? config.anchorProductIds
    : config.productIds ?? [];
  const recommended = config.recommendedProductIds ?? [];
  if (anchors.length === 0 || recommended.length === 0) {
    return { operations: [] };
  }

  const anchorLines = linesForProducts(lines, anchors, false);
  const recommendedLines = linesForProducts(lines, recommended, false);
  if (anchorLines.length === 0 || recommendedLines.length === 0) {
    return { operations: [] };
  }

  if (config.requireAll !== false) {
    for (const id of recommended) {
      if (!recommendedLines.some((line) => line.productId === id)) {
        return { operations: [] };
      }
    }
  }

  const map = new Map<string, number>();
  markAllUnits(map, recommendedLines);
  const discountType = config.discountType || "percentage";
  const discountValue = Number(config.discountValue) || 0;
  return addLineDiscount(
    interpolate(
      discountType === "fixed" ? m.fbtAmount : m.fbtPct,
      { value: discountValue },
    ),
    map,
    discountType === "fixed"
      ? { fixedAmount: { amount: String(discountValue) } }
      : { percentage: { value: discountValue } },
  );
}

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  const config = parseConfig(input.discount.metafield?.jsonValue);
  const type = String(config?.type ?? "").toLowerCase();
  const catalogLines = matchingLines(input, []);
  const m = languageFromInput(input);

  if (type === "free_gift") {
    return runFreeGift(config ?? {}, catalogLines, m);
  }
  if (type === "mix_match") {
    return runMixMatch(config ?? {}, catalogLines, m);
  }
  if (type === "bundle_builder") {
    return runBundleBuilder(config ?? {}, catalogLines, m);
  }
  if (type === "fbt") {
    return runFbt(config ?? {}, catalogLines, m);
  }

  const productIds = config?.productIds ?? [];
  const lines = matchingLines(input, productIds);
  if (lines.length === 0) {
    return { operations: [] };
  }

  if (config && isBogoConfig(config)) {
    if (
      config.sameProduct === false ||
      (config.getProductIds?.length ?? 0) > 0
    ) {
      return runCrossProductBogo(config, catalogLines, m);
    }
    return runBogo(config, lines, m);
  }

  const tiers = config?.tiers ?? [];
  if (tiers.length === 0) {
    return { operations: [] };
  }

  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const tier = bestTier(tiers, totalQty);
  if (!tier) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: interpolate(m.buySavePct, {
                qty: tier.minQty,
                value: tier.discountValue,
              }),
              targets: lines.map((line) => ({
                cartLine: { id: line.id },
              })),
              value: {
                percentage: {
                  value: tier.discountValue,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
