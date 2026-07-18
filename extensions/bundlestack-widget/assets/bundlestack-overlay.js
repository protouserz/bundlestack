(function () {
  const PROCESSED_ATTR = "data-bundlestack-overlay";
  const CARD_SELECTOR =
    ".product-card, .card-wrapper, .card, product-card, .product-grid__item, .grid__item, li, article";

  function formatSaving(type, value) {
    return type === "percentage" ? `${value}%` : `$${value}`;
  }

  function badgeLines(badge) {
    const startingSaving = formatSaving(
      badge.startingDiscountType,
      badge.startingDiscountValue,
    );
    const maximumSaving = formatSaving(
      badge.discountType,
      badge.discountValue,
    );

    return {
      primary: `Buy ${badge.minQty}, save ${startingSaving}`,
      secondary:
        startingSaving === maximumSaving
          ? null
          : `Buy more, save up to ${maximumSaving}`,
    };
  }

  function handleFromHref(href) {
    try {
      const path = new URL(href, window.location.origin).pathname;
      const match = /\/products\/([^/]+)/.exec(path);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  function findCard(anchor) {
    return anchor.closest(CARD_SELECTOR);
  }

  function findImageContainer(anchor) {
    // Direct image inside the product link (Dawn-style cards).
    const nestedImg = anchor.querySelector("img");
    if (nestedImg?.parentElement) return nestedImg.parentElement;

    // Horizon and similar themes use an overlay <a> with the image as a
    // sibling inside the product card — climb to the card, then find media.
    const card = findCard(anchor);
    if (!card) return null;

    const media =
      card.querySelector(
        ".product-card__media, .card__media, .media, .card-media, .product-card-media",
      ) || card.querySelector("img")?.parentElement;

    return media || null;
  }

  function applyBadge(anchor, badge) {
    const container = findImageContainer(anchor);
    if (!container || container.hasAttribute(PROCESSED_ATTR)) return false;
    container.setAttribute(PROCESSED_ATTR, "true");

    const style = window.getComputedStyle(container);
    if (style.position === "static") {
      container.style.position = "relative";
    }

    const pill = document.createElement("span");
    pill.className = "bundlestack-overlay-pill";
    const lines = badgeLines(badge);

    const primary = document.createElement("span");
    primary.className = "bundlestack-overlay-pill__primary";
    primary.textContent = lines.primary;
    pill.appendChild(primary);

    if (lines.secondary) {
      const secondary = document.createElement("span");
      secondary.className = "bundlestack-overlay-pill__secondary";
      secondary.textContent = lines.secondary;
      pill.appendChild(secondary);
    }

    container.appendChild(pill);
    return true;
  }

  function badgeForAnchor(anchor, byHandle, byProductId) {
    const handle = handleFromHref(anchor.getAttribute("href"));
    if (handle && byHandle.has(handle)) return byHandle.get(handle);

    const card = findCard(anchor);
    const idAttr =
      card?.getAttribute("data-product-id") ||
      card?.querySelector("[data-product-id]")?.getAttribute("data-product-id") ||
      anchor.getAttribute("data-product-id");
    if (idAttr && byProductId.has(String(idAttr))) {
      return byProductId.get(String(idAttr));
    }
    return null;
  }

  function scan(byHandle, byProductId) {
    const seenCards = new WeakSet();

    document.querySelectorAll('a[href*="/products/"]').forEach((anchor) => {
      if (anchor.closest(".bundlestack-widget, .bundlestack-badge")) return;

      const badge = badgeForAnchor(anchor, byHandle, byProductId);
      if (!badge) return;

      const card = findCard(anchor);
      if (card) {
        if (seenCards.has(card)) return;
        seenCards.add(card);
      }

      applyBadge(anchor, badge);
    });
  }

  function init() {
    const config = document.querySelector(".bundlestack-overlay-config");
    // Schema-declared assets can load even if the config node is delayed;
    // fall back to the known app-proxy path.
    const proxyPath =
      config?.dataset.proxyPath || "/apps/bundlestack/offers";

    fetch(`${proxyPath}?badges=1&format=2`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const badges = data.badges || [];
        if (badges.length === 0) return;

        const byHandle = new Map(
          badges.map((badge) => [badge.handle, badge]),
        );
        const byProductId = new Map(
          badges
            .filter((badge) => badge.productId)
            .map((badge) => [String(badge.productId), badge]),
        );

        scan(byHandle, byProductId);

        let timer = null;
        const observer = new MutationObserver(() => {
          if (timer) return;
          timer = setTimeout(() => {
            timer = null;
            scan(byHandle, byProductId);
          }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      })
      .catch(() => {});
  }

  if (!window.__bundlestackOverlayInit) {
    window.__bundlestackOverlayInit = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
