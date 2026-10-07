(function () {
  function badgeText(offer) {
    const tiers = offer?.tiers || [];
    const startingTier = [...tiers].sort((a, b) => a.minQty - b.minQty)[0];
    if (!startingTier?.minQty) return null;

    if (offer.offerType === "bogo" || Number(startingTier.getQty) > 0) {
      const getQty = Math.max(1, Math.floor(Number(startingTier.getQty)) || 1);
      return `Buy ${startingTier.minQty} get ${getQty} free`;
    }

    if (startingTier.discountValue <= 0) return null;

    const best = tiers.reduce((max, tier) =>
      tier.discountValue > max.discountValue ? tier : max
    );
    if (!best.discountValue || best.discountValue <= 0) return null;

    const startingSaving =
      startingTier.discountType === "percentage"
        ? `${startingTier.discountValue}%`
        : `$${startingTier.discountValue}`;
    const maximumSaving =
      best.discountType === "percentage"
        ? `${best.discountValue}%`
        : `$${best.discountValue}`;

    if (startingSaving === maximumSaving) {
      return `Buy ${startingTier.minQty}, save ${startingSaving}`;
    }

    return `Buy ${startingTier.minQty}, save ${startingSaving} · Buy more, save up to ${maximumSaving}`;
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

    const hideBadge = () => {
      root.classList.add("bundlestack-badge--hidden");
      root.classList.remove("bundlestack-badge--pending");
      root.hidden = true;
      root.setAttribute("hidden", "");
      root.style.setProperty("display", "none", "important");
    };

    const showBadge = () => {
      root.classList.remove("bundlestack-badge--pending", "bundlestack-badge--hidden");
      root.hidden = false;
      root.removeAttribute("hidden");
      root.style.removeProperty("display");
    };

    if (!productId || !proxyPath || !textEl) {
      hideBadge();
      return;
    }

    const url = `${proxyPath}?product_id=${encodeURIComponent(productId)}`;
    const fetchJson =
      window.__bundlestackFetchJson ||
      ((path) =>
        fetch(path).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        }));

    fetchJson(url).then((data) => {
        const offers = data.offers || [];
        const offer =
          offers.find(
            (item) =>
              item.offerType === "bogo" || Number(item.tiers?.[0]?.getQty) > 0,
          ) || offers[0];
        const text = badgeText(offer);

        if (!text) {
          hideBadge();
          return;
        }

        textEl.textContent = text;
        showBadge();
        if (window.__bundlestackApplyLook) {
          window.__bundlestackApplyLook(root, offer.widgetLook);
        } else if (
          offer.widgetLook?.accent &&
          offer.widgetLook.matchTheme !== true &&
          offer.widgetLook.matchTheme !== "true"
        ) {
          root.style.setProperty("--bs-emerald", offer.widgetLook.accent);
          root.style.setProperty("--bs-emerald-border", offer.widgetLook.accent);
          if (offer.widgetLook.selectedBackground) {
            root.style.setProperty(
              "--bs-emerald-soft",
              offer.widgetLook.selectedBackground,
            );
          }
        }

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
        hideBadge();
      });
  }

  if (!window.__bundlestackBadgeInit) {
    window.__bundlestackBadgeInit = true;
    document.querySelectorAll(".bundlestack-badge").forEach((root) => {
      if (!root.closest(".product__info-wrapper, product-info")) {
        root.remove();
        return;
      }
      loadBadge(root);
    });
  }
})();
