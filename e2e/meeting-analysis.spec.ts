import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixture = (name: string): string => resolve(process.cwd(), 'tests', 'fixtures', name);

test('uploads and analyzes a transcript into structured meeting results', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('format-a.txt'));
  await expect(page.getByText('format-a.txt')).toBeVisible();

  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByRole('heading', { name: 'format-a.txt' })).toBeVisible();
  await expect(page.getByText('Alice', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Bob', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('prepare the production server').first()).toBeVisible();
  await expect(page.getByText('Thursday').first()).toBeVisible();
  await expect(page.getByText(/Multiple release dates/)).toHaveCount(0);
});

test('keeps additive upload rounds and groups actions by owner', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Choose transcript files');
  await input.setInputFiles(fixture('format-a.txt'));
  await input.setInputFiles(fixture('missing-owner.txt'));

  await expect(page.getByText('format-a.txt')).toBeVisible();
  await expect(page.getByText('missing-owner.txt')).toBeVisible();
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByText('Meeting 1 of 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'format-a.txt' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'missing-owner.txt' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open meeting 2: missing-owner.txt' }).click();
  await expect(page.getByText('Meeting 2 of 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'missing-owner.txt' })).toBeVisible();

  await page.getByRole('tab', { name: /Action Items by Owner/ }).click();

  await expect(page.getByText('Bob', { exact: true })).toBeVisible();
  await expect(page.getByText('Unassigned', { exact: true })).toBeVisible();
  await expect(page.getByText('update the server')).toBeVisible();
});

test('shows a prominent no-decision warning without inventing a decision', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('no-decision.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByText(/No decision detected/).first()).toBeVisible();
  await expect(page.getByText('Decision: No decision').first()).toBeVisible();
  await expect(page.getByText(/Launch on (Monday|Tuesday|Wednesday)/i)).toHaveCount(0);
});

test('rejects unsupported files before sending an analysis request', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not a transcript'),
  });

  await expect(page.getByRole('alert')).toContainText('notes.pdf is not a .txt file');
  await expect(page.getByRole('button', { name: 'Analyze Meetings' })).toBeDisabled();
});

test('persists the Web-Slinger theme and replays its effect when analysis starts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'web-slinger');
  await expect(page.getByTestId('web-slinger-effect')).toHaveAttribute('data-run', '1');
  await expect(page.getByTestId('web-slinger-effect')).toBeHidden({ timeout: 2_000 });

  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'web-slinger');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'web-slinger');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('format-a.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByTestId('web-slinger-effect')).toHaveAttribute('data-run', '1');
  await expect(page.getByRole('heading', { name: 'format-a.txt' })).toBeVisible();
});

test('runs and clears both Light/Dark celestial directions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-dark');
  await expect(page.getByTestId('celestial-transition')).toBeHidden({ timeout: 2_000 });

  await page.getByRole('button', { name: 'Light theme' }).click();
  await expect(page.getByTestId('celestial-transition')).toHaveAttribute('data-direction', 'to-light');
  await expect(page.getByTestId('celestial-transition')).toBeHidden({ timeout: 2_000 });
});

test('keeps Web-Slinger decorative pseudo-elements out of pointer interaction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();

  expect(await page.locator('.upload-zone').evaluate((element) => getComputedStyle(element, '::after').pointerEvents)).toBe('none');

  await page.getByLabel('Choose transcript files').setInputFiles([fixture('format-a.txt'), fixture('no-decision.txt')]);
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();
  await expect(page.getByRole('heading', { name: 'format-a.txt' })).toBeVisible();
  expect(await page.locator('.action-mission').first().evaluate((element) => getComputedStyle(element, '::after').pointerEvents)).toBe('none');

  await page.getByRole('tab', { name: /Problems/ }).click();
  await expect(page.getByText(/No decision detected/).first()).toBeVisible();
  expect(await page.locator('.problem-alert').first().evaluate((element) => getComputedStyle(element, '::before').pointerEvents)).toBe('none');
});

test('downloads a structurally recognizable Word report', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('decision.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();
  await expect(page.getByRole('heading', { name: 'decision.txt' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Word Report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Meeting_Notes_Distiller_Report.docx');
  const savedPath = await download.path();
  expect(savedPath).not.toBeNull();
  if (!savedPath) throw new Error('Playwright did not provide a downloaded report path.');
  const bytes = await readFile(savedPath);
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
});

test('renders evidence-based results for all four instructor meeting-note samples', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles([
    fixture('instructor-01-no-decisions-brainstorm.txt'),
    fixture('instructor-02-structured-with-followups.txt'),
    fixture('instructor-03-thai-no-decisions-roadmap.txt'),
    fixture('instructor-04-thai-conflicting-launch.txt'),
  ]);
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByText('Meeting 1 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'instructor-01-no-decisions-brainstorm.txt' })).toBeVisible();
  await expect(page.getByText('Sam', { exact: true })).toBeVisible();
  await expect(page.getByText('Lena', { exact: true })).toBeVisible();
  await expect(page.getByText('pull data on mobile churn', { exact: true })).toBeVisible();
  await expect(page.getByText(/No decision detected/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Open meeting 2: instructor-02-structured-with-followups.txt' }).click();
  await expect(page.getByText('Meeting 2 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Database performance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On-call rotation' })).toBeVisible();
  await expect(page.getByText('add the index this sprint', { exact: true })).toBeVisible();
  await expect(page.getByText('research whether to adopt the new logging library', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Open meeting 3: instructor-03-thai-no-decisions-roadmap.txt' }).click();
  await expect(page.getByText('Meeting 3 of 4')).toBeVisible();
  await expect(page.getByText('แซม', { exact: true })).toBeVisible();
  await expect(page.getByText('เลน่า', { exact: true })).toBeVisible();
  await expect(page.getByText('ดึงข้อมูล churn ของมือถือมาดู', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Open meeting 4: instructor-04-thai-conflicting-launch.txt' }).click();
  await expect(page.getByText('Meeting 4 of 4')).toBeVisible();
  await expect(page.getByText('Launch on วันที่ 30', { exact: true })).toBeVisible();
  await expect(page.getByText('ทำ dashboard ให้เสร็จ', { exact: true })).toBeVisible();
  await expect(page.getByText(/Published launch dates conflict with the final meeting date/).first()).toBeVisible();
  await expect(page.getByText(/Feature-freeze timing conflicts/).first()).toBeVisible();
});
