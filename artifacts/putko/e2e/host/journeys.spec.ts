import { expect, test } from '@playwright/test';
import {
  completeListingData,
  createHostAccount,
  createListingViaApi,
  editorUrl,
  expectSaved,
  expectStep,
  field,
  forceLanguage,
  getListingViaApi,
  gotoHost,
  hostNavLink,
  injectSession,
  loginViaApi,
  patchListingViaApi,
  registerVerifiedTraveler,
} from './helpers';

/**
 * Host Phase 8 verification matrix — the critical journeys, run at 390px,
 * 768px and 1280px (see playwright.config.ts projects).
 */

test.describe('Host journeys', () => {
  test('new traveler → log in → activate host → first draft is created', async ({ page, request }) => {
    const credentials = await registerVerifiedTraveler(request, 'new');
    await forceLanguage(page, 'en');

    await page.goto('/login');
    await page.locator('#email').fill(credentials.email);
    await page.locator('#password').fill(credentials.password);
    await page.getByRole('button', { name: /^(log in|login)$/i }).click();
    await expect(page).toHaveURL(/\/account/);

    // Traveler account offers host activation (development accounts only).
    const activate = page.getByRole('button', { name: /activate host mode|activate or switch host mode/i }).first();
    await activate.click();
    await page.getByRole('dialog').getByRole('button', { name: /^activate host mode$/i }).click();

    // Activation lands in the first-listing editor.
    await expect(page).toHaveURL(/\/host\/listings\/new/, { timeout: 30_000 });
    await expectStep(page, 1);

    await field(page, 'name').fill('Chata pod lesom');
    await field(page, 'propertyType').selectOption('cabin');
    await field(page, 'description').fill('Small cabin, big forest.');
    await page.getByRole('button', { name: /^next$/i }).click();

    // The draft now exists on the server and the URL carries its id.
    await expectSaved(page);
    await expect(page).toHaveURL(/\/host\/listings\/[0-9a-f-]{36}/);
    await expectStep(page, 2);
  });

  test('return later → resume the exact property and step', async ({ page, request }) => {
    const host = await createHostAccount(request, 'resume');
    const other = await createListingViaApi(request, host, { name: 'Iná ponuka' });
    const target = await createListingViaApi(request, host, {
      name: 'Rozpracovaná chata',
      propertyType: 'cabin',
      description: 'd',
      street: 's',
      city: 'c',
      country: 'sk',
      lastVisitedStep: 'spaces',
    });
    await injectSession(page, host);

    await gotoHost(page, '/host/listings');
    const card = page.getByRole('article', { name: 'Rozpracovaná chata' });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: /continue setup/i }).click();

    await expect(page).toHaveURL(new RegExp(`/host/listings/${target.id}`));
    await expect(page).not.toHaveURL(new RegExp(other.id));
    await expectStep(page, 3);
    await expect(field(page, 'guests')).toBeVisible();
  });

  test('complete nine steps → review → publish', async ({ page, request }) => {
    const host = await createHostAccount(request, 'publish');
    // Steps 1–7 are filled through the API; the browser walks the last steps,
    // the review dialog and the publish action itself.
    const { calendarChoice, payoutAcknowledged, ...upToPolicies } = completeListingData('Chata na zverejnenie');
    const listing = await createListingViaApi(request, host, { ...upToPolicies, lastVisitedStep: 'calendar' });
    await injectSession(page, host);

    await page.goto(editorUrl(listing.id));
    await expectStep(page, 8);
    await page.getByLabel(/manual only/i).check();
    await page.getByRole('button', { name: /^next$/i }).click();

    await expectStep(page, 9);
    await field(page, 'payoutAcknowledged').check();
    await page.getByRole('button', { name: /^review$/i }).click();

    const dialog = page.getByRole('dialog', { name: /publish review/i });
    await expect(dialog).toBeVisible();
    const publish = dialog.getByRole('button', { name: /^publish listing$/i });
    await expect(publish).toBeEnabled({ timeout: 20_000 });
    await publish.click();

    // Publishing closes the review and the editor switches to its live state.
    await expect(page.getByRole('dialog', { name: /publish review/i })).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(/this listing is live/i)).toBeVisible();

    const saved = await getListingViaApi(request, host, listing.id);
    expect(saved.status).toBe('LIVE');
    expect(saved.data.calendarChoice).toBe('none');
    expect(saved.data.payoutAcknowledged).toBe(true);
  });

  test('add a second property → switch between them without leaking data', async ({ page, request }) => {
    const host = await createHostAccount(request, 'second');
    const first = await createListingViaApi(request, host, { name: 'Prvá chata', propertyType: 'cabin', description: 'first' });
    await injectSession(page, host);

    await gotoHost(page, '/host/listings');
    await page.getByRole('button', { name: /add listing/i }).first().click();
    await expect(page).toHaveURL(/\/host\/listings\/new/);
    await field(page, 'name').fill('Druhý apartmán');
    await field(page, 'propertyType').selectOption('apartment');
    await expectSaved(page);
    await expect(page).toHaveURL(/\/host\/listings\/[0-9a-f-]{36}/);
    const secondId = page.url().match(/\/host\/listings\/([0-9a-f-]{36})/)?.[1];
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(first.id);

    // Open the first property: its own values, nothing from the second.
    await page.goto(editorUrl(first.id, 'basics'));
    await expect(field(page, 'name')).toHaveValue('Prvá chata');
    await expect(field(page, 'propertyType')).toHaveValue('cabin');

    // Back to the second, again by URL, and both cards exist in Listings.
    await page.goto(editorUrl(secondId!, 'basics'));
    await expect(field(page, 'name')).toHaveValue('Druhý apartmán');
    await gotoHost(page, '/host/listings');
    await expect(page.getByRole('article', { name: 'Prvá chata' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Druhý apartmán' })).toBeVisible();
  });

  test('manage the calendar: block a range, then reopen it', async ({ page, request }) => {
    const host = await createHostAccount(request, 'calendar');
    const listing = await createListingViaApi(request, host, completeListingData('Kalendárová chata'));
    await injectSession(page, host);

    await page.goto(`/host/listings/${listing.id}/calendar`);
    await expect(page.getByRole('region', { name: /month view/i })).toBeVisible();

    // Pick two open days in the *next* month so "today" never interferes.
    await page.getByRole('button', { name: /^next month/i }).click();
    const openDays = page.getByRole('button', { name: /^\d{4}-\d{2}-\d{2} · (available|voľné)/i });
    await expect(openDays.first()).toBeVisible();
    const startLabel = (await openDays.nth(2).getAttribute('aria-label')) ?? '';
    const endLabel = (await openDays.nth(4).getAttribute('aria-label')) ?? '';
    const startIso = startLabel.slice(0, 10);
    const endIso = endLabel.slice(0, 10);
    await openDays.nth(2).click();
    await openDays.nth(4).click();

    await page.getByRole('button', { name: /^block$/i }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${startIso} · blocked`) })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^${endIso} · blocked`) })).toBeVisible();

    // Reopen the same range.
    await page.getByRole('button', { name: new RegExp(`^${startIso} ·`) }).click();
    await page.getByRole('button', { name: new RegExp(`^${endIso} ·`) }).click();
    await page.getByRole('button', { name: /^unblock$/i }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${startIso} · available`) })).toBeVisible();
  });

  test('manage reservations: sample requests → accept one → it becomes upcoming', async ({ page, request }) => {
    const host = await createHostAccount(request, 'reservations');
    await createListingViaApi(request, host, completeListingData('Rezervačná chata'));
    await injectSession(page, host);

    await gotoHost(page, '/host/reservations');
    await page.getByRole('button', { name: /add sample requests/i }).click();
    const requestLinks = page.getByRole('link', { name: /request/i }).filter({ has: page.locator('a') }).or(page.locator('a[href^="/host/reservations/"]'));
    await expect(requestLinks.first()).toBeVisible({ timeout: 20_000 });
    await requestLinks.first().click();
    await expect(page).toHaveURL(/\/host\/reservations\/[0-9a-f-]{36}/);

    await page.getByRole('button', { name: /^accept$/i }).click();
    const dialog = page.getByRole('alertdialog', { name: /accept this request/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^accept request$/i }).click();
    await expect(page.getByText(/request accepted|these nights are blocked/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /^accept$/i })).toHaveCount(0);
  });

  test('edit the host profile → open Today → switch back to traveler', async ({ page, request }) => {
    const host = await createHostAccount(request, 'profile');
    await injectSession(page, host);

    await gotoHost(page, '/host/profile');
    await page.locator('[name="displayName"]').fill('Eva z Liptova');
    await page.getByRole('button', { name: /^save profile$/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /\bSaved\b/ }).first()).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.locator('[name="displayName"]')).toHaveValue('Eva z Liptova');

    await gotoHost(page, '/host/menu');
    await page.getByRole('button', { name: /switch to travel/i }).first().click();
    await expect(page).toHaveURL(/\/account/, { timeout: 30_000 });

    // The account is now in traveler mode: the host shell is refused.
    const me = await request.get('/api/test-auth/me', { headers: { Authorization: `Bearer ${host.token}` } });
    expect(((await me.json()) as { activeMode: string }).activeMode).toBe('guest');
  });

  test('Slovak interface: the same journey reads in Slovak and autosave reports Uložené', async ({ page, request }) => {
    const host = await createHostAccount(request, 'sk');
    await injectSession(page, host, 'sk');

    await gotoHost(page, '/host/listings');
    await expect(page.getByRole('heading', { level: 1, name: /ponuky/i })).toBeVisible();
    await page.getByRole('button', { name: /^začať$/i }).click();
    await expect(page.getByText(/Krok 1 (\/|z) 9/).locator('visible=true').first()).toBeVisible();
    await field(page, 'name').fill('Slovenská chata');
    await expect(page.getByRole('status').filter({ hasText: /Uložené/ }).first()).toBeVisible({ timeout: 20_000 });
    // Validation messages are Slovak too, and the step does not advance.
    await page.getByRole('button', { name: /^ďalej$/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Vyberte typ ubytovania/ })).toBeVisible();
    await field(page, 'propertyType').selectOption('cabin');
    await field(page, 'description').fill('Malá chata, veľký les.');
    await page.getByRole('button', { name: /^ďalej$/i }).click();
    await expect(page.getByText(/Krok 2 (\/|z) 9/).locator('visible=true').first()).toBeVisible();
    await expect(page.getByText(/^Saved|Not saved/)).toHaveCount(0);
  });

  test('no primary Host navigation item opens a placeholder', async ({ page, request }) => {
    const host = await createHostAccount(request, 'nav');
    await createListingViaApi(request, host, completeListingData('Navigačná chata'));
    await injectSession(page, host);
    await gotoHost(page, '/host');

    const sections: Array<[RegExp, RegExp]> = [
      [/^listings$/i, /\/host\/listings$/],
      [/^calendar$/i, /\/calendar$/],
      [/^reservations$/i, /\/host\/reservations$/],
      [/^messages$/i, /\/host\/messages$/],
      [/^today$/i, /\/host$/],
    ];
    for (const [name, url] of sections) {
      await hostNavLink(page, name).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByText(/coming soon|placeholder|pripravujeme/i)).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    }
    // No horizontal scrolling at this viewport.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
