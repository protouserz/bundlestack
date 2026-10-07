(function () {
  const PROCESSED_ATTR = "data-bundlestack-overlay";
  const CARD_SELECTOR =
    ".product-card, .card-wrapper, .card, product-card, .product-grid__item, .grid__item, li, article";

  function formatSaving(type, value) {
    return type === "percentage" ? `${value}%` : `$${value}`;
  }

  function badgeLines(badge) {
    if (badge.offerType === "bogo" || Number(badge.getQty) > 0) {
      const getQty = Math.max(1, Math.floor(Number(badge.getQty)) || 1);
      return {
        primary: `Buy ${badge.minQty} get ${getQty} free`,
        secondary: null,
      };
    }

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
    const nestedImg = anchor.querySelector("img");
    if (nestedImg?.parentElement) return nestedImg.parentElement;
    const card = findCard(anchor);
    if (!card) return null;
    return (
      card.querySelector(
        ".product-card__media, .card__media, .media, .card-media, .product-card-media",
      ) ||
      card.querySelector("img")?.parentElement ||
      null
    );
  }

  function paintLook(el, look) {
    if (window.__bundlestackApplyLook && look && typeof look === "object") {
      window.__bundlestackApplyLook(el, look);
    }
    let accent =
      el.style.getPropertyValue("--bs-emerald").trim() ||
      (look && look.accent) ||
      "";
    const widgets = document.getElementsByClassName("bundlestack-widget");
    for (let i = 0; i < widgets.length; i++) {
      if (widgets[i].classList.contains("bundlestack-widget--pending")) continue;
      const next = getComputedStyle(widgets[i])
        .getPropertyValue("--bs-emerald")
        .trim();
      if (next) {
        accent = next;
        el.style.setProperty("--bs-emerald", next);
        break;
      }
    }
    if (accent) {
      el.style.setProperty("background", accent, "important");
      return true;
    }
    return false;
  }

  function applyToContainer(container, badge) {
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

    paintLook(pill, badge.widgetLook);
    setTimeout(() => paintLook(pill, badge.widgetLook), 400);

    container.appendChild(pill);
    return true;
  }

  function applyBadge(anchor, badge) {
    return applyToContainer(findImageContainer(anchor), badge);
  }

  function badgeForAnchor(anchor, byHandle, byProductId, catalog) {
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
    return catalog || null;
  }

  function featuredMedia() {
    return document.querySelector(
      ".product__media-item.is-active .product-media-container, .product-media-container, .product__media",
    );
  }

  function scan(byHandle, byProductId, catalog) {
    const config = document.querySelector(".bundlestack-overlay-config");
    const handle = config?.dataset.productHandle;
    if (handle) {
      const pageBadge =
        byHandle.get(handle) ||
        byProductId.get(config.dataset.productId) ||
        catalog;
      if (pageBadge) applyToContainer(featuredMedia(), pageBadge);
      return;
    }

    const seenCards = new WeakSet();
    document.querySelectorAll('a[href*="/products/"]').forEach((anchor) => {
      if (anchor.closest(".bundlestack-widget, .bundlestack-badge")) return;

      const badge = badgeForAnchor(anchor, byHandle, byProductId, catalog);
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

    const url = `${proxyPath}?badges=1&format=2`;
    const fetchOpts = {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    const fetchJson =
      window.__bundlestackFetchJson ||
      ((path, options) =>
        fetch(path, options).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        }));

    fetchJson(url, fetchOpts)
      .then((data) => {
        const badges = data.badges || [];
        const catalog = data.catalog || badges.find((badge) => badge.catalog);
        if (badges.length === 0 && !catalog) return;

        const byHandle = new Map(
          badges
            .filter((badge) => !badge.catalog && badge.handle)
            .map((badge) => [badge.handle, badge]),
        );
        const byProductId = new Map(
          badges
            .filter((badge) => !badge.catalog && badge.productId)
            .map((badge) => [String(badge.productId), badge]),
        );

        function offerLook(offers) {
          const list = offers || [];
          return (
            list.find((item) => item.offerType === "bogo") || list[0] || {}
          ).widgetLook;
        }

        function attachLook(look) {
          if (!look) return;
          badges.forEach((badge) => {
            if (!badge.widgetLook) badge.widgetLook = look;
          });
          if (catalog && !catalog.widgetLook) catalog.widgetLook = look;
        }

        const known = badges.find((badge) => badge.widgetLook)?.widgetLook;
        const sampleId = badges.find((badge) => badge.productId)?.productId;
        const lookReady = known
          ? Promise.resolve(attachLook(known))
          : sampleId
            ? fetchJson(
                `${proxyPath}?product_id=${encodeURIComponent(
                  String(sampleId).indexOf("gid://") === 0
                    ? sampleId
                    : `gid://shopify/Product/${sampleId}`,
                )}`,
              )
                .then((payload) => attachLook(offerLook(payload.offers)))
                .catch(() => {})
            : Promise.resolve();

        lookReady.then(() => {
        scan(byHandle, byProductId, catalog);

        let timer = null;
        let quietTimer = null;
        const QUIET_MS = 45000;

        function scheduleDisconnect(observer) {
          if (quietTimer) clearTimeout(quietTimer);
          quietTimer = setTimeout(() => observer.disconnect(), QUIET_MS);
        }

        function mutationsAddProductLinks(mutations) {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== 1) continue;
              if (node.classList?.contains("bundlestack-overlay-pill")) {
                continue;
              }
              if (
                node.matches?.('a[href*="/products/"]') ||
                node.querySelector?.('a[href*="/products/"]')
              ) {
                return true;
              }
            }
          }
          return false;
        }

        const observer = new MutationObserver((mutations) => {
          if (!mutationsAddProductLinks(mutations)) return;
          scheduleDisconnect(observer);
          if (timer) return;
          timer = setTimeout(() => {
            timer = null;
            scan(byHandle, byProductId, catalog);
          }, 500);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        scheduleDisconnect(observer);
        });
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
