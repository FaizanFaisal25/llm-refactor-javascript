// Tracking-disabled GTM compatibility shim.
// Keeps expected globals/functions so page code does not break.
(function(w) {
    var dl = w.dataLayer = w.dataLayer || [];
    if (!dl._pp_noop) {
        dl._pp_noop = true;
        dl._pp_orig_push = typeof dl.push === "function" ? dl.push : null;
        dl.push = function() {
            return dl.length;
        };
    }

    if (typeof w.gtag !== "function") {
        w.gtag = function() {};
    }
})(window);

(function(w, g) {
    w[g] = w[g] || {};
    if (typeof w[g].e !== "function") {
        w[g].e = function() {
            return undefined;
        };
    }
})(window, "google_tag_manager");
