import { describe, expect, it } from "vitest";
import { planAllowsAovFeatures } from "./plan-access.server";
import { planIncludesPromotionType } from "./promotion-access.server";

describe("planAllowsAovFeatures", () => {
  it("keeps paid AOV features off Free", () => {
    expect(planAllowsAovFeatures("free")).toBe(false);
  });

  it("unlocks AOV features on every paid tier, including Pro", () => {
    expect(planAllowsAovFeatures("starter")).toBe(true);
    expect(planAllowsAovFeatures("scale")).toBe(true);
    expect(planAllowsAovFeatures("pro")).toBe(true);
  });
});

describe("planIncludesPromotionType", () => {
  it("keeps upsell and cross-sell (FBT) on Free", () => {
    expect(planIncludesPromotionType("free", "fbt")).toBe(true);
  });

  it("gates other promotion types behind Pro", () => {
    expect(planIncludesPromotionType("free", "bogo")).toBe(false);
    expect(planIncludesPromotionType("free", "free_gift")).toBe(false);
    expect(planIncludesPromotionType("free", "mix_match")).toBe(false);
    expect(planIncludesPromotionType("free", "bundle_builder")).toBe(false);
    expect(planIncludesPromotionType("pro", "bogo")).toBe(true);
    expect(planIncludesPromotionType("starter", "bundle_builder")).toBe(true);
  });
});
