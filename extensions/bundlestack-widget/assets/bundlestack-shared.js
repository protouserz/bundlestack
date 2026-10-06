// Shared storefront fetch cache — loaded before badge/widget/overlay scripts.
// Dedupes identical app-proxy GETs when multiple BundleStack assets run on one page.
(function (global) {
  function solidColor(value) {
    if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") {
      return "";
    }
    return value;
  }

  function varColor(el, names) {
    if (!el) return "";
    var cs = getComputedStyle(el);
    for (var i = 0; i < names.length; i++) {
      var raw = cs.getPropertyValue(names[i]).trim();
      if (!raw) continue;
      if (/^[\d.]/.test(raw)) {
        var inner = raw.indexOf(",") >= 0 ? raw : raw.replace(/\s+/g, ", ");
        return "rgb(" + inner + ")";
      }
      if (raw !== "transparent") return raw;
    }
    return "";
  }

  function sampleThemeColors(root) {
    var host =
      document.querySelector(".color-scheme-1, .gradient") || document.body;
    var accent = varColor(host, [
      "--color-button",
      "--color-base-accent-1",
      "--color-primary",
    ]);
    var btn =
      document.querySelector(".shopify-payment-button__button--unbranded") ||
      document.querySelector(".shopify-payment-button__button") ||
      document.querySelector('form[action*="/cart/add"] button[name="add"]') ||
      document.querySelector(".product-form__submit");
    if ((!accent || accent === "rgb(255, 255, 255)") && btn) {
      var buttonStyles = getComputedStyle(btn);
      accent =
        solidColor(buttonStyles.backgroundColor) ||
        solidColor(buttonStyles.color);
    }
    var text =
      varColor(host, ["--color-foreground", "--color-base-text"]) ||
      solidColor(getComputedStyle(host).color);
    var surface =
      varColor(host, ["--color-background", "--color-base-background-1"]) ||
      solidColor(getComputedStyle(root.parentElement || host).backgroundColor) ||
      solidColor(getComputedStyle(host).backgroundColor);
    return {
      accent: accent,
      text: text,
      surface: surface,
      soft:
        accent && surface
          ? "color-mix(in srgb, " + accent + " 14%, " + surface + ")"
          : "",
    };
  }

  function isThemeLook(look) {
    return look && (look.matchTheme === true || look.matchTheme === "true");
  }

  global.__bundlestackApplyLook = function (root, look) {
    if (!root || !look) return;
    var title = root.querySelector(".bundlestack-widget__title");
    if (title && look.heading) title.textContent = look.heading;
    var group = root.querySelector(".bundlestack-widget__tiers");
    if (group && look.heading) group.setAttribute("aria-label", look.heading);

    if (isThemeLook(look)) {
      var theme = sampleThemeColors(root);
      var text = theme.text || look.textColor;
      var surface = theme.surface || look.background;
      var accent = theme.accent || look.accent;
      var soft = theme.soft || look.selectedBackground;
      if (text) root.style.setProperty("--bs-navy", text);
      if (surface) root.style.setProperty("--bs-surface", surface);
      if (accent) {
        root.style.setProperty("--bs-emerald", accent);
        root.style.setProperty("--bs-emerald-border", accent);
      }
      if (soft) root.style.setProperty("--bs-emerald-soft", soft);
      return;
    }

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

  if (global.__bundlestackFetchJson) return;

  var cache = Object.create(null);

  global.__bundlestackFetchJson = function (url, options) {
    if (cache[url]) return cache[url];

    var promise = fetch(url, Object.assign({ cache: "no-store" }, options || {}))
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
