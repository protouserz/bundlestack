import {
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

/** BundleStack quantity breaks are product discounts only. */
export function cartDeliveryOptionsDiscountsGenerateRun(
  _input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  return { operations: [] };
}
