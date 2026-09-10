import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Shared helpers for the Host regression suite. Accounts are created through
 * the API's development-only test-auth routes and sessions are injected via
 * localStorage (`user` / `token` / `role`, the keys AuthContext restores), so
 * only the journeys that are *about* logging in go through the login form.
 */

export const PASSWORD = 'Putko-e2e-1';

export type TestAccount = {
  email: string;
  password: string;
  token: string;
  user: Record<string, unknown>;
  role: string;
};

const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@example.com`;

export async function registerVerifiedTraveler(request: APIRequestContext, tag = 'host') {
  const email = uniqueEmail(tag);
  const register = await request.post('/api/test-auth/register', {
    data: {
      name: 'Eva',
      lastName: 'Testerová',
      email,
      phoneNumber: '+421900123456',
      password: PASSWORD,
      gender: 'female',
      role: 'guest',
      language: 'en',
      lang: 'en',
    },
  });
  expect(register.status(), await register.text()).toBe(201);
  const { verificationToken } = (await register.json()) as { verificationToken: string };
  const verify = await request.get(`/api/test-auth/verify-email/${encodeURIComponent(verificationToken)}`);
  expect(verify.ok(), await verify.text()).toBeTruthy();
  return { email, password: PASSWORD };
}

export async function loginViaApi(request: APIRequestContext, email: string, password = PASSWORD): Promise<TestAccount> {
  const response = await request.post('/api/test-auth/login', { data: { email, password, lang: 'en' } });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as { token: string; data: Record<string, unknown>; role?: string };
  const user = body.data;
  return { email, password, token: body.token, user, role: body.role ?? (user.activeMode as string) ?? 'guest' };
}

export const authHeaders = (account: TestAccount) => ({ Authorization: `Bearer ${account.token}` });

/** Activate hosting through the API and refresh the account snapshot. */
export async function activateHostViaApi(request: APIRequestContext, account: TestAccount): Promise<TestAccount> {
  const response = await request.post('/api/test-auth/host-activation', { headers: authHeaders(account) });
  expect(response.ok(), await response.text()).toBeTruthy();
  const user = (await response.json()) as Record<string, unknown>;
  return { ...account, user, role: (user.activeMode as string) ?? 'host' };
}

/** A verified traveler who already activated hosting (host mode active). */
export async function createHostAccount(request: APIRequestContext, tag = 'host') {
  const credentials = await registerVerifiedTraveler(request, tag);
  const traveler = await loginViaApi(request, credentials.email);
  return activateHostViaApi(request, traveler);
}

/**
 * Put the session into the browser before any script runs, and force the
 * interface language. AuthContext re-validates the token against /me on boot.
 */
export async function injectSession(page: Page, account: TestAccount, language: 'en' | 'sk' = 'en') {
  await page.addInitScript(
    ({ user, token, role, lang }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('appLanguage', lang);
    },
    { user: account.user, token: account.token, role: account.role, lang: language },
  );
}

export async function forceLanguage(page: Page, language: 'en' | 'sk') {
  await page.addInitScript((lang) => localStorage.setItem('appLanguage', lang), language);
}

export async function createListingViaApi(request: APIRequestContext, account: TestAccount, data: Record<string, unknown> = {}) {
  const response = await request.post('/api/test-auth/host-accommodations', { headers: authHeaders(account), data: { data } });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as { id: string; status: string; data: Record<string, unknown>; completedSteps: string[] };
}

export async function patchListingViaApi(request: APIRequestContext, account: TestAccount, id: string, data: Record<string, unknown>) {
  const response = await request.patch(`/api/test-auth/host-accommodations/${id}`, { headers: authHeaders(account), data: { data } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as { id: string; status: string; data: Record<string, unknown>; completedSteps: string[]; canPublish: boolean };
}

export async function getListingViaApi(request: APIRequestContext, account: TestAccount, id: string) {
  const response = await request.get(`/api/test-auth/host-accommodations/${id}`, { headers: authHeaders(account) });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as { id: string; status: string; data: Record<string, unknown>; completedSteps: string[]; canPublish: boolean };
}

/** Everything the server needs to mark all nine steps complete. */
export const completeListingData = (name = 'Chata Lúčky') => ({
  name,
  propertyType: 'cabin',
  description: 'A quiet cabin above the village with a view of the Tatras.',
  street: 'Lúčky 12',
  city: 'Liptovský Mikuláš',
  country: 'Slovakia',
  guests: 4,
  bedrooms: 2,
  beds: 3,
  bathrooms: 1,
  amenities: ['wifi', 'kitchen', 'parking'],
  photoUrls: ['https://images.example.com/cabin-1.jpg'],
  nightlyPrice: 89,
  minNights: 2,
  checkIn: '15:00',
  checkOut: '10:00',
  cancellationPolicy: 'flexible',
  availabilityConfirmed: true,
  calendarChoice: 'none',
  payoutAcknowledged: true,
});

/**
 * Shape of an accommodation payload written by the pre-rebuild editor: no
 * `lastVisitedStep`, calendar feeds as bare `{label,url}` objects without
 * ids/status, `calendarChoice` chosen on the old combined "readiness" step,
 * and photos as a mix of bare strings and `{url}` objects. Numeric fields
 * were already stored as numbers by the old editor (`Number(value)`).
 */
export const legacyListingData = () => ({
  name: 'Starý apartmán',
  propertyType: 'apartment',
  description: 'Saved before the rebuild.',
  street: 'Hlavná 1',
  city: 'Košice',
  country: 'Slovakia',
  guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  amenities: ['wifi'],
  photoUrls: ['https://images.example.com/legacy-1.jpg', { url: 'https://images.example.com/legacy-2.jpg' }],
  nightlyPrice: 45,
  minNights: 1,
  checkIn: '14:00',
  checkOut: '11:00',
  cancellationPolicy: 'moderate',
  availabilityConfirmed: true,
  calendarChoice: 'connect',
  calendarFeeds: [{ label: 'Airbnb', url: 'https://calendar.example.com/legacy.ics' }],
  payoutAcknowledged: true,
});

export const editorUrl = (id: string, step?: string) => `/host/listings/${id}${step ? `?step=${step}` : ''}`;

/** Open a Host route and wait for the shell (bottom nav / sidebar) to render. */
export async function gotoHost(page: Page, path = '/host') {
  await page.goto(path);
  await expect(page.getByRole('navigation').first()).toBeVisible();
}

/** The mobile bottom bar and the desktop sidebar both expose the same links. */
export const hostNavLink = (page: Page, name: RegExp) => page.getByRole('link', { name }).first();

/** Wait until the editor reports the draft as saved (autosave or explicit). */
export async function expectSaved(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /\bSaved\b/ }).first()).toBeVisible({ timeout: 20_000 });
}

/** The editor header shows "Step N / 9" on phones and "Step N of 9" on desktop. */
export async function expectStep(page: Page, index: number) {
  await expect(page.getByText(new RegExp(`Step ${index} (/|of) 9`)).locator('visible=true').first()).toBeVisible();
}

/** Fill a labelled editor field by its input name (the editor uses name=id). */
export const field = (page: Page, name: string) =>
  page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`).first();

/**
 * Fail the next `count` requests matching `pattern` at the network layer
 * (the browser sees a connection error, not an HTTP status).
 */
export async function failNextRequests(page: Page, pattern: RegExp, count = 1, method?: string) {
  let remaining = count;
  const handler = async (route: import('@playwright/test').Route) => {
    if (remaining > 0 && (!method || route.request().method() === method)) {
      remaining -= 1;
      await route.abort('connectionfailed');
      return;
    }
    await route.continue();
  };
  await page.route(pattern, handler);
  return async () => {
    await page.unroute(pattern, handler);
  };
}
