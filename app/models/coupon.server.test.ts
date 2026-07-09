import { describe, expect, it } from "vitest";
import { parseCouponForm } from "./coupon.server";
import { formatCouponValue } from "../utils/coupon";

describe("parseCouponForm", () => {
  it("parses a percentage coupon", () => {
    const formData = new FormData();
    formData.set("title", "Welcome");
    formData.set("code", "save10");
    formData.set("status", "active");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "10");
    formData.set("appliesOncePerCustomer", "true");

    expect(parseCouponForm(formData)).toMatchObject({
      title: "Welcome",
      code: "SAVE10",
      status: "active",
      discountType: "percentage",
      discountValue: 10,
      appliesOncePerCustomer: true,
      usageLimit: null,
    });
  });

  it("rejects invalid percentage values", () => {
    const formData = new FormData();
    formData.set("title", "Too much");
    formData.set("code", "BIG");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "150");

    expect(() => parseCouponForm(formData)).toThrow();
  });
});

describe("formatCouponValue", () => {
  it("formats percentage and fixed values", () => {
    expect(
      formatCouponValue({ discountType: "percentage", discountValue: 15 }),
    ).toBe("15% off");
    expect(
      formatCouponValue({ discountType: "fixed", discountValue: 20 }),
    ).toBe("$20.00 off");
  });
});
