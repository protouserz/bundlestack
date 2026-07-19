# Shared storefront fetch cache — loaded before badge/widget/overlay scripts.
# Dedupes identical app-proxy GETs when multiple BundleStack assets run on one page.
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
})(typeof window !== "undefined" ? window : this);
