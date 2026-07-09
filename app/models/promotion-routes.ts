import type { PromotionType } from "./promotion.types";
import { PROMOTION_TYPE_META } from "./promotion.types";

const SLUG_TO_TYPE: Record<string, PromotionType> = {
  bogo: "bogo",
  "free-gifts": "free_gift",
  "mix-match": "mix_match",
  builders: "bundle_builder",
  fbt: "fbt",
};

const TYPE_TO_SLUG: Record<PromotionType, string> = {
  bogo: "bogo",
  free_gift: "free-gifts",
  mix_match: "mix-match",
  bundle_builder: "builders",
  fbt: "fbt",
};

export function promotionTypeFromSlug(slug: string | undefined): PromotionType | null {
  if (!slug) return null;
  return SLUG_TO_TYPE[slug] ?? null;
}

export function promotionSlugFromType(type: PromotionType): string {
  return TYPE_TO_SLUG[type];
}

export function promotionListPath(type: PromotionType): string {
  return PROMOTION_TYPE_META[type].href;
}

export function promotionNewPath(type: PromotionType): string {
  return `${PROMOTION_TYPE_META[type].href}/new`;
}

export function promotionEditPath(type: PromotionType, id: string): string {
  return `${PROMOTION_TYPE_META[type].href}/${id}`;
}
