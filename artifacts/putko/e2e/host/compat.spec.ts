import { expect, test } from '@playwright/test';
import {
  createHostAccount,
  createListingViaApi,
  editorUrl,
  expectSaved,
  expectStep,
  field,
  getListingViaApi,
  gotoHost,
  injectSession,
  legacyListingData,
  patchListingViaApi,
} from './helpers';

/**
 * Legacy entries must keep working: the old /host-preview URL, the onboarding
 * return flag older traveler screens set before redirecting, and accommodation
 * payloads written by the pre-rebuild editor.
 */

const START_ONBOARDING_FLAG = 'putko:start-host-onboarding';

test.describe('Host compatibility', () => {
  test('/host-preview redirects into the Host workspace', async ({ page, request }) => {
    const host = await createHostAccount(request, 'legacy-route');
    await injectSession(page, host);

    await page.goto('/host-preview');
    await expect(page).toHaveURL(/\/host$/);
    await expect(page.getByRole('navigation', { name: /host navigation/i })).toBeVisible();
  });

  test('onboarding return flag sends the host straight to the first-listing editor, once', async ({ page, request }) => {
    const host = await createHostAccount(request, 'legacy-flag');
    await injectSession(page, host);
    await page.addInitScript((flag) => {
      if (!sessionStorage.getItem('e2e-flag-set')) {
        localStorage.setItem(flag, 'true');
        sessionStorage.setItem('e2e-flag-set', '1');
      }
    }, START_ONBOARDING_FLAG);

    await page.goto('/host');
    await expect(page).toHaveURL(/\/host\/listings\/new/);
    await expectStep(page, 1);
    expect(await page.evaluate((flag) => localStorage.getItem(flag), START_ONBOARDING_FLAG)).toBeNull();

    // Consumed: the next visit to /host stays on Today.
    await page.goto('/host');
    await expect(page).toHaveURL(/\/host$/);
  });

  test('pre-rebuild accommodation payload renders in Listings, the editor and the calendar, and saves', async ({ page, request }) => {
    const host = await createHostAccount(request, 'legacy-payload');
    const created = await createListingViaApi(request, host, { name: 'placeholder' });
    // PATCH merges arbitrary keys, so the stored JSON ends up in the old shape.
    const legacy = await patchListingViaApi(request, host, created.id, legacyListingData());
    expect(legacy.data.lastVisitedStep).toBeUndefined();
    await injectSession(page, host);

    // Listings: the card renders with the old string numerics and photo shapes.
    await gotoHost(page, '/host/listings');
    const card = page.getByRole('article', { name: 'Starý apartmán' });
    await expect(card).toBeVisible();
    await expect(card.getByText(/košice/i)).toBeVisible();

    // The old payload already satisfies every requirement, so the card offers
    // the review; the editor shows every legacy value instead of blanking it.
    await card.getByRole('button', { name: /review and publish|continue setup|manage/i }).click();
    await expect(page).toHaveURL(new RegExp(`/host/listings/${created.id}`));
    await expect(page.getByRole('dialog', { name: /publish review/i })).toBeVisible();
    await page.goto(editorUrl(created.id, 'basics'));
    await expect(field(page, 'name')).toHaveValue('Starý apartmán');
    await expect(field(page, 'propertyType')).toHaveValue('apartment');
    await page.goto(editorUrl(created.id, 'spaces'));
    await expect(field(page, 'guests')).toHaveValue('2');
    await page.goto(editorUrl(created.id, 'pricing'));
    await expect(field(page, 'nightlyPrice')).toHaveValue('45');
    await page.goto(editorUrl(created.id, 'photos'));
    // Both legacy shapes (bare string and `{url}`) become photo entries.
    await expect(page.getByRole('button', { name: /^remove photo \d$/i })).toHaveCount(2);
    await page.goto(editorUrl(created.id, 'calendar'));
    await expect(page.getByLabel(/connect calendar links/i)).toBeChecked();

    // Saving from the new editor keeps the legacy fields intact.
    await page.goto(editorUrl(created.id, 'basics'));
    await field(page, 'name').fill('Starý apartmán (upravený)');
    await expectSaved(page);
    const saved = await getListingViaApi(request, host, created.id);
    expect(saved.data.name).toBe('Starý apartmán (upravený)');
    expect(saved.data.calendarChoice).toBe('connect');
    expect(saved.data.city).toBe('Košice');
    expect(Array.isArray(saved.data.calendarFeeds)).toBe(true);
    expect(saved.data.lastVisitedStep).toBe('basics');

    // Calendar: the id-less legacy feed is listed with a backfilled id and no crash.
    await page.goto(`/host/listings/${created.id}/calendar`);
    await expect(page.getByRole('region', { name: /month view/i })).toBeVisible();
    await expect(page.getByText('Airbnb').first()).toBeVisible();
  });

  test('Today aggregates a legacy listing without errors', async ({ page, request }) => {
    const host = await createHostAccount(request, 'legacy-today');
    const created = await createListingViaApi(request, host, { name: 'placeholder' });
    await patchListingViaApi(request, host, created.id, legacyListingData());
    await injectSession(page, host);

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await gotoHost(page, '/host');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/something went wrong|niečo sa pokazilo/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
