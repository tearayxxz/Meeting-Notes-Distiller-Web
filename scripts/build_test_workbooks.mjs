/**
 * Rebuilds the required XLSX files from test-catalog.mjs.
 * Authoring uses @oai/artifact-tool supplied by the Codex workspace document runtime.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';
import { sitUatTestCases, unitTestCases } from './test-catalog.mjs';

const root = process.cwd();
const outputDir = path.join(root, 'docs');
const previewDir = path.join(outputDir, '.artifact-previews');
const headers = [
  'Test Case ID',
  'Module',
  'Scenario',
  'Precondition',
  'Input',
  'Test Steps',
  'Expected Result',
  'Implemented Test Reference',
  'Status',
];

const rowsFor = (cases) => cases.map((item) => [
  item.id,
  item.module,
  item.scenario,
  item.precondition,
  item.input,
  item.steps,
  item.expected,
  item.reference,
  item.status,
]);

const buildWorkbook = async ({ title, subtitle, cases, outputName, tableName }) => {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add('Test Cases');
  const lastRow = cases.length + 4;
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(4);

  sheet.getRange('A1:I1').merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange('A1:I1').format = {
    fill: '#17324D',
    font: { bold: true, color: '#FFFFFF', size: 18 },
    verticalAlignment: 'center',
  };
  sheet.getRange('A1:I1').format.rowHeight = 34;

  sheet.getRange('A2:I2').merge();
  sheet.getRange('A2').values = [[subtitle]];
  sheet.getRange('A2:I2').format = {
    fill: '#EAF2F8',
    font: { color: '#35556F', italic: true, size: 10 },
    verticalAlignment: 'center',
    wrapText: true,
  };
  sheet.getRange('A2:I2').format.rowHeight = 30;

  sheet.getRange('A3').values = [['Recorded test cases']];
  sheet.getRange('B3').formulas = [[`=COUNTA(A5:A${lastRow})`]];
  sheet.getRange('C3').values = [['Source of truth']];
  sheet.getRange('D3:I3').merge();
  sheet.getRange('D3').values = [['scripts/test-catalog.mjs mapped to implemented Vitest and Playwright references']];
  sheet.getRange('A3:I3').format = {
    fill: '#F8FAFC',
    font: { color: '#475569', size: 9 },
    verticalAlignment: 'center',
    wrapText: true,
  };
  sheet.getRange('A3').format.font = { bold: true, color: '#17324D', size: 9 };
  sheet.getRange('C3').format.font = { bold: true, color: '#17324D', size: 9 };
  sheet.getRange('A3:I3').format.rowHeight = 24;

  sheet.getRange('A4:I4').values = [headers];
  sheet.getRange(`A5:I${lastRow}`).values = rowsFor(cases);
  sheet.getRange(`A4:I${lastRow}`).format = {
    borders: { preset: 'all', style: 'thin', color: '#D6DEE6' },
    verticalAlignment: 'top',
    wrapText: true,
    font: { size: 9, color: '#17324D' },
  };
  sheet.getRange('A4:I4').format = {
    fill: '#2E74B5',
    font: { bold: true, color: '#FFFFFF', size: 9 },
    borders: { preset: 'all', style: 'thin', color: '#B8C7D3' },
    verticalAlignment: 'center',
    wrapText: true,
  };
  sheet.getRange('A4:I4').format.rowHeight = 30;
  sheet.getRange(`A5:I${lastRow}`).format.rowHeight = 62;
  sheet.getRange(`I5:I${lastRow}`).format = {
    fill: '#DCFCE7',
    font: { bold: true, color: '#166534', size: 9 },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: '#D6DEE6' },
  };
  [14, 20, 28, 26, 30, 32, 40, 54, 12].forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, lastRow, 1).format.columnWidth = width;
  });
  sheet.tables.add(`A4:I${lastRow}`, true, tableName).style = 'TableStyleMedium2';

  const preview = await workbook.render({
    sheetName: 'Test Cases',
    range: `A1:I${lastRow}`,
    scale: 0.9,
    format: 'png',
  });
  await fs.mkdir(previewDir, { recursive: true });
  await fs.writeFile(
    path.join(previewDir, outputName.replace('.xlsx', '.png')),
    new Uint8Array(await preview.arrayBuffer()),
  );
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(outputDir, outputName));
};

await fs.mkdir(outputDir, { recursive: true });
await buildWorkbook({
  title: 'Meeting Notes Distiller Web — Unit & Integration Test Cases',
  subtitle: 'Generated from the implemented domain, schema, API, frontend component, and artifact-integrity test suite. Status reflects the verified test run recorded for submission.',
  cases: unitTestCases,
  outputName: 'Unit_Test_Cases.xlsx',
  tableName: 'UnitTestCasesTable',
});
await buildWorkbook({
  title: 'Meeting Notes Distiller Web — SIT / UAT Test Cases',
  subtitle: 'System integration and user acceptance scenarios map directly to implemented API and Playwright workflows; no unsupported behavior is listed.',
  cases: sitUatTestCases,
  outputName: 'SIT_UAT_Test_Cases.xlsx',
  tableName: 'SitUatCasesTable',
});
