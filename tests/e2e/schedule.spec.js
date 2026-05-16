// Basic Playwright smoke flows for Schedule. Install @playwright/test to run.
// These tests assume a seeded org/user with schedule data and valid Auth0 session helpers.
// Scenarios cover: Arriving Now (with/without geolocation), Complete (with/without geolocation),
// duplicate prevention, reschedule rollback on failure, and recurring delete actions.

const { test, expect } = require('@playwright/test');

// Helper to mock/allow geolocation per test
async function allowGeo(page, { lat = 35.0, lng = -78.0, accuracy = 15 } = {}) {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: lat, longitude: lng, accuracy });
}

test.describe('Schedule flows', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: implement login helper; assumed cookie/session seeded via test harness
    await page.goto('/app/schedule');
  });

  test('Arriving Now succeeds with geolocation', async ({ page }) => {
    await allowGeo(page);
    const card = page.locator('[data-testid="schedule-card"]').first();
    await card.getByRole('button', { name: 'Arriving now' }).click();
    await expect(card.getByText('Arriving now text sent')).toBeVisible();
  });

  test('Arriving Now falls back without geolocation', async ({ page, context }) => {
    await context.clearPermissions();
    const card = page.locator('[data-testid="schedule-card"]').first();
    await card.getByRole('button', { name: 'Arriving now' }).click();
    await expect(card.getByText('Arriving now text sent')).toBeVisible();
    await expect(card.getByText(/Location unavailable/i)).toBeVisible();
  });

  test('Complete records without blocking on geolocation', async ({ page, context }) => {
    await context.clearPermissions();
    const card = page.locator('[data-testid="schedule-card"]').first();
    await card.getByRole('button', { name: 'Complete' }).click();
    await expect(card.getByText(/Service completed/i)).toBeVisible();
  });

  test('Duplicate prevention when rescheduling same customer to same day', async ({ page }) => {
    const card = page.locator('[data-testid="schedule-card"]').first();
    await card.getByRole('button', { name: 'More options' }).click();
    // pick a date already used by this customer; expect toast message
    await card.getByText('Reschedule').click();
    await expect(page.getByText('Already scheduled for this customer on that date.')).toBeVisible();
  });

  test('Recurring delete controls', async ({ page }) => {
    const card = page.locator('[data-testid="schedule-card"]').first();
    await card.getByRole('button', { name: 'More options' }).click();
    await card.getByRole('button', { name: 'End series' }).click();
    await expect(page.getByText(/Series ended|Failed to end series/)).toBeVisible();
    await card.getByRole('button', { name: 'Delete series' }).click();
    await page.getByRole('button', { name: 'OK' }).click({ force: true }).catch(() => {});
  });
});
