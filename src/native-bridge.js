/*
 * native-bridge.js — Android shell glue for the official DeepSeek chat demo.
 *
 * The web bundle in static/ is upstream, unmodified. This file is the only
 * addition and it does four things a plain browser page never needs:
 *
 *   1. Android back button: closes an overlay (via Escape) or asks twice to exit.
 *   2. window.open / <a target=_blank>: external URLs leave the app instead of
 *      replacing the WebView, which would strand the user with no way back.
 *   3. <a download> (history export): WebView ignores it, so the blob is written
 *      to the cache dir and handed to the system share sheet.
 *   4. Nothing else. No analytics, no network calls, no DOM rewriting.
 *
 * Loaded by index.html after the app bundle. Safe to run in a browser: it exits
 * immediately unless Capacitor reports a native platform.
 */
(function () {
  'use strict';

  var cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

  var INTERNAL_URL = /^(https?:\/\/(localhost|127\.0\.0\.1)|capacitor:|file:|blob:|data:|about:)/i;
  var EXIT_WINDOW_MS = 2000;
  var lastBackAt = 0;
  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:64px', 'transform:translateX(-50%)',
        'max-width:80vw', 'padding:10px 16px', 'border-radius:10px',
        'background:rgba(27,27,28,.92)', 'color:#fff', 'font-size:14px',
        'line-height:20px', 'z-index:2147483647', 'pointer-events:none',
        'transition:opacity .2s ease', 'opacity:0', 'word-break:break-word'
      ].join(';');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 1800);
  }

  function pluginsReady(cb, attempt) {
    var n = attempt || 0;
    var p = window.Capacitor && window.Capacitor.Plugins;
    if (p && p.App) {
      cb(p);
      return;
    }
    if (n > 120) return; // ~6s, then give up quietly
    setTimeout(function () { pluginsReady(cb, n + 1); }, 50);
  }

  // -- 1. back button ------------------------------------------------------
  function hasOpenOverlay() {
    return !!document.querySelector('[role="dialog"], [role="menu"], [data-state="open"][data-radix-popper-content-wrapper], [aria-modal="true"]');
  }

  function bindBack(plugins) {
    plugins.App.addListener('backButton', function () {
      // Give the app a chance to close a dialog/drawer first.
      if (hasOpenOverlay()) {
        var ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
        document.dispatchEvent(ev);
        return;
      }
      var now = Date.now();
      if (now - lastBackAt < EXIT_WINDOW_MS) {
        plugins.App.exitApp();
        return;
      }
      lastBackAt = now;
      toast('再按一次退出');
    });
  }

  // -- 2. external links ---------------------------------------------------
  var originalOpen = window.open;

  function openExternal(url) {
    var Browser = window.Capacitor.Plugins.Browser;
    if (Browser && Browser.open) {
      Browser.open({ url: url });
      return;
    }
    if (originalOpen) originalOpen.call(window, url, '_system');
  }

  window.open = function (url, target, features) {
    if (typeof url === 'string' && /^https?:/i.test(url) && !INTERNAL_URL.test(url)) {
      openExternal(url);
      return null;
    }
    return originalOpen.apply(window, arguments);
  };

  // -- 3. downloads --------------------------------------------------------
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : '');
      };
      reader.onerror = function () { reject(reader.error || new Error('read failed')); };
      reader.readAsDataURL(blob);
    });
  }

  function safeName(name) {
    return String(name || 'download')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120) || 'download';
  }

  function exportViaShare(plugins, href, fileName) {
    var name = safeName(fileName);
    var path = 'export/' + name;
    return fetch(href)
      .then(function (res) { return res.blob(); })
      .then(blobToBase64)
      .then(function (base64) {
        return plugins.Filesystem.writeFile({
          path: path,
          data: base64,
          directory: 'CACHE',
          recursive: true
        });
      })
      .then(function (written) {
        var uri = (written && written.uri) || '';
        if (uri.indexOf('file:') === 0) return uri;
        // Some Android paths resolve to content:// which the Share plugin rejects;
        // ask Filesystem for an explicit URI before giving up.
        return plugins.Filesystem.getUri({ path: path, directory: 'CACHE' })
          .then(function (r) { return (r && r.uri) || uri; });
      })
      .then(function (uri) {
        if (!plugins.Share || !/^file:/i.test(uri)) {
          toast('已保存到应用缓存：' + name);
          return null;
        }
        return plugins.Share.share({ files: [uri], title: name, dialogTitle: '保存或分享' });
      })
      .catch(function (err) {
        toast('导出失败：' + ((err && err.message) || err));
      });
  }

  function onClickCapture(e) {
    var target = e.target;
    var a = target && target.closest ? target.closest('a[href]') : null;
    if (!a) return;

    var plugins = window.Capacitor.Plugins;

    if (a.hasAttribute('download')) {
      e.preventDefault();
      e.stopPropagation();
      if (plugins.Filesystem && plugins.Share) {
        exportViaShare(plugins, a.href, a.getAttribute('download') || 'deepseek_data.zip');
      } else {
        toast('当前环境不支持导出');
      }
      return;
    }

    if (!plugins.Browser || !plugins.Browser.open) return;
    var href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href) || INTERNAL_URL.test(href)) return;
    e.preventDefault();
    e.stopPropagation();
    openExternal(a.href);
  }

  pluginsReady(function (plugins) {
    bindBack(plugins);
    document.addEventListener('click', onClickCapture, true);
  });
})();
