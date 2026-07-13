(function () {
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMoney(cents, currency) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  }

  function formatBadge(tier) {
    return tier.discountType === "percentage"
      ? `Save ${tier.discountValue}%`
      : `Save $${tier.discountValue}`;
  }

  function unitPriceCents(baseCents, tier) {
    if (!baseCents) return null;
    if (tier.discountType === "percentage") {
      return Math.round(baseCents * (1 - tier.discountValue / 100));
    }
    return Math.max(
      0,
      baseCents - Math.round((tier.discountValue * 100) / tier.minQty)
    );
  }

  function tierLabel(tier) {
    if (tier.label && !/^save\s/i.test(tier.label.trim())) {
      return tier.label;
    }
    return `Buy ${tier.minQty}`;
  }

  function renderPrice(baseCents, tier, currency) {
    if (!baseCents) return "";

    const unitCents = unitPriceCents(baseCents, tier);
    const hasDiscount =
      tier.discountType === "percentage"
        ? tier.discountValue > 0
        : tier.discountValue > 0;

    if (!hasDiscount) {
      return `<span class="bundlestack-widget__tier-price bundlestack-widget__tier-price--regular">${escapeHtml(formatMoney(baseCents, currency))} <span class="bundlestack-widget__tier-price-each">each</span></span>`;
    }

    return `<span class="bundlestack-widget__tier-price">${escapeHtml(formatMoney(unitCents, currency))} <span class="bundlestack-widget__tier-price-each">each</span></span>`;
  }

  function findProductContext(widgetRoot) {
    return (
      widgetRoot.closest("product-info") ||
      widgetRoot.closest(".product") ||
      widgetRoot.closest("section") ||
      document
    );
  }

  function findProductForm(widgetRoot) {
    const ctx = findProductContext(widgetRoot);
    return (
      ctx.querySelector("product-form form") ||
      ctx.querySelector('form[action*="/cart/add"]') ||
      document.querySelector('form[action*="/cart/add"]')
    );
  }

  function findQuantityInput(widgetRoot) {
    const ctx = findProductContext(widgetRoot);
    const form = findProductForm(widgetRoot);
    const formId = form?.id;

    if (formId) {
      const associated = ctx.querySelector(
        `input[name="quantity"][form="${formId}"], .quantity__input[form="${formId}"]`
      );
      if (associated) return associated;
    }

    return (
      ctx.querySelector(".quantity__input[name='quantity']") ||
      ctx.querySelector('input[name="quantity"]') ||
      document.querySelector('input[name="quantity"]')
    );
  }

  function getSelectedQty(widgetRoot) {
    const selected = widgetRoot.querySelector(
      ".bundlestack-widget__tier--selected"
    );
    return selected?.dataset.minQty || widgetRoot.dataset.selectedQty || null;
  }

  function setProductQuantity(widgetRoot, qty) {
    const quantity = String(qty);
    const input = findQuantityInput(widgetRoot);
    if (!input) return false;

    input.value = quantity;
    input.setAttribute("value", quantity);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    widgetRoot.dataset.selectedQty = quantity;
    return true;
  }

  function getDefaultQuantity(widgetRoot) {
    const input = findQuantityInput(widgetRoot);
    if (!input) return "1";
    const min = parseInt(input.min, 10);
    return String(!Number.isNaN(min) && min > 0 ? min : 1);
  }

  function updateClearButton(widgetRoot) {
    const clearBtn = widgetRoot.querySelector(".bundlestack-widget__clear");
    if (!clearBtn) return;
    const hasSelection = Boolean(
      widgetRoot.querySelector(".bundlestack-widget__tier--selected")
    );
    clearBtn.classList.toggle("bundlestack-widget__clear--visible", hasSelection);
    clearBtn.hidden = !hasSelection;
  }

  function clearSelection(widgetRoot) {
    widgetRoot.querySelectorAll(".bundlestack-widget__tier").forEach((el) => {
      el.classList.remove("bundlestack-widget__tier--selected");
      el.setAttribute("aria-pressed", "false");
    });
    delete widgetRoot.dataset.selectedQty;
    setProductQuantity(widgetRoot, getDefaultQuantity(widgetRoot));
    updateClearButton(widgetRoot);
  }

  function syncQuantityFromSelection(widgetRoot) {
    const qty = getSelectedQty(widgetRoot);
    if (qty) setProductQuantity(widgetRoot, qty);
  }

  function getVariantId(widgetRoot) {
    const form = findProductForm(widgetRoot);
    const input = form?.querySelector('[name="id"]');
    return input?.value || null;
  }

  function cartRoot() {
    return window.Shopify?.routes?.root || "/";
  }

  async function checkoutWithQuantity(widgetRoot, quantity) {
    const variantId = getVariantId(widgetRoot);
    if (!variantId) return false;

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) return false;

    try {
      await fetch(`${cartRoot()}cart/clear.js`, {
        method: "POST",
        credentials: "same-origin",
      });

      const response = await fetch(`${cartRoot()}cart/add.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          items: [{ id: parseInt(variantId, 10), quantity: qty }],
        }),
      });

      if (!response.ok) return false;

      window.location.href = `${cartRoot()}checkout`;
      return true;
    } catch {
      return false;
    }
  }

  function isDynamicCheckoutButton(target) {
    return Boolean(
      target.closest(
        ".shopify-payment-button button, .shopify-payment-button__button, .shopify-payment-button__more-options, [data-shopify='payment-button'] button"
      )
    );
  }

  function installCheckoutGuards(widgetRoot) {
    const ctx = findProductContext(widgetRoot);
    const form = findProductForm(widgetRoot);

    ctx.addEventListener(
      "click",
      async (event) => {
        if (!isDynamicCheckoutButton(event.target)) return;

        const selectedQty = getSelectedQty(widgetRoot);
        if (!selectedQty) return;

        syncQuantityFromSelection(widgetRoot);

        const minTierQty = parseInt(selectedQty, 10);
        if (minTierQty < 2) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const ok = await checkoutWithQuantity(widgetRoot, selectedQty);
        if (!ok) {
          syncQuantityFromSelection(widgetRoot);
        }
      },
      true
    );

    if (form) {
      form.addEventListener(
        "submit",
        () => {
          syncQuantityFromSelection(widgetRoot);
        },
        true
      );
    }
  }

  function selectTier(root, tierEl, qty) {
    const isAlreadySelected = tierEl.classList.contains(
      "bundlestack-widget__tier--selected"
    );

    if (isAlreadySelected) {
      clearSelection(root);
      return;
    }

    root.querySelectorAll(".bundlestack-widget__tier").forEach((el) => {
      el.classList.remove("bundlestack-widget__tier--selected");
      el.setAttribute("aria-pressed", "false");
    });
    tierEl.classList.add("bundlestack-widget__tier--selected");
    tierEl.setAttribute("aria-pressed", "true");
    setProductQuantity(root, qty);
    updateClearButton(root);
  }

  function syncSelectedFromQuantity(root) {
    const qtyInput = findQuantityInput(root);
    if (!qtyInput) return;

    const qty = parseInt(qtyInput.value, 10);
    if (!qty) return;

    const tiers = Array.from(
      root.querySelectorAll(".bundlestack-widget__tier")
    ).sort(
      (a, b) =>
        parseInt(b.dataset.minQty, 10) - parseInt(a.dataset.minQty, 10)
    );

    const match = tiers.find((el) => qty >= parseInt(el.dataset.minQty, 10));
    root.querySelectorAll(".bundlestack-widget__tier").forEach((el) => {
      el.classList.remove("bundlestack-widget__tier--selected");
      el.setAttribute("aria-pressed", "false");
    });

    if (match) {
      match.classList.add("bundlestack-widget__tier--selected");
      match.setAttribute("aria-pressed", "true");
      root.dataset.selectedQty = match.dataset.minQty;
    } else {
      delete root.dataset.selectedQty;
    }
    updateClearButton(root);
  }

  function ensureClearButton(root, tiersEl) {
    let clearBtn = root.querySelector(".bundlestack-widget__clear");
    if (!clearBtn) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "bundlestack-widget__clear";
      clearBtn.textContent = "Clear selection";
      clearBtn.hidden = true;
      clearBtn.addEventListener("click", () => clearSelection(root));
      tiersEl.insertAdjacentElement("afterend", clearBtn);
    }
    return clearBtn;
  }

  function showWidget(root) {
    root.classList.remove("bundlestack-widget--pending", "bundlestack-widget--hidden");
  }

  function hideWidget(root) {
    root.classList.add("bundlestack-widget--hidden");
    root.classList.remove("bundlestack-widget--pending");
  }

  function typeLabel(type) {
    const labels = {
      bogo: "BOGO",
      free_gift: "Free gift",
      mix_match: "Mix & match",
      bundle_builder: "Bundle builder",
      fbt: "Frequently bought together",
    };
    return labels[type] || type;
  }

  function promotionTypeHint(promo) {
    const config = promo.config || {};
    switch (promo.promotionType) {
      case "bogo":
        return `Add ${Number(config.buyQuantity || 1) + Number(config.getQuantity || 1)}+ to unlock`;
      case "free_gift":
        return "Add the gift to your cart — it discounts at checkout when the threshold is met";
      case "mix_match":
        return `Add ${config.minItems || 2}+ qualifying items for the discount`;
      case "bundle_builder":
        return "Complete the kit steps, then checkout for the bundle price";
      case "fbt":
        return config.headline || "Pair recommended products for a bundle discount";
      default:
        return promo.summary || "";
    }
  }

  function renderPromotionCards(promotions) {
    if (!promotions.length) return "";
    return `
      <div class="bundlestack-widget__promotions" data-testid="bundlestack-promotions">
        ${promotions
          .map(
            (promo) => `
          <article
            class="bundlestack-widget__promo"
            data-promo-type="${escapeHtml(promo.promotionType)}"
            data-promo-id="${escapeHtml(promo.id)}"
          >
            <p class="bundlestack-widget__promo-type">${escapeHtml(typeLabel(promo.promotionType))}</p>
            <h3 class="bundlestack-widget__promo-title">${escapeHtml(promo.title)}</h3>
            <p class="bundlestack-widget__promo-summary">${escapeHtml(promo.summary || "")}</p>
            <p class="bundlestack-widget__promo-hint">${escapeHtml(promotionTypeHint(promo))}</p>
          </article>
        `,
          )
          .join("")}
      </div>
    `;
  }

  function renderTier(offer, priceCents, currency) {
    return offer.tiers
      .map((tier) => {
        const label = tierLabel(tier);
        const badge = formatBadge(tier);
        const price = renderPrice(priceCents, tier, currency);
        const showBadge =
          tier.discountType === "percentage"
            ? tier.discountValue > 0
            : tier.discountValue > 0;

        return `
          <button
            type="button"
            class="bundlestack-widget__tier"
            data-min-qty="${tier.minQty}"
            aria-pressed="false"
          >
            <span class="bundlestack-widget__tier-radio" aria-hidden="true"></span>
            <span class="bundlestack-widget__tier-label">${escapeHtml(label)}</span>
            <span class="bundlestack-widget__tier-meta">
              ${showBadge ? `<span class="bundlestack-widget__tier-badge">${escapeHtml(badge)}</span>` : ""}
              ${price}
            </span>
          </button>
        `;
      })
      .join("");
  }

  function initWidget(root) {
    const productId = root.dataset.productId;
    const proxyPath = root.dataset.proxyPath;
    const priceCents = parseInt(root.dataset.priceCents, 10) || 0;
    const currency = root.dataset.currency || "USD";
    const tiersEl = root.querySelector(".bundlestack-widget__tiers");

    if (!productId || !proxyPath || !tiersEl) {
      if (tiersEl && !productId) {
        tiersEl.innerHTML =
          '<p class="bundlestack-widget__empty">Save the theme, then preview the live store (not the editor).</p>';
      }
      hideWidget(root);
      return;
    }

    installCheckoutGuards(root);

    fetch(`${proxyPath}?product_id=${encodeURIComponent(productId)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const offers = data.offers || [];
        const promotions = data.promotions || [];
        const hasTiers = offers.length > 0 && offers[0]?.tiers?.length;
        const hasPromos = promotions.length > 0;

        if (!hasTiers && !hasPromos) {
          hideWidget(root);
          return;
        }

        showWidget(root);

        let html = "";
        if (hasTiers) {
          html += renderTier(offers[0], priceCents, currency);
        }
        if (hasPromos) {
          html += renderPromotionCards(promotions);
        }
        tiersEl.innerHTML = html;

        tiersEl.querySelectorAll(".bundlestack-widget__tier").forEach((tierEl) => {
          tierEl.addEventListener("click", () => {
            selectTier(root, tierEl, tierEl.dataset.minQty);
          });
        });

        if (hasTiers) {
          ensureClearButton(root, tiersEl);
          updateClearButton(root);

          const qtyInput = findQuantityInput(root);
          if (qtyInput) {
            qtyInput.addEventListener("change", () =>
              syncSelectedFromQuantity(root)
            );
            qtyInput.addEventListener("input", () =>
              syncSelectedFromQuantity(root)
            );
            syncSelectedFromQuantity(root);
          }
        }
      })
      .catch(() => {
        tiersEl.innerHTML =
          '<p class="bundlestack-widget__empty">Unable to load offers right now. Please refresh the page.</p>';
      });
  }

  document.querySelectorAll(".bundlestack-widget").forEach(initWidget);
})();
