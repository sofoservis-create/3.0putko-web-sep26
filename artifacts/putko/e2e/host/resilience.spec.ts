import { expect, test } from '@playwright/test';
import {
  completeListingData,
  createHostAccount,
  createListingViaApi,
  editorUrl,
  expectSaved,
  failNextRequests,
  field,
  getListingViaApi,
  gotoHost,
  injectSession,
} from './helpers';

/**
 * Network failure during every Host mutation must leave a recoverable state:
 * the entered data stays on screen, a retry is offered, no duplicate is
 * created, and the retry succeeds once the network is back.
 */

test.describe('Host resilience', () => {
  test('editor autosave: failed save keeps the text, Retry saves it once', async ({ page, request }) => {
    const host = await createHostAccount(request, 'save-fail');
    const listing = await createListingViaApi(request, host, { name: 'Pred výpadkom' });
    await injectSession(page, host);

    await page.goto(editorUrl(listing.id, 'basics'));
    await expect(field(page, 'name')).toHaveValue('Pred výpadkom');

    const restore = await failNextRequests(page, /\/api\/test-auth\/host-accommodations\/[0-9a-f-]+$/, 1, 'PATCH');
    await field(page, 'name').fill('Po výpadku');
    const retry = page.getByRole('button', { name: /^retry$/i });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(field(page, 'name')).toHaveValue('Po výpadku');
    await restore();

    await retry.click();
    await expectSaved(page);
    const saved = await getListingViaApi(request, host, listing.id);
    expect(saved.data.name).toBe('Po výpadku');

    // Still exactly one listing for this host — a failed save never forks a draft.
    const all = await request.get('/api/test-auth/host-accommodations', { headers: { Authorization: `Bearer ${host.token}` } });
    expect(((await all.json()) as { accommodations: unknown[] }).accommodations.length).toBe(1);
  });

  test('creating a draft: failed create keeps the form on /new and creates one draft on retry', async ({ page, request }) => {
    const host = await createHostAccount(request, 'create-fail');
    await injectSession(page, host);

    await page.goto('/host/listings/new');
    const restore = await failNextRequests(page, /\/api\/test-auth\/host-accommodations$/, 1, 'POST');
    await field(page, 'name').fill('Nový koncept');
    const retry = page.getByRole('button', { name: /^retry$/i });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/host\/listings\/new/);
    await restore();

    await retry.click();
    await expectSaved(page);
    await expect(page).toHaveURL(/\/host\/listings\/[0-9a-f-]{36}/);
    const all = await request.get('/api/test-auth/host-accommodations', { headers: { Authorization: `Bearer ${host.token}` } });
    const { accommodations: listings } = (await all.json()) as { accommodations: Array<{ data: { name?: string } }> };
    expect(listings.length).toBe(1);
    expect(listings[0].data.name).toBe('Nový koncept');
  });

  test('publish: failed publish keeps the review open and the listing a draft; retry publishes', async ({ page, request }) => {
    const host = await createHostAccount(request, 'publish-fail');
    const listing = await createListingViaApi(request, host, { ...completeListingData('Zverejnenie po výpadku'), lastVisitedStep: 'readiness' });
    await injectSession(page, host);

    await page.goto(editorUrl(listing.id, 'readiness'));
    await page.getByRole('button', { name: /^review$/i }).click();
    const dialog = page.getByRole('dialog', { name: /publish review/i });
    const publish = dialog.getByRole('button', { name: /^publish listing$/i });
    await expect(publish).toBeEnabled({ timeout: 20_000 });

    const restore = await failNextRequests(page, /\/publish$/, 1, 'POST');
    await publish.click();
    await expect(page.getByText(/failed to publish/i)).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toBeVisible();
    expect((await getListingViaApi(request, host, listing.id)).status).not.toBe('LIVE');
    await restore();

    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    expect((await getListingViaApi(request, host, listing.id)).status).toBe('LIVE');
  });

  test('delete: failed delete keeps the listing and offers Try again', async ({ page, request }) => {
    const host = await createHostAccount(request, 'delete-fail');
    await createListingViaApi(request, host, { name: 'Na vymazanie' });
    await injectSession(page, host);

    await gotoHost(page, '/host/listings');
    await page.getByRole('button', { name: /^delete na vymazanie$/i }).click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).filter({ hasText: /delete this listing\?/i }).first();
    await expect(dialog).toBeVisible();

    const restore = await failNextRequests(page, /\/api\/test-auth\/host-accommodations\/[0-9a-f-]+$/, 1, 'DELETE');
    await dialog.getByRole('button', { name: /^delete listing$/i }).click();
    const tryAgain = dialog.getByRole('button', { name: /try again/i });
    await expect(tryAgain).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('article', { name: 'Na vymazanie' })).toBeVisible();
    await restore();

    await tryAgain.click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByRole('article', { name: 'Na vymazanie' })).toHaveCount(0);
  });

  test('calendar: failed block shows an error, keeps the selection, and succeeds on retry', async ({ page, request }) => {
    const host = await createHostAccount(request, 'block-fail');
    const listing = await createListingViaApi(request, host, completeListingData('Kalendár po výpadku'));
    await injectSession(page, host);

    await page.goto(`/host/listings/${listing.id}/calendar`);
    await page.getByRole('button', { name: /^next month/i }).click();
    const openDays = page.getByRole('button', { name: /^\d{4}-\d{2}-\d{2} · available/ });
    await expect(openDays.first()).toBeVisible();
    const iso = ((await openDays.nth(3).getAttribute('aria-label')) ?? '').slice(0, 10);
    await openDays.nth(3).click();
    await openDays.nth(3).click();

    const restore = await failNextRequests(page, /\/calendar\/blocks$/, 1, 'POST');
    const block = page.getByRole('button', { name: /^block$/i });
    await block.click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
    await expect(block).toBeVisible();
    await restore();

    await block.click();
    await expect(page.getByRole('button', { name: new RegExp(`^${iso} · blocked`) })).toBeVisible({ timeout: 20_000 });
  });

  test('reservations: failed accept keeps the dialog open with Try again; accept succeeds once', async ({ page, request }) => {
    const host = await createHostAccount(request, 'accept-fail');
    const listing = await createListingViaApi(request, host, completeListingData('Rezervácie po výpadku'));
    const fixtures = await request.post('/api/test-auth/host-reservations/fixtures', {
      headers: { Authorization: `Bearer ${host.token}` },
      data: { accommodationId: listing.id },
    });
    expect(fixtures.ok(), await fixtures.text()).toBeTruthy();
    const countUpcoming = async () => {
      const list = await request.get('/api/test-auth/host-reservations', { headers: { Authorization: `Bearer ${host.token}` } });
      const { reservations } = (await list.json()) as { reservations: Array<{ stage: string }> };
      return reservations.filter((r) => r.stage === 'upcoming').length;
    };
    const upcomingBefore = await countUpcoming();
    await injectSession(page, host);

    await gotoHost(page, '/host/reservations');
    await page.locator('a[href^="/host/reservations/"]').first().click();
    await page.getByRole('button', { name: /^accept$/i }).click();
    const dialog = page.getByRole('alertdialog', { name: /accept this request/i });

    const restore = await failNextRequests(page, /\/host-reservations\/[0-9a-f-]+\/accept$/, 1, 'POST');
    await dialog.getByRole('button', { name: /^accept request$/i }).click();
    const tryAgain = dialog.getByRole('button', { name: /try again/i });
    await expect(tryAgain).toBeVisible({ timeout: 20_000 });
    await restore();

    await tryAgain.click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /^accept$/i })).toHaveCount(0);

    // Exactly one request moved to upcoming — the failed attempt did not double-accept.
    expect(await countUpcoming()).toBe(upcomingBefore + 1);
  });

  test('messages: failed send shows Not sent + Retry, and the retry does not duplicate', async ({ page, request }) => {
    const host = await createHostAccount(request, 'send-fail');
    const listing = await createListingViaApi(request, host, completeListingData('Správy po výpadku'));
    const fixtures = await request.post('/api/test-auth/host-conversations/fixtures', {
      headers: { Authorization: `Bearer ${host.token}` },
      data: { accommodationId: listing.id },
    });
    expect(fixtures.ok(), await fixtures.text()).toBeTruthy();
    await injectSession(page, host);

    await gotoHost(page, '/host/messages');
    await page.locator('a[href^="/host/messages/"]').first().click();
    await expect(page).toHaveURL(/\/host\/messages\/[0-9a-f-]{36}/);
    const composer = page.getByPlaceholder(/^message /i);
    await expect(composer).toBeVisible();

    const restore = await failNextRequests(page, /\/host-conversations\/[0-9a-f-]+\/messages$/, 1, 'POST');
    await composer.fill('Dobrý deň, pes je vítaný.');
    await page.getByRole('button', { name: /^send$/i }).click();
    const retry = page.getByRole('button', { name: /^retry$/i });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/not sent/i).first()).toBeVisible();
    await restore();

    await retry.click();
    await expect(retry).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText('Dobrý deň, pes je vítaný.')).toHaveCount(1);
  });

  test('profile: failed save keeps the values and Retry save succeeds', async ({ page, request }) => {
    const host = await createHostAccount(request, 'profile-fail');
    await injectSession(page, host);

    await gotoHost(page, '/host/profile');
    const name = page.locator('input[name="displayName"]');
    await name.fill('Eva po výpadku');
    const restore = await failNextRequests(page, /\/host-profile$/, 1, 'PUT');
    await page.getByRole('button', { name: /^save profile$/i }).click();
    const retry = page.getByRole('button', { name: /retry save/i });
    await expect(retry).toBeVisible({ timeout: 20_000 });
    await expect(name).toHaveValue('Eva po výpadku');
    await restore();

    await retry.click();
    await expect(page.getByRole('status').filter({ hasText: /\bSaved\b/ }).first()).toBeVisible({ timeout: 20_000 });
    const profile = await request.get('/api/test-auth/host-profile', { headers: { Authorization: `Bearer ${host.token}` } });
    expect(((await profile.json()) as { profile: { displayName?: string } }).profile.displayName).toBe('Eva po výpadku');
  });

  test('expired session: a 401 signs the host out and returns to login with returnTo', async ({ page, request }) => {
    const host = await createHostAccount(request, 'expired');
    await injectSession(page, { ...host, token: 'test_session_expired_token' });

    await page.goto('/host/listings');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fhost%2Flistings/, { timeout: 20_000 });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
});
