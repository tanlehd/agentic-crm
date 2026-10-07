// Standalone prototype verification only. No CRM/backend connection.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('docs/ux/mockups/previews');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [], requests = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
const check = (condition, label) => { if (!condition) throw new Error(label); results.push(`PASS ${label}`); };
try {
  await page.goto(pathToFileURL(resolve('docs/ux/mockups/inbox.html')).href);
  await page.screenshot({ path: resolve(output, 'inbox-desktop.png') });
  for (const [width, height] of [[1440,900],[1280,800],[1024,768],[768,1024],[390,844],[320,844]]) {
    await page.setViewportSize({ width, height });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}x${height}`);
    if (width < 768) {
      await page.locator('[data-person="1"]').click();
      check(await page.locator('#draft').isVisible(), `composer visible at ${width}px`);
      if (width === 390) await page.screenshot({ path: resolve(output, 'inbox-mobile-detail.png') });
      await page.locator('[data-action="back"]').click();
      if (width === 390) await page.screenshot({ path: resolve(output, 'inbox-mobile-list.png') });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#draft').fill('Bản nháp trả lời synthetic');
  await page.locator('[data-mode="note"]').click();
  check(await page.locator('#draft').inputValue() === '', 'reply and note drafts separate');
  await page.locator('#draft').fill('Ghi chú synthetic');
  await page.locator('[data-mode="reply"]').click();
  check(await page.locator('#draft').inputValue() === 'Bản nháp trả lời synthetic', 'reply draft restored');
  await page.locator('[data-person="2"]').click();
  check(await page.locator('#send').isDisabled(), 'AI owned reply disabled');
  await page.locator('[data-mode="note"]').click();
  await page.locator('#draft').fill('Note synthetic cho AI owner');
  check(await page.locator('#send').isEnabled(), 'note independent from reply ownership');
  await page.locator('[data-person="1"]').click();
  check(await page.locator('#draft').inputValue() === 'Bản nháp trả lời synthetic', 'conversation draft isolated');
  await page.locator('#send').click();
  check((await page.locator('#timeline').innerText()).includes('Xếp hàng · chỉ mô phỏng'), 'send simulation remains queued');
  await page.locator('#local-search').fill('Bảo');
  check(await page.locator('#cards .card').count() === 1, 'synthetic name prefix filter');
  await page.locator('#local-search').fill('missing');
  check((await page.locator('#cards').innerText()).includes('Không có hội thoại phù hợp'), 'no matches state');
  await page.locator('#local-search').fill('');
  check(await page.locator('[role="tablist"]').count() === 0, 'no work tab bar');
  check(await page.locator('#main').evaluate(el => el.getBoundingClientRect().top === 56), 'main starts directly below 56px header');
  await page.locator('[data-action="open-contact"]').click();
  check(await page.locator('#object-name').isVisible(), 'contact opens dialog over Inbox');
  await page.locator('#dialog-close').click();
  check(await page.locator('#draft').isVisible(), 'closing contact returns to Inbox');
  for (const state of ['loading','empty','error','forbidden','owner','unknown','closed']) {
    await page.locator('#state').selectOption(state);
    check(await page.locator('#send').isDisabled(), `${state} blocks send`);
    if (state === 'forbidden') check(!(await page.locator('#detail').innerText()).includes('linhkhoi@example.test'), 'forbidden clears contact field');
    if (state === 'owner') await page.locator('#toast').evaluate(el => { el.hidden = true; });
    if (state === 'owner') await page.screenshot({ path: resolve(output, 'inbox-owner-conflict.png') });
  }
  await page.locator('#state').selectOption('default');
  await page.locator('[data-action="search"]').click();
  await page.keyboard.press('Escape');
  check(await page.locator('[data-action="search"]').evaluate(el => document.activeElement === el), 'dialog returns focus');
  check(errors.length === 0, 'no browser JavaScript errors');
  check(requests.length === 0, 'no external network requests');
  await writeFile(resolve(output, 'review.txt'), `UX-004 prototype review, 2026-10-07\nNode ${process.version}; Chromium ${browser.version()}; headless Windows Chrome\n${results.join('\n')}\nNOT_RUN: real CRM APIs, user usability sessions, full screen reader/AA audit, physical mobile keyboard, browser UI zoom. 320px CSS reflow checked separately.\n`);
  console.log(results.join('\n'));
} finally { await browser.close(); }
