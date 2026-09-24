import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.WORKER_AUDIT_URL || 'http://127.0.0.1:5173/worker';
const email = process.env.LOCAL_WORKER_EMAIL;
const password = process.env.LOCAL_WORKER_PASSWORD;
const useFixture = process.env.WORKER_AUDIT_FIXTURE === 'true';
const outputDir = path.resolve('.artifacts/worker-audit');
const technicalEventPattern = /\b(?:CLOCK_IN|CLOCK_OUT|BREAK_START|BREAK_END)\b/;
const expectedEventLabels = ['Entrada', 'Inicio pausa', 'Final pausa', 'Salida'];

if (!useFixture && (!email || !password)) {
  throw new Error('LOCAL_WORKER_EMAIL and LOCAL_WORKER_PASSWORD are required');
}

const fixtureUserId = '11111111-1111-4111-8111-111111111111';

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function installWorkerFixture(context) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const token = `${encodeJwtPart({ alg: 'HS256', typ: 'JWT' })}.${encodeJwtPart({
    aud: 'authenticated',
    exp: nowSeconds + 3600,
    role: 'authenticated',
    sub: fixtureUserId,
  })}.fixture-signature`;
  const user = {
    id: fixtureUserId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'trabajador.auditoria@onusexpress.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: token,
    refresh_token: 'fixture-refresh-token',
    expires_in: 3600,
    expires_at: nowSeconds + 3600,
    token_type: 'bearer',
    user,
  };

  await context.addInitScript((fixtureSession) => {
    window.localStorage.setItem('onus-auth-worker', JSON.stringify(fixtureSession));
  }, session);

  await context.route('**/auth/v1/user', (route) => route.fulfill({ json: user }));
  await context.route('**/rest/v1/profiles*', (route) => route.fulfill({
    json: {
      id: fixtureUserId,
      full_name: 'Trabajador de auditoria',
      role: 'worker',
      is_active: true,
      password_reset_required: false,
      password_reset_deadline: null,
      password_changed_at: new Date().toISOString(),
    },
  }));
  await context.route('**/rest/v1/time_events*', (route) => route.fulfill({
    json: [
      { id: '4', event_type: 'CLOCK_OUT', happened_at: '2026-09-23T16:30:00+02:00' },
      { id: '3', event_type: 'BREAK_END', happened_at: '2026-09-23T13:30:00+02:00' },
      { id: '2', event_type: 'BREAK_START', happened_at: '2026-09-23T13:00:00+02:00' },
      { id: '1', event_type: 'CLOCK_IN', happened_at: '2026-09-23T08:30:00+02:00' },
    ],
  }));
  await context.route('**/functions/v1/worker-terms*', (route) => route.fulfill({
    json: {
      ok: true,
      data: {
        accepted: true,
        acceptance: {
          id: 'fixture-acceptance',
          version: 'v1.1-2026-03-05',
          accepted_at: new Date().toISOString(),
        },
      },
    },
  }));
}

async function capture(page, name, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(200);

  const result = await page.evaluate((technicalPattern) => {
    const text = document.body.innerText;
    return {
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hasTechnicalEventLabel: new RegExp(technicalPattern).test(text),
      text,
    };
  }, technicalEventPattern.source);

  if (result.bodyOverflow > 1) {
    throw new Error(`${name}: horizontal overflow detected (${result.bodyOverflow}px)`);
  }
  if (result.hasTechnicalEventLabel) {
    throw new Error(`${name}: backend event label exposed to the worker`);
  }
  for (const label of expectedEventLabels) {
    if (!result.text.includes(label)) {
      throw new Error(`${name}: missing worker-facing event label: ${label}`);
    }
  }

  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
if (useFixture) await installWorkerFixture(context);
const page = await context.newPage();

try {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (!useFixture && await page.locator('input[type="email"]').isVisible()) {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
  }

  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Portal trabajador') ||
      Boolean(document.querySelector('form p.text-\\[\\#dc2626\\]')),
    null,
    { timeout: 30_000 },
  );

  const portalHeading = page.getByRole('heading', { name: 'Portal trabajador' });
  if (!(await portalHeading.isVisible())) {
    await page.screenshot({ path: path.join(outputDir, 'worker-login-failure.png') });
    const loginError = await page.locator('form p').last().textContent();
    throw new Error(`Worker login failed: ${loginError?.trim() || 'unknown error'}`);
  }

  await page.waitForFunction(
    () => !document.body.innerText.includes('Cargando...'),
    null,
    { timeout: 30_000 },
  );

  await capture(page, 'worker-1280', { width: 1280, height: 800 });
  await capture(page, 'worker-mobile', { width: 390, height: 844 });
} finally {
  await browser.close();
}

console.log(`Worker visual audit completed: ${outputDir}`);
