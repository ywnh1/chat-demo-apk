/*
 * about-panel.js — the "About" tab the upstream demo does not have.
 *
 * Upstream renders its settings dialog with two tabs (General / Data) into a
 * plain `div[role=tablist]`. Rather than patch a minified bundle, this file
 * watches for that dialog and appends a third tab that opens a self-contained
 * panel. If upstream changes its markup the tab simply never appears; nothing
 * else breaks.
 *
 * Content: what this build is, who maintains it, and the licence of every
 * dependency actually shipped in the APK.
 */
(function () {
  'use strict';

  var MOUNTED_ATTR = 'data-chatdemo-about-tab';
  var PANEL_ID = 'chatdemo-about-panel';

  // Read once per open so a language switch in settings is reflected.
  function locale() {
    var stored = null;
    try { stored = localStorage.getItem('chat-demo:locale'); } catch (e) {}
    if (stored === 'en-US') return 'en-US';
    if (stored === 'zh-CN') return 'zh-CN';
    return (navigator.language || 'zh-CN').toLowerCase().indexOf('zh') === 0 ? 'zh-CN' : 'en-US';
  }

  var REPO = 'https://github.com/ywnh1/chat-demo-apk';

  var LICENCE_GROUPS = [
    {
      title: { zh: '本项目', en: 'This project' },
      items: [
        { name: 'chat-demo-apk', holder: 'ywnh1', licence: 'MIT', url: REPO }
      ]
    },
    {
      title: { zh: '上游 Demo', en: 'Upstream demo' },
      items: [
        { name: 'DeepSeek API 使用 demo v0.1.2', holder: 'DeepSeek', licence: 'MIT', url: 'https://github.com/deepseek-ai' }
      ]
    },
    {
      title: { zh: '原生外壳', en: 'Native shell' },
      items: [
        { name: '@capacitor/core · android · cli', holder: 'Ionic', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor' },
        { name: '@capacitor/app', holder: 'Ionic', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor-plugins' },
        { name: '@capacitor/browser', holder: 'Ionic', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor-plugins' },
        { name: '@capacitor/filesystem', holder: 'Ionic', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor-plugins' },
        { name: '@capacitor/share', holder: 'Ionic', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor-plugins' }
      ]
    },
    {
      title: { zh: '网页运行时', en: 'Web runtime' },
      items: [
        { name: 'React 18.3.1 · React DOM', holder: 'Meta', licence: 'MIT', url: 'https://github.com/facebook/react' },
        { name: 'zustand', holder: 'pmndrs', licence: 'MIT', url: 'https://github.com/pmndrs/zustand' },
        { name: 'KaTeX（含字体）', holder: 'Khan Academy', licence: 'MIT', url: 'https://github.com/KaTeX/KaTeX' },
        { name: 'Prism', holder: 'PrismJS', licence: 'MIT', url: 'https://github.com/PrismJS/prism' },
        { name: 'Mermaid（含 cytoscape / dagre / d3 / dayjs）', holder: 'Mermaid', licence: 'MIT', url: 'https://github.com/mermaid-js/mermaid' },
        { name: 'DOMPurify', holder: 'Cure53', licence: 'Apache-2.0 OR MPL-2.0', url: 'https://github.com/cure53/DOMPurify' }
      ]
    }
  ];

  var TEXT = {
    'zh-CN': {
      tab: '关于',
      title: '关于 ChatDemo',
      close: '关闭',
      intro: '将 DeepSeek 官方「API 使用 demo」打包为安卓应用的第三方构建。',
      disclaimer: '非官方项目，与 DeepSeek 及深度求索公司无隶属关系，不代表其立场。',
      labelAuthor: '维护者',
      labelVersion: '应用版本',
      labelDemo: '上游 Demo',
      labelRepo: '项目主页',
      licenceHeading: '开源许可',
      licenceNote: '本应用以 MIT 协议发布。下列组件随 APK 一同分发，各自保留其原始许可。完整文本见各项目仓库。',
      licenceColumn: '许可'
    },
    'en-US': {
      tab: 'About',
      title: 'About ChatDemo',
      close: 'Close',
      intro: "A third-party Android build of DeepSeek's official \"API usage demo\".",
      disclaimer: 'Unofficial project. Not affiliated with DeepSeek; no endorsement implied.',
      labelAuthor: 'Maintainer',
      labelVersion: 'App version',
      labelDemo: 'Upstream demo',
      labelRepo: 'Project page',
      licenceHeading: 'Licences',
      licenceNote: 'This app is released under MIT. The components below ship inside the APK and keep their own licences; full texts live in their repositories.',
      licenceColumn: 'Licence'
    }
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'style') node.setAttribute('style', attrs[k]);
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function appVersion() {
    var meta = document.querySelector('meta[name="application-version"]');
    return (meta && meta.getAttribute('content')) || '—';
  }

  function buildPanel() {
    var loc = locale();
    var t = TEXT[loc];

    var card = el('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t.title,
      style: [
        'position:fixed', 'inset:auto 0 0 0', 'margin:0 auto', 'max-width:560px',
        'max-height:82vh', 'overflow:auto', 'padding:20px 20px 28px',
        'border-radius:16px 16px 0 0',
        'background:var(--dsw-alias-bg-layer-3,#fff)',
        'color:var(--dsw-alias-label-primary,#1b1b1c)',
        'box-shadow:0 -8px 32px rgba(0,0,0,.18)',
        'font-size:14px', 'line-height:1.6', 'z-index:2147483646',
        'box-sizing:border-box', 'overscroll-behavior:contain'
      ].join(';')
    });

    var header = el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px'
    }, [
      el('div', { text: t.title, style: 'font-size:17px;font-weight:600' }),
      el('button', {
        type: 'button',
        'aria-label': t.close,
        text: '✕',
        style: 'border:0;background:transparent;color:inherit;font-size:18px;padding:6px 10px;cursor:pointer;border-radius:8px'
      })
    ]);
    header.lastChild.addEventListener('click', closePanel);

    card.appendChild(header);
    card.appendChild(el('p', {
      text: t.intro,
      style: 'margin:0 0 6px;color:var(--dsw-alias-label-secondary,#61666b)'
    }));
    card.appendChild(el('p', {
      text: t.disclaimer,
      style: 'margin:0 0 16px;color:var(--dsw-alias-label-secondary,#61666b);font-size:13px'
    }));

    [
      [t.labelAuthor, 'ywnh1'],
      [t.labelVersion, appVersion()],
      [t.labelDemo, 'v0.1.2 · MIT'],
      [t.labelRepo, REPO]
    ].forEach(function (row) {
      card.appendChild(el('div', {
        style: 'display:flex;gap:12px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12))'
      }, [
        el('span', { text: row[0], style: 'flex:0 0 96px;color:var(--dsw-alias-label-secondary,#61666b)' }),
        row[0] === t.labelRepo
          ? el('a', {
              href: row[1],
              target: '_blank',
              rel: 'noreferrer',
              text: row[1],
              style: 'color:var(--dsw-alias-brand-text,#4D6BFE);word-break:break-all'
            })
          : el('span', { text: row[1], style: 'word-break:break-word' })
      ]));
    });

    card.appendChild(el('h3', {
      text: t.licenceHeading,
      style: 'margin:22px 0 6px;font-size:15px;font-weight:600'
    }));
    card.appendChild(el('p', {
      text: t.licenceNote,
      style: 'margin:0 0 14px;color:var(--dsw-alias-label-secondary,#61666b);font-size:13px'
    }));

    LICENCE_GROUPS.forEach(function (group) {
      card.appendChild(el('div', {
        text: group.title[loc],
        style: 'margin:14px 0 6px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-tertiary,#81858c);text-transform:uppercase;letter-spacing:.03em'
      }));
      group.items.forEach(function (item) {
        card.appendChild(el('div', {
          style: 'display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1))'
        }, [
          el('span', { text: item.licence, style: 'flex:0 0 84px;font-size:12px;color:var(--dsw-alias-label-tertiary,#81858c)' }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('a', {
              href: item.url,
              target: '_blank',
              rel: 'noreferrer',
              text: item.name,
              style: 'color:inherit;text-decoration:none;word-break:break-word'
            }),
            el('div', { text: '© ' + item.holder, style: 'font-size:12px;color:var(--dsw-alias-label-secondary,#61666b)' })
          ])
        ]));
      });
    });

    var backdrop = el('div', {
      style: 'position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:2147483645'
    }, [card]);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closePanel();
    });

    return backdrop;
  }

  var openEl = null;

  function closePanel() {
    if (openEl && openEl.parentNode) openEl.parentNode.removeChild(openEl);
    openEl = null;
  }

  function openPanel() {
    closePanel();
    openEl = buildPanel();
    document.body.appendChild(openEl);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openEl) {
      e.stopPropagation();
      closePanel();
    }
  });

  // -- mount the tab -------------------------------------------------------
  function tabLabel() {
    var t = TEXT[locale()];
    return t.tab;
  }

  function tryMount() {
    if (document.querySelector('[' + MOUNTED_ATTR + ']')) return;

    var lists = document.querySelectorAll('div[role="tablist"]');
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var tabs = list.querySelectorAll('button[role="tab"]');
      if (tabs.length < 2) continue;

      // Only the settings dialog has these two labels; a future dialog with a
      // different shape is left alone.
      var joined = Array.prototype.map.call(tabs, function (b) { return b.textContent || ''; }).join('|');
      if (!/通用设置|General/.test(joined) || !/数据管理|Data/.test(joined)) continue;

      var template = tabs[0];
      var tab = template.cloneNode(true);
      tab.setAttribute(MOUNTED_ATTR, '1');
      tab.setAttribute('aria-selected', 'false');
      tab.removeAttribute('id');

      // Replace only text nodes so the cloned icon survives; drop any nested
      // label markup upstream may add later.
      var replaced = false;
      Array.prototype.forEach.call(tab.querySelectorAll('*'), function (node) {
        if (!replaced && node.children.length === 0 && (node.textContent || '').trim()) {
          node.textContent = tabLabel();
          replaced = true;
        }
      });
      if (!replaced) tab.textContent = tabLabel();

      tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPanel();
      }, true);

      list.appendChild(tab);
      return;
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(function () {
      scheduled = false;
      try { tryMount(); } catch (e) { /* never break the host app */ }
    }, 16);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
