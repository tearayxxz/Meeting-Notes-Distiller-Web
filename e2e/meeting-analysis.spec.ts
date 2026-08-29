import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { devices, expect, test } from '@playwright/test';

const fixture = (name: string): string => resolve(process.cwd(), 'tests', 'fixtures', name);

test('tilts only the focused upload surface under a fine pointer', async ({ page }) => {
  await page.goto('/');
  const surface = page.getByTestId('upload-tilt-surface');
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Upload tilt surface has no bounding box.');

  await page.mouse.move(box.x + box.width - 8, box.y + 8);
  await expect(surface).toHaveAttribute('data-tilt-active', 'true');
  await expect.poll(() => surface.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe('none');

  await page.mouse.move(1, 1);
  await expect(surface).toHaveAttribute('data-tilt-active', 'false');
  await expect(page.getByTestId('queue-tilt-surface')).toHaveAttribute('data-tilt-active', 'false');
});

test('uses static depth without page overflow on touch mobile', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByTestId('upload-tilt-surface')).toHaveAttribute('data-tilt-enabled', 'false');
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);

  await context.close();
});

test('keeps information-heavy meeting and problem views stable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Appearance theme' })).toHaveAttribute('data-depth', 'calm');

  await page.getByLabel('Choose transcript files').setInputFiles([fixture('format-a.txt'), fixture('missing-owner.txt')]);
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  await expect(page.getByRole('region', { name: 'Meeting navigator' })).toHaveAttribute('data-depth', 'calm');
  await expect(page.getByTestId('meeting-static-surface')).toHaveAttribute('data-depth', 'calm');
  await expect(page.getByTestId('meeting-tilt-surface')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open meeting 2: missing-owner.txt' }).click();
  await expect(page.getByRole('heading', { name: 'missing-owner.txt' })).toBeVisible();
  await expect(page.getByTestId('meeting-static-surface')).toHaveCount(1);

  await page.getByRole('tab', { name: /Problems/ }).click();
  await expect(page.getByTestId('problems-static-surface')).toHaveAttribute('data-depth', 'calm');
  await expect(page.getByTestId('problems-tilt-surface')).toHaveCount(0);
});

test('fills the upload frame when the queued-file column grows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles([
    fixture('format-a.txt'),
    fixture('format-b.txt'),
    fixture('format-c.txt'),
    fixture('missing-owner.txt'),
  ]);

  const uploadSurface = page.getByTestId('upload-tilt-surface');
  const uploadZone = page.locator('.upload-zone');
  const [surfaceBox, zoneBox] = await Promise.all([
    uploadSurface.boundingBox(),
    uploadZone.boundingBox(),
  ]);
  expect(surfaceBox).not.toBeNull();
  expect(zoneBox).not.toBeNull();
  if (!surfaceBox || !zoneBox) throw new Error('Upload layout did not render measurable boxes.');
  expect(Math.abs(surfaceBox.height - zoneBox.height)).toBeLessThanOrEqual(2);
});

test('centers the upload controls as one visual group', async ({ page }) => {
  await page.setViewportSize({ width: 1169, height: 912 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();
  await page.getByLabel('Choose transcript files').setInputFiles([
    fixture('instructor-01-no-decisions-brainstorm.txt'),
    fixture('instructor-02-structured-with-followups.txt'),
    fixture('instructor-03-thai-no-decisions-roadmap.txt'),
    fixture('instructor-04-thai-conflicting-launch.txt'),
  ]);
  await expect(page.getByText('Uploaded files (4)', { exact: true })).toBeVisible();

  const [zoneBox, iconBox, copyBox, browseBox] = await Promise.all([
    page.locator('.upload-zone').boundingBox(),
    page.locator('.upload-zone [class~="size-14"]').boundingBox(),
    page.getByText('Drop meeting transcripts here', { exact: true }).boundingBox(),
    page.getByText('Browse files', { exact: true }).boundingBox(),
  ]);
  expect(zoneBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(browseBox).not.toBeNull();
  if (!zoneBox || !iconBox || !copyBox || !browseBox) throw new Error('Upload controls did not render measurable boxes.');

  const zoneCenterX = zoneBox.x + zoneBox.width / 2;
  const horizontalOffsets = [iconBox, copyBox, browseBox]
    .map((box) => Math.abs(box.x + box.width / 2 - zoneCenterX));
  const visibleGroupCenterY = (iconBox.y + browseBox.y + browseBox.height) / 2;
  const zoneCenterY = zoneBox.y + zoneBox.height / 2;
  expect(Math.max(...horizontalOffsets)).toBeLessThanOrEqual(1);
  expect(Math.abs(visibleGroupCenterY - zoneCenterY)).toBeLessThanOrEqual(2);
});

test('fits result view tabs across the analysis workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('format-a.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  const workspace = page.locator('.analysis-workspace');
  const tabList = page.getByRole('tablist', { name: 'Analysis result views' });
  const [workspaceBox, tabListBox] = await Promise.all([
    workspace.boundingBox(),
    tabList.boundingBox(),
  ]);
  expect(workspaceBox).not.toBeNull();
  expect(tabListBox).not.toBeNull();
  if (!workspaceBox || !tabListBox) throw new Error('Result tab layout did not render measurable boxes.');
  expect(tabListBox.width).toBeGreaterThanOrEqual(workspaceBox.width - 48);

  const tabBoxes = await tabList.getByRole('tab').evaluateAll((tabs) => tabs.map((tab) => {
    const box = tab.getBoundingClientRect();
    return { bottom: box.bottom, left: box.left, right: box.right, top: box.top, width: box.width };
  }));
  expect(tabBoxes).toHaveLength(3);
  expect(tabBoxes.every((box) => box.width >= 180)).toBe(true);
  expect(tabBoxes.every((box) => box.top >= tabListBox.y && box.bottom <= tabListBox.y + tabListBox.height)).toBe(true);
  expect(tabBoxes[1].left).toBeGreaterThanOrEqual(tabBoxes[0].right);
  expect(tabBoxes[2].left).toBeGreaterThanOrEqual(tabBoxes[1].right);
});

test('slides the active highlight between analysis result tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1169, height: 912 });
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('format-a.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  const indicator = page.getByTestId('analysis-tab-highlight');
  await expect(indicator).toHaveCount(1);
  const startBox = await indicator.boundingBox();
  expect(startBox).not.toBeNull();
  if (!startBox) throw new Error('The initial analysis tab highlight is not measurable.');

  const problemsTab = page.getByRole('tab', { name: /Problems/ });
  await problemsTab.click();
  await expect(problemsTab).toHaveAttribute('data-state', 'active');
  const sampledPositions: number[] = [];
  for (let sample = 0; sample < 6; sample += 1) {
    const sampleBox = await indicator.boundingBox();
    if (sampleBox) sampledPositions.push(sampleBox.x);
    await page.waitForTimeout(35);
  }
  await page.waitForTimeout(350);
  const finalBox = await indicator.boundingBox();
  expect(finalBox).not.toBeNull();
  if (!finalBox) throw new Error('The final analysis tab highlight is not measurable.');

  expect(finalBox.x).toBeGreaterThan(startBox.x + 300);
  expect(sampledPositions.some((position) => position > startBox.x + 5 && position < finalBox.x - 5)).toBe(true);
});

test('keeps Web-Slinger warning content compact on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 958, height: 912 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('instructor-01-no-decisions-brainstorm.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();
  await page.getByRole('tab', { name: /Problems/ }).click();

  const firstAlert = page.locator('[data-testid="problems-static-surface"] .problem-alert').first();
  const title = firstAlert.locator('[data-slot="alert-title"]');
  const [alertBox, titleBox] = await Promise.all([firstAlert.boundingBox(), title.boundingBox()]);
  expect(alertBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  if (!alertBox || !titleBox) throw new Error('The first warning did not render measurable boxes.');

  expect(titleBox.y - alertBox.y).toBeLessThanOrEqual(20);
  expect(alertBox.height).toBeLessThanOrEqual(80);
});

test('keeps problem status badges visible in Light and Dark themes', async ({ page }) => {
  await page.setViewportSize({ width: 1169, height: 912 });
  await page.goto('/');
  await page.getByLabel('Choose transcript files').setInputFiles(fixture('instructor-04-thai-conflicting-launch.txt'));
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();
  await page.getByRole('tab', { name: /Problems/ }).click();

  const conflictStatus = page.getByLabel('Problem status: Conflict').first();
  await expect(conflictStatus).toBeVisible();
  await expect(conflictStatus).toHaveText('CONFLICT');

  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(conflictStatus).toBeVisible();
  await expect(conflictStatus).toHaveText('CONFLICT');
});

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

test('styles the selected Web-Slinger meeting selector emitted as the current step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();
  await page.getByLabel('Choose transcript files').setInputFiles([fixture('format-a.txt'), fixture('missing-owner.txt')]);
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();

  const selected = page.getByRole('button', { name: 'Open meeting 1: format-a.txt' });
  await expect(selected).toHaveAttribute('aria-current', 'step');
  const selectedBackground = await selected.evaluate((element) => getComputedStyle(element).backgroundColor);
  const heroBlue = await selected.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hero-blue').trim());
  expect(selectedBackground).toBe(heroBlue);
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

test('keeps Web-Slinger decorations and status labels out of pointer interaction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Web-Slinger theme' }).click();

  expect(await page.locator('.upload-zone').evaluate((element) => getComputedStyle(element, '::after').pointerEvents)).toBe('none');

  await page.getByLabel('Choose transcript files').setInputFiles([fixture('format-a.txt'), fixture('no-decision.txt')]);
  await page.getByRole('button', { name: 'Analyze Meetings' }).click();
  await expect(page.getByRole('heading', { name: 'format-a.txt' })).toBeVisible();
  expect(await page.locator('.action-mission').first().evaluate((element) => getComputedStyle(element, '::after').pointerEvents)).toBe('none');

  await page.getByRole('tab', { name: /Problems/ }).click();
  await expect(page.getByText(/No decision detected/).first()).toBeVisible();
  await expect(page.locator('.problem-status-badge').first()).toHaveCSS('pointer-events', 'none');
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
