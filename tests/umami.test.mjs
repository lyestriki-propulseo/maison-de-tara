import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../wandau-mdt/js/umami.js', import.meta.url), 'utf8');
function boot(hostname = 'maisondetara.propulseo-site.com') {
  const scripts = [];
  const window = {
    location: { hostname, origin: 'https://' + hostname, pathname: '/' },
    localStorage: { getItem: () => 'accepted' },
  };
  const document = {
    getElementById: (id) => scripts.find((s) => s.id === id),
    createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
    head: { appendChild: (script) => scripts.push(script) },
  };
  const context = { window, document, URL };
  runInNewContext(source, context);
  return { window, scripts, context };
}
const payload = {
  website: '7060ebcb-aec0-49dd-b1f5-4dc2b642719e',
  url: '/?token=secret#secret',
  referrer: 'https://search.example/private/secret?q=secret',
  screen: '1920x1080',
  language: 'fr',
  title: 'secret',
  data: { email: 'secret' },
};

test('loads once on each production hostname, with DNT and a filter installed first', () => {
  for (const hostname of 'maisondetara.propulseo-site.com,maisondetara.com,www.maisondetara.com'.split(',')) {
    const { window, scripts, context } = boot(hostname);
    runInNewContext(source, context);
    assert.equal(scripts.length, 1);
    assert.equal(typeof window.umamiBeforeSend, 'function');
    assert.equal(scripts[0].attrs['data-website-id'], payload.website);
    assert.equal(scripts[0].attrs['data-do-not-track'], 'true');
    assert.equal(scripts[0].attrs['data-before-send'], 'umamiBeforeSend');
  }
  assert.equal(boot('preview.vercel.app').scripts.length, 0);
  assert.equal(boot('localhost').scripts.length, 0);
});
test('tracks public navigations and strips URL secrets, referrer paths and custom data', () => {
  const { window } = boot();
  for (const path of ["/","/atelier.html","/contact.html"]) {
    window.location.pathname = path;
    const result = window.umamiBeforeSend('event', { ...payload, url: path + '?token=secret#secret' });
    assert.equal(result.url, path);
    assert.equal(result.referrer, 'https://search.example');
    assert.equal(JSON.stringify(result).includes('secret'), false);
    assert.equal('data' in result, false);
  }
});
test('blocks private routes after a public page, stale private URLs and arbitrary events', () => {
  const { window } = boot();
  for (const path of ["/admin","/404.html","/_src/index.html","/reservation/secret"]) {
    window.location.pathname = path;
    assert.equal(window.umamiBeforeSend('event', payload), false);
    window.location.pathname = '/';
    assert.equal(window.umamiBeforeSend('event', { ...payload, url: path }), false);
  }
  assert.equal(window.umamiBeforeSend('identify', payload), false);
  assert.equal(window.umamiBeforeSend('event', { ...payload, name: 'custom' }), false);
  assert.equal(window.umamiBeforeSend('event', { ...payload, url: 'https://evil.test/' }), false);
});
