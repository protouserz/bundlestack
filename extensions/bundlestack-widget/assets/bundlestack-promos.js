// Promotion summaries on the product widget. Separate asset so the 10KB
// quantity-break widget stays under Shopify's theme extension JS limit.
(function () {
  function escapeHtml(value) {
    const el = document.createElement("div");
    el.textContent = value;
    return el.innerHTML;
  }

  function renderPromos(root, promotions) {
    if (!promotions || promotions.length === 0) return;
    let host = root.querySelector(".bundlestack-widget__promos");
    if (!host) {
      host = document.createElement("div");
      host.className = "bundlestack-widget__promos";
      root.appendChild(host);
    }
    host.innerHTML = promotions
      .map(function (promo) {
        return (
          '<div class="bundlestack-widget__promo">' +
          '<p class="bundlestack-widget__promo-title">' +
          escapeHtml(promo.title || "Offer") +
          "</p>" +
          '<p class="bundlestack-widget__promo-summary">' +
          escapeHtml(promo.summary || "") +
          "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  function show(root) {
    root.classList.remove(
      "bundlestack-widget--pending",
      "bundlestack-widget--hidden",
    );
    root.removeAttribute("hidden");
    root.style.removeProperty("display");
  }

  function load(root) {
    const productId = root.dataset.productId;
    const proxyPath = root.dataset.proxyPath;
    if (!productId || !proxyPath) return;
    const url = proxyPath + "?product_id=" + encodeURIComponent(productId);
    const fetchJson =
      window.__bundlestackFetchJson ||
      function (path) {
        return fetch(path).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        });
      };
    fetchJson(url)
      .then(function (data) {
        const promotions = data.promotions || [];
        if (promotions.length === 0) return;
        renderPromos(root, promotions);
        show(root);
        var observer = new MutationObserver(function () {
          if (
            root.querySelector(".bundlestack-widget__promo") &&
            root.classList.contains("bundlestack-widget--hidden")
          ) {
            show(root);
          }
        });
        observer.observe(root, {
          attributes: true,
          attributeFilter: ["class", "hidden", "style"],
        });
      })
      .catch(function () {});
  }

  function init() {
    document.querySelectorAll(".bundlestack-widget").forEach(load);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
