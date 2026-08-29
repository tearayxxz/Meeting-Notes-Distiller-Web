import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';
import { sitUatTestCases, unitTestCases } from '../../scripts/test-catalog.mjs';

const root = process.cwd();

const readZipEntry = (file: string, entry: string): string => {
  const archive = new AdmZip(path.join(root, file));
  const item = archive.getEntry(entry);
  expect(item, `${file} should contain ${entry}`).not.toBeNull();
  return item?.getData().toString('utf8') ?? '';
};

describe('submission documents', () => {
  it('includes a valid SRS Word document with implemented requirements', () => {
    const file = 'docs/Meeting_Notes_Distiller_SRS.docx';
    expect(existsSync(path.join(root, file))).toBe(true);
    const documentXml = readZipEntry(file, 'word/document.xml');
    expect(documentXml).toContain('Meeting Notes Distiller Web');
    expect(documentXml).toContain('Functional Requirements');
    expect(documentXml).toContain('Known Limitations');
  });

  it.each([
    ['docs/Unit_Test_Cases.xlsx', 'Action item without owner', 'Meeting without a final decision'],
    ['docs/SIT_UAT_Test_Cases.xlsx', 'Upload and analyze one transcript', 'Download Word report'],
  ])('includes a valid test-case workbook at %s', (file, firstExpected, secondExpected) => {
    expect(existsSync(path.join(root, file))).toBe(true);
    const workbookXml = readZipEntry(file, 'xl/workbook.xml');
    const stringsXml = readZipEntry(file, 'xl/sharedStrings.xml');
    const sheetXml = readZipEntry(file, 'xl/worksheets/sheet1.xml');
    expect(workbookXml).toContain('Test Cases');
    expect(`${stringsXml}${sheetXml}`).toContain(firstExpected);
    expect(`${stringsXml}${sheetXml}`).toContain(secondExpected);
  });

  it('keeps the documented test catalog synchronized with test source references', () => {
    const catalog = readFileSync(path.join(root, 'scripts/test-catalog.mjs'), 'utf8');
    const testSources = [
      'tests/unit/actions.test.ts',
      'tests/unit/decisions.test.ts',
      'tests/unit/normalizer.test.ts',
      'tests/unit/flags.test.ts',
      'tests/unit/extractor.test.ts',
      'tests/unit/contracts.test.ts',
      'tests/api/analyze-api.test.ts',
      'tests/api/report-api.test.ts',
      'tests/frontend/app.test.tsx',
      'e2e/meeting-analysis.spec.ts',
    ];

    for (const reference of testSources) {
      expect(catalog).toContain(reference);
    }
    expect(unitTestCases).toHaveLength(59);
    expect(sitUatTestCases).toHaveLength(11);
    expect(new Set(unitTestCases.map(({ id }) => id)).size).toBe(unitTestCases.length);
    expect(new Set(sitUatTestCases.map(({ id }) => id)).size).toBe(sitUatTestCases.length);
  });
});
