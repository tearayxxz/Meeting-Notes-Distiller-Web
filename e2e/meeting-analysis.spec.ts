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
