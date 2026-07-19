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
    const productInfo = widgetRoot.closest("product-info");
    if (productInfo) return productInfo;

    const product = widgetRoot.closest(".product");
    if (product) return product;

    // App blocks often live in their own section — walk up to a
    // container that actually owns the product form / buy box.
    let el = widgetRoot.parentElement;
    while (el && el !== document.body) {
      if (
        el.querySelector?.(
          'form[action*="/cart/add"], product-form form, product-form'
        )
      ) {
        return el;
      }
      el = el.parentElement;
    }

    return document;
  }

  function findProductForm(widgetRoot) {
    const ctx = findProductContext(widgetRoot);
    return (
      ctx.querySelector("product-form form") ||
      ctx.querySelector('form[action*="/cart/add"]') ||
      document.querySelector("product-form form") ||
      document.querySelector('form[action*="/cart/add"]')
    );
  }

  function quantityInputCandidates(widgetRoot) {
    const form = findProductForm(widgetRoot);
    const formId = form?.id;
    const candidates = [];

    if (form) {
      form
        .querySelectorAll('input[name="quantity"], .quantity__input')
        .forEach((el) => candidates.push(el));
    }

    if (formId) {
      document
        .querySelectorAll(
          `input[name="quantity"][form="${formId}"], .quantity__input[form="${formId}"]`
        )
        .forEach((el) => candidates.push(el));
    }

    const ctx = findProductContext(widgetRoot);
    ctx
      .querySelectorAll('input[name="quantity"], .quantity__input')
      .forEach((el) => candidates.push(el));

    return [...new Set(candidates)];
  }

  function findQuantityInput(widgetRoot) {
    const candidates = quantityInputCandidates(widgetRoot);
    return (
      candidates.find((el) => el.matches?.(".quantity__input")) ||
      candidates[0] ||
      null
    );
  }

  function ensureQuantityInput(widgetRoot) {
    let input = findQuantityInput(widgetRoot);
    if (input) return input;

    const form = findProductForm(widgetRoot);
    if (!form) return null;

    input = document.createElement("input");
    input.type = "hidden";
    input.name = "quantity";
    input.value = "1";
    input.setAttribute("data-bundlestack-quantity", "true");
    form.appendChild(input);
    return input;
  }

  function getSelectedQty(widgetRoot) {
    const selected = widgetRoot.querySelector(
      ".bundlestack-widget__tier--selected"
    );
    return selected?.dataset.minQty || widgetRoot.dataset.selectedQty || null;
  }

  function setProductQuantity(widgetRoot, qty) {
    const quantity = String(qty);
    widgetRoot.dataset.selectedQty = quantity;

    const inputs = quantityInputCandidates(widgetRoot);
    if (inputs.length === 0) {
      const injected = ensureQuantityInput(widgetRoot);
      if (!injected) return false;
      inputs.push(injected);
    }

    inputs.forEach((input) => {
      input.value = quantity;
      input.setAttribute("value", quantity);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

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
    if (!form) {
      return (
        document.querySelector(
          'form[action*="/cart/add"] [name="id"], product-form [name="id"]'
        )?.value || null
      );
    }

    const inside = form.querySelector('[name="id"]');
    if (inside?.value) return inside.value;

    if (form.id) {
      const associated = document.querySelector(
        `input[name="id"][form="${CSS.escape(form.id)}"], select[name="id"][form="${CSS.escape(form.id)}"]`
      );
      if (associated?.value) return associated.value;
    }

    return null;
  }

  function cartRoot() {
    return window.Shopify?.routes?.root || "/";
  }

  function cartAddUrl() {
    return window.Shopify?.routes?.root
      ? `${window.Shopify.routes.root}cart/add.js`
      : "/cart/add.js";
  }

  function findCartUi() {
    return (
      document.querySelector("cart-drawer") ||
      document.querySelector("cart-notification") ||
      null
    );
  }

  function isDynamicCheckoutButton(target) {
    return Boolean(
      target.closest(
        ".shopify-payment-button button, .shopify-payment-button__button, .shopify-payment-button__more-options, [data-shopify='payment-button'] button"
      )
    );
  }

  function isAddToCartControl(target) {
    if (isDynamicCheckoutButton(target)) return false;
    return Boolean(
      target.closest(
        'button[name="add"], button[type="submit"][name="add"], form[action*="/cart/add"] button[type="submit"], product-form button[type="submit"]'
      )
    );
  }

  async function postCartAdd(widgetRoot, quantity, { clearCart = false } = {}) {
    const variantId = getVariantId(widgetRoot);
    if (!variantId) return null;

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) return null;

    try {
      if (clearCart) {
        await fetch(`${cartRoot()}cart/clear.js`, {
          method: "POST",
          credentials: "same-origin",
        });
      }

      const form = findProductForm(widgetRoot);
      const formData = form ? new FormData(form) : new FormData();
      formData.set("id", String(variantId));
      formData.set("quantity", String(qty));
      formData.delete("items");
      formData.delete("sections");
      formData.delete("sections_url");

      const response = await fetch(cartAddUrl(), {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async function checkoutWithQuantity(widgetRoot, quantity) {
    const payload = await postCartAdd(widgetRoot, quantity, { clearCart: true });
    if (!payload) return false;
    window.location.href = `${cartRoot()}checkout`;
    return true;
  }

  async function fetchCartSections(cartUi) {
    if (!cartUi?.getSectionsToRender) return null;
    try {
      const ids = cartUi
        .getSectionsToRender()
        .map((section) => section.id)
        .filter(Boolean);
      if (!ids.length) return null;

      const response = await fetch(
        `${window.location.pathname}?sections=${encodeURIComponent(ids.join(","))}`,
        { credentials: "same-origin" }
      );
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function addToCartWithQuantity(widgetRoot, quantity) {
    const payload = await postCartAdd(widgetRoot, quantity);
    if (!payload) return false;

    const cartUi = findCartUi();
    // Always refetch section HTML after add. cart/add.js sections can be
    // incomplete and Dawn's renderContents will blank the drawer line items.
    const sections = await fetchCartSections(cartUi);

    if (
      cartUi &&
      typeof cartUi.renderContents === "function" &&
      sections &&
      Object.keys(sections).length > 0
    ) {
      cartUi.classList?.remove?.("is-empty");
      cartUi
        .querySelector?.(".drawer__inner.is-empty")
        ?.classList?.remove("is-empty");
      cartUi.renderContents({ ...payload, sections });
      cartUi.classList?.remove?.("is-empty");
      return true;
    }

    document.dispatchEvent(
      new CustomEvent("cart:updated", { detail: { cart: payload } })
    );
    document.documentElement.dispatchEvent(
      new CustomEvent("cart:refresh", { bubbles: true })
    );

    if (cartUi && typeof cartUi.open === "function") {
      cartUi.classList?.remove?.("is-empty");
      cartUi.open();
    } else {
      window.location.href = `${cartRoot()}cart`;
    }

    return true;
  }

  function installCheckoutGuards(widgetRoot) {
    ensureQuantityInput(widgetRoot);

    // Capture on document so we still intercept ATC when the app block
    // lives in a separate section from the buy box.
    document.addEventListener(
      "click",
      async (event) => {
        const selectedQty = getSelectedQty(widgetRoot);
        if (!selectedQty) return;

        const minTierQty = parseInt(selectedQty, 10);
        if (!minTierQty || minTierQty < 2) return;

        const form = findProductForm(widgetRoot);
        const inProductForm =
          form &&
          (form.contains(event.target) ||
            event.target.closest?.(`button[form="${form.id}"]`) ||
            event.target.getAttribute?.("form") === form.id);
        if (!inProductForm && !isAddToCartControl(event.target)) return;

        if (isDynamicCheckoutButton(event.target)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          const ok = await checkoutWithQuantity(widgetRoot, selectedQty);
          if (!ok) syncQuantityFromSelection(widgetRoot);
          return;
        }

        if (!isAddToCartControl(event.target)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        syncQuantityFromSelection(widgetRoot);
        const ok = await addToCartWithQuantity(widgetRoot, selectedQty);
        if (!ok) {
          // Fall back to letting the theme handle ATC with synced qty.
          syncQuantityFromSelection(widgetRoot);
          form?.requestSubmit?.();
        }
      },
      true
    );

    const form = findProductForm(widgetRoot);
    if (form) {
      form.addEventListener(
        "submit",
        (event) => {
          const selectedQty = getSelectedQty(widgetRoot);
          if (!selectedQty) return;

          syncQuantityFromSelection(widgetRoot);

          const minTierQty = parseInt(selectedQty, 10);
          if (minTierQty < 2) return;

          // ProductForm themes often preventDefault then read FormData —
          // rewrite quantity here so AJAX ATC still gets the tier qty.
          try {
            const formData = new FormData(form);
            if (formData.get("quantity") !== String(selectedQty)) {
              // Ensure associated inputs are set before theme reads FormData.
              setProductQuantity(widgetRoot, selectedQty);
            }
          } catch {
            setProductQuantity(widgetRoot, selectedQty);
          }

          // Avoid duplicate handling if click interceptor already ran.
          if (event.defaultPrevented) return;
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
    root.dataset.selectedQty = String(qty);
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

  function whenIdle(callback) {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => callback(), { timeout: 1200 });
      return;
    }
    setTimeout(callback, 1);
  }

  function findVisibilityTarget(element) {
    let el = element.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) return el;
      }
      el = el.parentElement;
    }
    return document.body;
  }

  function whenNearViewport(element, callback) {
    if (typeof IntersectionObserver !== "function") {
      whenIdle(callback);
      return;
    }

    // Pending widgets use display:none (no box). Observe a visible ancestor
    // so we still defer until the product section is near the viewport.
    const target = findVisibilityTarget(element);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        whenIdle(callback);
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(target);
  }

  function loadOffers(root) {
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

    fetch(`${proxyPath}?product_id=${encodeURIComponent(productId)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const offers = data.offers || [];

        if (offers.length === 0 || !offers[0]?.tiers?.length) {
          hideWidget(root);
          return;
        }

        showWidget(root);
        const offer = offers[0];
        tiersEl.innerHTML = offer.tiers
          .map((tier) => {
            const minQty = Math.max(1, Math.floor(Number(tier.minQty)) || 1);
            const label = tierLabel({ ...tier, minQty });
            const badge = formatBadge({ ...tier, minQty });
            const price = renderPrice(priceCents, { ...tier, minQty }, currency);
            const showBadge =
              tier.discountType === "percentage"
                ? tier.discountValue > 0
                : tier.discountValue > 0;

            return `
              <button
                type="button"
                class="bundlestack-widget__tier"
                data-min-qty="${minQty}"
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

        tiersEl.querySelectorAll(".bundlestack-widget__tier").forEach((tierEl) => {
          tierEl.addEventListener("click", () => {
            selectTier(root, tierEl, tierEl.dataset.minQty);
          });
        });

        ensureClearButton(root, tiersEl);
        updateClearButton(root);
        installCheckoutGuards(root);

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
      })
      .catch(() => {
        hideWidget(root);
      });
  }

  function initWidget(root) {
    whenNearViewport(root, () => loadOffers(root));
  }

  if (!window.__bundlestackWidgetInit) {
    window.__bundlestackWidgetInit = true;
    document.querySelectorAll(".bundlestack-widget").forEach(initWidget);
  }
})();
