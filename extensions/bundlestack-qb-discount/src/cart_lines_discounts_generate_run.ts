import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

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
};

type MatchingLine = {
  id: string;
  quantity: number;
  productId: string;
  unitPrice: number;
};

function parseConfig(value: unknown): FunctionConfig | null {
  if (!value || typeof value !== "object") return null;
  return value as FunctionConfig;
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

function runBogo(
  config: FunctionConfig,
  lines: MatchingLine[],
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

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `Buy ${buyQuantity} get ${getQuantity} free`,
              targets: [...discountedQtyByLine.entries()].map(
                ([id, quantity]) => ({
                  cartLine: { id, quantity },
                }),
              ),
              value: {
                percentage: {
                  value: 100,
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
  const productIds = config?.productIds ?? [];
  const lines = matchingLines(input, productIds);
  if (lines.length === 0) {
    return { operations: [] };
  }

  if (config?.type === "bogo") {
    return runBogo(config, lines);
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
              message: `Buy ${tier.minQty}+, save ${tier.discountValue}%`,
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
