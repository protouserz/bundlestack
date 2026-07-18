(function () {
  function badgeText(tiers) {
    const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
    const lowestQty = sorted[0]?.minQty;
    if (!lowestQty) return null;

    const best = tiers.reduce((max, tier) =>
      tier.discountValue > max.discountValue ? tier : max
    );
    if (!best.discountValue || best.discountValue <= 0) return null;

    const saving =
      best.discountType === "percentage"
        ? `${best.discountValue}%`
        : `$${best.discountValue}`;

    return `Buy ${lowestQty}+ & save up to ${saving}`;
  }

  function findWidget() {
    return document.querySelector(
      ".bundlestack-widget:not(.bundlestack-widget--hidden):not(.bundlestack-widget--pending)"
    );
  }

  function makeInteractive(root) {
    const widget = findWidget();
    if (!widget) return;

    root.classList.add("bundlestack-badge--link");
    root.setAttribute("role", "button");
    root.setAttribute("tabindex", "0");
    root.setAttribute("aria-label", "View volume discount offers");

    const scrollToWidget = () => {
      widget.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    root.addEventListener("click", scrollToWidget);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        scrollToWidget();
      }
    });
  }

  function loadBadge(root) {
    const productId = root.dataset.productId;
    const proxyPath = root.dataset.proxyPath;
    const textEl = root.querySelector(".bundlestack-badge__text");

    if (!productId || !proxyPath || !textEl) {
      root.classList.add("bundlestack-badge--hidden");
      return;
    }

    fetch(`${proxyPath}?product_id=${encodeURIComponent(productId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const tiers = data.offers?.[0]?.tiers || [];
        const text = badgeText(tiers);

        if (!text) {
          root.classList.add("bundlestack-badge--hidden");
          return;
        }

        textEl.textContent = text;
        root.classList.remove("bundlestack-badge--pending");

        // Widget may still be fetching; retry briefly so the badge can
        // become a scroll-to-offer shortcut once tiers are rendered.
        let attempts = 0;
        const timer = setInterval(() => {
          attempts += 1;
          if (findWidget()) {
            makeInteractive(root);
            clearInterval(timer);
          } else if (attempts >= 20) {
            clearInterval(timer);
          }
        }, 500);
      })
      .catch(() => {
        root.classList.add("bundlestack-badge--hidden");
      });
  }

  if (!window.__bundlestackBadgeInit) {
    window.__bundlestackBadgeInit = true;
    document.querySelectorAll(".bundlestack-badge").forEach(loadBadge);
  }
})();
