import { useEffect, useRef } from "react";
import { SButton } from "./polaris";
import type { CouponCodeOverwrite } from "../models/coupon-code-conflict.server";

const MODAL_ID = "replace-coupon-code-modal";

type CouponCodeOverwriteModalProps = {
  conflict: CouponCodeOverwrite | null | undefined;
  isSaving?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

type ModalElement = HTMLElement & {
  showOverlay?: () => void;
  hideOverlay?: () => void;
};

export function CouponCodeOverwriteModal({
  conflict,
  isSaving = false,
  onConfirm,
  onCancel,
}: CouponCodeOverwriteModalProps) {
  const shownForCode = useRef<string | null>(null);

  useEffect(() => {
    if (!conflict) {
      shownForCode.current = null;
      return;
    }
    if (shownForCode.current === conflict.code) return;
    shownForCode.current = conflict.code;

    const modal = document.getElementById(MODAL_ID) as ModalElement | null;
    modal?.showOverlay?.();
  }, [conflict]);

  const hide = () => {
    const modal = document.getElementById(MODAL_ID) as ModalElement | null;
    modal?.hideOverlay?.();
    shownForCode.current = null;
    onCancel?.();
  };

  if (!conflict) return null;

  return (
    <s-modal
      id={MODAL_ID}
      heading="Replace existing discount code?"
      accessibilityLabel="Confirm replacing an existing discount code"
    >
      <s-stack direction="block" gap="base">
        <s-paragraph>{conflict.message}</s-paragraph>
      </s-stack>

      <SButton
        slot="secondary-actions"
        variant="secondary"
        commandFor={MODAL_ID}
        command="--hide"
        onClick={hide}
      >
        Cancel
      </SButton>
      <SButton
        slot="primary-action"
        variant="primary"
        tone="critical"
        {...(isSaving ? { loading: true } : {})}
        onClick={() => {
          hide();
          onConfirm();
        }}
      >
        Replace code
      </SButton>
    </s-modal>
  );
}
