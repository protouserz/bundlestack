import { describe, expect, it } from "vitest";
import { resolvePlanFromSubscriptionWebhook } from "../routes/webhooks.app.subscriptions_update";

describe("resolvePlanFromSubscriptionWebhook", () => {
  it("maps active Growth subscriptions to scale", () => {
    expect(
      resolvePlanFromSubscriptionWebhook({
        app_subscription: {
          name: "BundleStack Growth",
          status: "ACTIVE",
        },
      }),
    ).toBe("scale");
  });

  it("maps cancelled subscriptions to free", () => {
    expect(
      resolvePlanFromSubscriptionWebhook({
        app_subscription: {
          name: "BundleStack Pro",
          status: "CANCELLED",
        },
      }),
    ).toBe("free");
  });

  it("accepts flat payload shape", () => {
    expect(
      resolvePlanFromSubscriptionWebhook({
        name: "BundleStack Starter",
        status: "ACTIVE",
      }),
    ).toBe("starter");
  });
});
