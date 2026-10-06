// Shared storefront fetch cache — loaded before badge/widget/overlay scripts.
// Dedupes identical app-proxy GETs when multiple BundleStack assets run on one page.
(function (global) {
  if (global.__bundlestackFetchJson) return;

  var cache = Object.create(null);

  global.__bundlestackFetchJson = function (url, options) {
    if (cache[url]) return cache[url];

    var promise = fetch(url, options || {})
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function (err) {
        delete cache[url];
        throw err;
      });

    cache[url] = promise;
    return promise;
  };

  global.__bundlestackApplyLook = function (root, look) {
    if (!root || !look) return;
    var title = root.querySelector(".bundlestack-widget__title");
    if (title && look.heading) title.textContent = look.heading;
    var group = root.querySelector(".bundlestack-widget__tiers");
    if (group && look.heading) group.setAttribute("aria-label", look.heading);
    if (look.textColor) root.style.setProperty("--bs-navy", look.textColor);
    if (look.background) root.style.setProperty("--bs-surface", look.background);
    if (look.accent) {
      root.style.setProperty("--bs-emerald", look.accent);
      root.style.setProperty("--bs-emerald-border", look.accent);
    }
    if (look.selectedBackground) {
      root.style.setProperty("--bs-emerald-soft", look.selectedBackground);
    }
  };
})(typeof window !== "undefined" ? window : this);
