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
  productIds?: string[];
  tiers?: QuantityTier[];
};

function parseConfig(value: unknown): FunctionConfig | null {
  if (!value || typeof value !== "object") return null;
  return value as FunctionConfig;
}

function bestTier(tiers: QuantityTier[], quantity: number): QuantityTier | null {
  const eligible = tiers
    .filter(
      (tier) =>
        Number.isFinite(tier.minQty) &&
        Number.isFinite(tier.discountValue) &&
        tier.minQty > 0 &&
        tier.discountValue > 0 &&
        quantity >= tier.minQty,
    )
    .sort((a, b) => b.minQty - a.minQty || b.discountValue - a.discountValue);

  return eligible[0] ?? null;
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
  const productIds = new Set(config?.productIds ?? []);
  const tiers = config?.tiers ?? [];
  if (productIds.size === 0 || tiers.length === 0) {
    return { operations: [] };
  }

  const matchingLines = input.cart.lines.filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    return productIds.has(line.merchandise.product.id);
  });

  if (matchingLines.length === 0) {
    return { operations: [] };
  }

  const totalQty = matchingLines.reduce((sum, line) => sum + line.quantity, 0);
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
              targets: matchingLines.map((line) => ({
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
