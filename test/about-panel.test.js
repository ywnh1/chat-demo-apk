/*
 * Self-check for about-panel.js. Run with: node test/about-panel.test.js
 *
 * Uses jsdom to reproduce the piece of the upstream settings dialog that
 * about-panel.js hooks into, then asserts the tab mounts, the panel opens,
 * links point where they should, and Escape closes it.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'about-panel.js'), 'utf8');

function makeDom(locale) {
  const dom = new JSDOM(
    `<!doctype html><html lang="zh-CN"><head>
       <meta name="application-version" content="0.1.2">
     </head><body>
       <div id="settings">
         <div role="tablist">
           <button type="button" role="tab" aria-selected="true"><span class="icon"></span><span>通用设置</span></button>
           <button type="button" role="tab" aria-selected="false"><span class="icon"></span><span>数据管理</span></button>
         </div>
         <div role="tabpanel"></div>
       </div>
     </body></html>`,
    { url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  if (locale) {
    dom.window.localStorage.setItem('chat-demo:locale', locale);
  }
  return dom;
}

function run(dom) {
  // jsdom has no requestAnimationFrame scheduling quirks here; pretendToBeVisual gives us one.
  dom.window.eval(source);
  // Let the MutationObserver microtask + rAF flush.
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return new Promise((resolve) => setTimeout(() => resolve(dom), 60));
}

(async () => {
  let dom = makeDom('zh-CN');
  await run(dom);
  let doc = dom.window.document;

  const tabs = doc.querySelectorAll('div[role="tablist"] button[role="tab"]');
  assert.strictEqual(tabs.length, 3, `期望 3 个 tab，实际 ${tabs.length}`);
  const aboutTab = doc.querySelector('[data-chatdemo-about-tab]');
  assert.ok(aboutTab, '关于 tab 未挂载');
  assert.strictEqual(aboutTab.textContent.trim(), '关于', `tab 文案错误: ${aboutTab.textContent}`);
  assert.strictEqual(aboutTab.getAttribute('aria-selected'), 'false', '关于 tab 不应默认选中');
  console.log('✓ 中文：关于 tab 已注入，文案正确');

  // Panel opens on click.
  aboutTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const panel = doc.querySelector('#chatdemo-about-panel, div[role="dialog"][aria-modal="true"]');
  assert.ok(panel, '点击后未打开关于面板');
  assert.ok(panel.textContent.includes('关于 ChatDemo'), '面板标题缺失');
  assert.ok(panel.textContent.includes('ywnh1'), '面板缺少维护者');
  assert.ok(panel.textContent.includes('0.1.2'), '面板缺少版本号');
  assert.ok(panel.textContent.includes('MIT'), '面板缺少许可信息');
  console.log('✓ 中文：面板打开，含标题/维护者/版本/许可');

  // Every licence entry links somewhere absolute.
  const links = [...panel.querySelectorAll('a[href]')];
  assert.ok(links.length >= 10, `许可链接过少: ${links.length}`);
  for (const a of links) {
    assert.ok(/^https:\/\//.test(a.getAttribute('href')), `非绝对链接: ${a.getAttribute('href')}`);
  }
  assert.ok(links.some((a) => a.getAttribute('href').includes('github.com/ywnh1/chat-demo-apk')), '缺少项目主页链接');
  console.log(`✓ 中文：${links.length} 个链接全部为绝对 https 地址`);

  // Escape closes.
  doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(doc.querySelectorAll('div[role="dialog"][aria-modal="true"]').length, 0, 'Escape 未关闭面板');
  console.log('✓ 中文：Escape 关闭面板');

  // Re-mount is idempotent: no duplicate tab after another mutation.
  doc.body.appendChild(doc.createElement('div'));
  await new Promise((r) => setTimeout(r, 60));
  assert.strictEqual(doc.querySelectorAll('[data-chatdemo-about-tab]').length, 1, '重复注入');
  console.log('✓ 中文：重复触发不会注入第二个 tab');

  // English locale.
  dom = makeDom('en-US');
  await run(dom);
  doc = dom.window.document;
  const enTab = doc.querySelector('[data-chatdemo-about-tab]');
  assert.strictEqual(enTab.textContent.trim(), 'About', `英文 tab 文案错误: ${enTab.textContent}`);
  enTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const enPanel = doc.querySelector('div[role="dialog"][aria-modal="true"]');
  assert.ok(enPanel.textContent.includes('About ChatDemo'), '英文标题缺失');
  assert.ok(enPanel.textContent.includes('Unofficial project'), '英文免责声明缺失');
  console.log('✓ 英文：tab 文案与面板内容正确');

  // A dialog that is not the settings panel must be left alone.
  const other = new JSDOM(
    '<!doctype html><html><body><div role="tablist"><button role="tab">A</button><button role="tab">B</button></div></body></html>',
    { url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  await run(other);
  assert.strictEqual(
    other.window.document.querySelectorAll('[data-chatdemo-about-tab]').length,
    0,
    '误挂到无关弹窗'
  );
  console.log('✓ 不相关弹窗不受影响');

  console.log('\n全部通过');
})().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
