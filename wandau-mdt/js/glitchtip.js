/* GlitchTip: error reporting only. SDK is pinned and served from this site. */
(function () {
  'use strict';
  if (!window.Sentry || !['maisondetara.propulseo-site.com', 'www.maisondetara.propulseo-site.com'].includes(location.hostname)) return;
/** Keep technical error details; remove identity, payloads and URL parameters. */
function redact(value, key = '', depth = 0) {
  if (depth > 12) return '[Filtered]';
  if (/^(event_id|trace_id|span_id|parent_span_id)$/i.test(key)) return value;
  if (/password|secret|token|authorization|cookie|email|phone|address|api.?key/i.test(key)) return '[Filtered]';
  if (typeof value === 'string') {
    const text = /^(url|filename|abs_path|transaction)$/i.test(key) ? value.split(/[?#]/)[0] : value;
    return text
      .replace(/https?:\/\/[^\s"'<>]+/g, (url) => url.split(/[?#]/)[0])
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[Filtered]')
      .replace(/(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}/g, '[Filtered]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [Filtered]')
      .replace(/((?:password|token|secret|api_key)\s*[:=]\s*)[^\s,;]+/gi, '$1[Filtered]');
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, key, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redact(item, name, depth + 1)]));
  }
  return value;
}

function scrubEvent(event) {
  const clean = { ...event };
  delete clean.user;
  delete clean.breadcrumbs;
  delete clean.extra;
  delete clean.server_name;
  if (clean.request && typeof clean.request === 'object') {
    const request = clean.request;
    clean.request = { method: request.method, url: request.url };
  }
  return redact(clean);
}

  window.Sentry.init({
    dsn: 'https://ecd299187b2d47e4a5fc00882172b688@errors.propulseo-site.com/6',
    environment: 'production',
    sendDefaultPii: false,
    autoSessionTracking: false,
    integrations: (defaults) => defaults.filter((item) => item.name !== 'BrowserSession'),
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: scrubEvent,
  });
})();
