import type { PromotionType } from "../../models/promotion.types";
import styles from "./promotions.module.css";

const TONE: Record<PromotionType, string> = {
  bogo: styles.toneBogo,
  free_gift: styles.toneGift,
  mix_match: styles.toneMix,
  bundle_builder: styles.toneBuilder,
  fbt: styles.toneFbt,
};

export function PromotionTypeMark({ type }: { type: PromotionType }) {
  return (
    <span className={`${styles.mark} ${TONE[type]}`} aria-hidden="true">
      <svg className={styles.markSvg} viewBox="0 0 24 24" fill="none">
        {type === "bogo" ? (
          <>
            <rect x="3" y="5" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <rect x="13" y="5" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
          </>
        ) : null}
        {type === "free_gift" ? (
          <>
            <path
              d="M4 10h16v10H4V10Z"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path d="M12 10v10M4 14h16" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M8 6c0-1.1.9-2 2-2 1.7 0 2 2 2 2s.3-2 2-2c1.1 0 2 .9 2 2 0 2-4 4-6 4S8 8 8 6Z"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </>
        ) : null}
        {type === "mix_match" ? (
          <>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.75" />
            <path d="M10.5 10.5 13.5 13.5" stroke="currentColor" strokeWidth="1.75" />
          </>
        ) : null}
        {type === "bundle_builder" ? (
          <>
            <rect x="3" y="4" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <rect x="3" y="10.5" width="18" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <rect x="3" y="16.5" width="18" height="3.5" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          </>
        ) : null}
        {type === "fbt" ? (
          <>
            <rect x="3" y="7" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <rect x="13" y="7" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path d="M12 12h0.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : null}
      </svg>
    </span>
  );
}
