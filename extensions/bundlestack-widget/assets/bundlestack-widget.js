(function () {
  function initWidget(root) {
    const productId = root.dataset.productId;
    const proxyPath = root.dataset.proxyPath;
    const tiersEl = root.querySelector(".bundlestack-widget__tiers");

    if (!productId || !proxyPath || !tiersEl) {
      if (tiersEl && !productId) {
        tiersEl.innerHTML =
          '<p class="bundlestack-widget__empty">Save the theme, then preview the live store (not the editor).</p>';
      }
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

        if (offers.length === 0) {
          tiersEl.innerHTML =
            '<p class="bundlestack-widget__empty">No bundle offers for this product.</p>';
          return;
        }

        const offer = offers[0];
        tiersEl.innerHTML = offer.tiers
          .map((tier) => {
            const label =
              tier.label ||
              `Buy ${tier.minQty}+`;
            const discount =
              tier.discountType === "percentage"
                ? `${tier.discountValue}% off`
                : `$${tier.discountValue} off`;

            return `
              <div class="bundlestack-widget__tier" data-min-qty="${tier.minQty}">
                <span class="bundlestack-widget__tier-label">${label}</span>
                <span class="bundlestack-widget__tier-discount">${discount}</span>
              </div>
            `;
          })
          .join("");

        tiersEl.querySelectorAll(".bundlestack-widget__tier").forEach((tierEl) => {
          tierEl.addEventListener("click", () => {
            const qty = tierEl.dataset.minQty;
            const qtyInput =
              document.querySelector('[name="quantity"]') ||
              document.querySelector('input[type="number"]');
            if (qtyInput && qty) {
              qtyInput.value = qty;
              qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
        });
      })
      .catch(() => {
        tiersEl.innerHTML =
          '<p class="bundlestack-widget__empty">Unable to load offers. Is <code>npm run dev</code> running?</p>';
      });
  }

  document.querySelectorAll(".bundlestack-widget").forEach(initWidget);
})();
