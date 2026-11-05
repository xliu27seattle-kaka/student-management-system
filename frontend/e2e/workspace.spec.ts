import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/weather?**', (r) =>
    r.fulfill({
      json: {
        localTime: '2026-11-05T12:00',
        timezone: 'America/New_York',
        temperature: 18,
        weatherCode: 2,
        isDay: true,
      },
    }),
  );
});

test('student CRUD, enrollment, work tabs, confirmation and course CRUD', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Washington, DC' })).toBeVisible();
  await page.getByRole('link', { name: '+ Add student' }).click();
  await page.getByRole('button', { name: 'Create student', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByLabel('Full name').fill(`Ada ${stamp}`);
  await page.getByRole('textbox', { name: /^Email/ }).fill(`ada${stamp}@example.com`);
  await page.getByRole('button', { name: 'Create student', exact: true }).click();
  await expect(page).toHaveURL(/\/students\/\d+$/);
  const studentUrl = page.url();
  const studentId = Number(studentUrl.split('/').pop());
  await expect(page.getByRole('heading', { name: 'Enrolled courses (0)' })).toBeVisible();
  await page.getByRole('button', { name: 'Enroll', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Enrolled courses (1)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enrolled', exact: true })).toBeDisabled();
  await page.getByLabel('Full name').fill(`Grace ${stamp}`);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Courses' })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Full name')).toHaveValue(`Grace ${stamp}`);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Courses' })
    .click();
  await page.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await page.getByRole('link', { name: '+ Add course' }).click();
  await page.getByLabel('Course name').fill(`Test course ${stamp}`);
  await page.getByLabel('Course code').fill(`T${stamp}`);
  await page.getByLabel('Capacity').fill('2');
  await page.getByRole('button', { name: 'Create course', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/\d+$/);
  const courseId = Number(page.url().split('/').pop());
  await page
    .getByRole('navigation', { name: 'Open work tabs' })
    .getByRole('link', { name: new RegExp(`Ada ${stamp}`) })
    .click();
  await expect(page.getByLabel('Full name')).toHaveValue(`Grace ${stamp}`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Grace ${stamp}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enrolled courses (0)' })).toBeVisible();
  await page.getByLabel('Full name').fill('Discard me');
  await page.getByRole('button', { name: 'Close tab', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Discard me');
  await page.getByRole('button', { name: 'Close tab', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Delete Grace ${stamp}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('link', { name: `Grace ${stamp}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Delete Grace ${stamp}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('link', { name: `Grace ${stamp}`, exact: true })).toHaveCount(0);
  await expect(page.getByText(`Grace ${stamp} was deleted.`, { exact: true })).toBeVisible();
  const deleted = await request.get(`/api/students/${studentId}`);
  expect(deleted.status()).toBe(404);
  await page.goto(`/courses/${courseId}`);
  await page.getByLabel('Capacity').fill('3');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Course saved successfully.')).toBeVisible();
  expect((await request.get(`/api/courses/${courseId}`)).status()).toBe(200);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Courses' })
    .click();
  await page.getByRole('textbox', { name: 'Search courses' }).fill(`T${stamp}`);
  await page.getByRole('button', { name: `Delete Test course ${stamp}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matches found' })).toBeVisible();
});

test('weather city selection, location failure and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/weather/cities?**', (r) =>
    r.fulfill({
      json: [
        {
          name: 'Seattle',
          region: 'Washington',
          country: 'United States',
          latitude: 47.61,
          longitude: -122.33,
        },
      ],
    }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1 }),
      },
    });
  });
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Change location' }).click();
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(
    page.getByText('Could not access your location. Please search for a city.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'City name' }).fill('Seattle');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page
    .getByRole('button', { name: 'Seattle, Washington, United States', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Seattle, Washington', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('weather failure does not block the directory', async ({ page }) => {
  await page.route('**/api/weather?**', (r) =>
    r.fulfill({
      status: 503,
      json: { detail: 'Weather is temporarily unavailable. Please try again later.' },
    }),
  );
  await page.goto('/courses');
  await expect(
    page.getByText('Weather is temporarily unavailable.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Introduction to Programming', exact: true }),
  ).toBeVisible();
});

test('API rejects duplicate enrollment and full courses, and preserves records after cascade deletion', async ({
  request,
}) => {
  const stamp = Date.now();
  const course = await (
    await request.post('/api/courses', {
      data: { code: `E${stamp}`, name: 'One seat', description: 'Capacity test', capacity: 1 },
    })
  ).json();
  const a = await (
    await request.post('/api/students', { data: { name: 'First', email: `a${stamp}@example.com` } })
  ).json();
  const b = await (
    await request.post('/api/students', {
      data: { name: 'Second', email: `b${stamp}@example.com` },
    })
  ).json();
  expect((await request.post(`/api/students/${a.id}/courses/${course.id}`)).status()).toBe(201);
  expect((await request.post(`/api/students/${a.id}/courses/${course.id}`)).status()).toBe(409);
  expect((await request.post(`/api/students/${b.id}/courses/${course.id}`)).status()).toBe(409);
  expect((await request.delete(`/api/courses/${course.id}`)).status()).toBe(204);
  expect(await (await request.get(`/api/students/${a.id}/enrollments`)).json()).toHaveLength(0);
  expect((await request.get(`/api/students/${a.id}`)).status()).toBe(200);
  await request.delete(`/api/students/${a.id}`);
  await request.delete(`/api/students/${b.id}`);
});

test('browser location sends coordinates for weather and shows Current location', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 47.61, longitude: -122.33 });
  await page.goto('/students');
  await page.getByRole('button', { name: 'Change location' }).click();
  const weatherRequest = page.waitForRequest(
    (r) => r.url().includes('/api/weather?') && r.url().includes('latitude=47.61'),
  );
  await page.getByRole('button', { name: 'Use my location' }).click();
  await weatherRequest;
  await expect(page.getByRole('heading', { name: 'Current location', exact: true })).toBeVisible();
});

test('directory pagination, sorting and search work against server data', async ({
  page,
  request,
}) => {
  const code = `ZZ${Date.now()}`;
  const course = await (
    await request.post('/api/courses', {
      data: { code, name: 'Pagination test', description: '', capacity: 20 },
    })
  ).json();
  try {
    await page.goto('/courses');
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Pagination test', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: 'Sort descending', exact: true }).click();
    await expect(
      page.getByRole('row').nth(1).getByRole('link', { name: 'Pagination test' }),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'Search courses' }).fill(code);
    await expect(page.getByText('1 courses found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pagination test', exact: true })).toBeVisible();
  } finally {
    await request.delete(`/api/courses/${course.id}`);
  }
});

test('UI displays duplicate email and capacity conflict errors from the backend', async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const email = `existing${stamp}@example.com`;
  const first = await (
    await request.post('/api/students', { data: { name: 'Existing student', email } })
  ).json();
  const second = await (
    await request.post('/api/students', {
      data: { name: 'Second student', email: `second${stamp}@example.com` },
    })
  ).json();
  const course = await (
    await request.post('/api/courses', {
      data: { code: `C${stamp}`, name: 'Capacity check', description: '', capacity: 2 },
    })
  ).json();
  try {
    expect((await request.post(`/api/students/${first.id}/courses/${course.id}`)).status()).toBe(
      201,
    );
    expect((await request.post(`/api/students/${second.id}/courses/${course.id}`)).status()).toBe(
      201,
    );
    await page.goto('/students/new');
    await page.getByLabel('Full name').fill('Duplicate email');
    await page.getByRole('textbox', { name: /^Email/ }).fill(email);
    await page.getByRole('button', { name: 'Create student', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Email is already in use.');
    await expect(page.getByRole('textbox', { name: /^Email/ })).toHaveValue(email);
    await page.getByRole('button', { name: 'Close tab', exact: true }).click();
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(page).toHaveURL(/\/students$/);
    await page.goto(`/courses/${course.id}`);
    await page.getByLabel('Capacity').fill('1');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Capacity cannot be lower than current enrollment.',
    );
    expect((await (await request.get(`/api/courses/${course.id}`)).json()).capacity).toBe(2);
  } finally {
    await request.delete(`/api/courses/${course.id}`);
    await request.delete(`/api/students/${first.id}`);
    await request.delete(`/api/students/${second.id}`);
  }
});
