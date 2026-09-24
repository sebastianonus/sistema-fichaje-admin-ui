import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.ADMIN_AUDIT_URL || 'http://127.0.0.1:5173';
const outputDir = path.resolve('.artifacts/admin-audit');

async function readLocalEnv() {
  const source = await readFile('.env', 'utf8');
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function navigate(page, pageName, workerId = null) {
  await page.evaluate(({ nextPage, nextWorkerId }) => {
    const state = {
      onusApp: true,
      page: nextPage,
      workerId: nextWorkerId,
      incidentId: null,
    };
    window.history.pushState(state, '', window.location.href);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }, { nextPage: pageName, nextWorkerId: workerId });
  await page.waitForTimeout(350);
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  await waitForScreenData(page);
}

async function waitForScreenData(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Cargando...') && !document.querySelector('.animate-pulse'),
    null,
    { timeout: 60_000 },
  );
}

async function capture(page, name, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      body: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  if (overflow.body > 1 || overflow.main > 1) {
    throw new Error(`${name}: horizontal overflow detected (${JSON.stringify(overflow)})`);
  }
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
}

const env = await readLocalEnv();
const email = env.LOCAL_ADMIN_EMAIL;
const password = env.LOCAL_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error('LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD are required in .env');
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();

try {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (await page.locator('input[type="email"]').isVisible()) {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
  }
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  await waitForScreenData(page);

  const desktop = { width: 1600, height: 900 };
  const compact = { width: 1280, height: 800 };
  const mobile = { width: 390, height: 844 };
  const screens = ['dashboard', 'trabajadores', 'incidencias', 'exports', 'ajustes'];

  for (const screen of screens) {
    await navigate(page, screen);
    await capture(page, `${screen}-1600`, desktop);
    await capture(page, `${screen}-1280`, compact);
  }

  await navigate(page, 'trabajadores');
  const firstWorker = page.locator('tbody tr').first();
  let workerId = null;
  if (await firstWorker.count()) {
    await firstWorker.click();
    await page.locator('main h1').first().waitFor({ state: 'visible' });
    await waitForScreenData(page);
    workerId = await page.evaluate(() => window.history.state?.workerId ?? null);
    if (workerId) {
      await capture(page, 'worker-detail-1600', desktop);
      await capture(page, 'worker-detail-1280', compact);
    }
  }

  for (const screen of screens) {
    await navigate(page, screen);
    await capture(page, `${screen}-mobile`, mobile);
  }
  if (workerId) {
    await navigate(page, 'workerDetail', workerId);
    await capture(page, 'worker-detail-mobile', mobile);
  }
} finally {
  await browser.close();
}

console.log(`Admin visual audit completed: ${outputDir}`);
