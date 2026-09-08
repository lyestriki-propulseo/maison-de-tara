// Public pageviews only. The filter remains active across client-side navigation.
(function () {
  var domains = 'maisondetara.propulseo-site.com,maisondetara.com,www.maisondetara.com'.split(',');
  if (domains.indexOf(window.location.hostname) === -1) return;
  if (document.getElementById('umami-tracker')) return;

  window.umamiBeforeSend = function (type, payload) {
    if (type !== 'event' || payload.name) return false;
    var publicRoute = /^\/(?:index\.html|atelier\.html|boutique\.html|calendrier\.html|contact\.html|histoire\.html|mentions-legales\.html|politique-de-confidentialite\.html)?$/;
    if (!publicRoute.test(window.location.pathname)) return false;
    var url;
    try {
      url = new URL(payload.url, window.location.origin);
    } catch {
      return false;
    }
    if (url.origin !== window.location.origin || !publicRoute.test(url.pathname)) return false;
    var referrer = '';
    try {
      referrer = payload.referrer ? new URL(payload.referrer).origin : '';
    } catch {
      referrer = '';
    }
    // No query, fragment, form data, user identifier or arbitrary event properties.
    return {
      website: payload.website,
      hostname: window.location.hostname,
      screen: payload.screen,
      language: payload.language,
      title: url.pathname,
      url: url.pathname,
      referrer: referrer,
    };
  };

  var script = document.createElement('script');
  script.id = 'umami-tracker';
  script.src = 'https://stats.propulseo-site.com/script.js';
  script.async = true;
  script.setAttribute('data-website-id', '7060ebcb-aec0-49dd-b1f5-4dc2b642719e');
  script.setAttribute('data-domains', domains.join(','));
  script.setAttribute('data-exclude-search', 'true');
  script.setAttribute('data-exclude-hash', 'true');
  script.setAttribute('data-do-not-track', 'true');
  script.setAttribute('data-before-send', 'umamiBeforeSend');
  document.head.appendChild(script);
})();
