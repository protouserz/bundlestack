// @ts-check

/**
 * Shipping discounts are not used for BOGO — return no operations.
 */
export function cartDeliveryOptionsDiscountsGenerateRun() {
  return { operations: [] };
}
