import { describe, expect, it } from "vitest";
import { planAllowsAovFeatures } from "./plan-access.server";
import { planIncludesPromotionType } from "./promotion-access.server";

describe("planAllowsAovFeatures", () => {
  it("keeps promotions and coupons off Free", () => {
    expect(planAllowsAovFeatures("free")).toBe(false);
  });

  it("unlocks AOV features on every paid tier, including Pro", () => {
    expect(planAllowsAovFeatures("starter")).toBe(true);
    expect(planAllowsAovFeatures("scale")).toBe(true);
    expect(planAllowsAovFeatures("pro")).toBe(true);
  });
});

describe("planIncludesPromotionType", () => {
  it("gates every promotion type behind the paid plan", () => {
    expect(planIncludesPromotionType("free", "bogo")).toBe(false);
    expect(planIncludesPromotionType("free", "fbt")).toBe(false);
    expect(planIncludesPromotionType("pro", "bogo")).toBe(true);
    expect(planIncludesPromotionType("starter", "bundle_builder")).toBe(true);
  });
});
