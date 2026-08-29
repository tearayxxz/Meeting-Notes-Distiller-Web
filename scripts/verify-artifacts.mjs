import { stat } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

const root = process.cwd();

const requiredEntry = (archive, fileName, entryName) => {
  const entry = archive.getEntry(entryName);
  if (!entry) throw new Error(`${fileName}: missing required OOXML entry ${entryName}`);
  return entry.getData().toString('utf8');
};

const assertContains = (text, values, fileName) => {
  for (const value of values) {
    if (!text.includes(value)) throw new Error(`${fileName}: expected text not found: ${value}`);
  }
};

const validateZipFile = async (relativePath, minimumBytes) => {
  const absolutePath = path.join(root, relativePath);
  const details = await stat(absolutePath);
  if (details.size < minimumBytes) {
    throw new Error(`${relativePath}: file is unexpectedly small (${details.size} bytes)`);
  }
  const archive = new AdmZip(absolutePath);
  requiredEntry(archive, relativePath, '[Content_Types].xml');
  return { archive, size: details.size };
};

const validateDocx = async () => {
  const file = 'docs/Meeting_Notes_Distiller_SRS.docx';
  const { archive, size } = await validateZipFile(file, 20_000);
  const documentXml = requiredEntry(archive, file, 'word/document.xml');
  requiredEntry(archive, file, 'word/styles.xml');
  assertContains(documentXml, [
    'Meeting Notes Distiller Web',
    'Functional Requirements',
    'Non-Functional Requirements',
    'Acceptance Criteria',
    'Known Limitations',
  ], file);
  return { file, size };
};

const validateXlsx = async (file, expectedStrings, expectedRows) => {
  const { archive, size } = await validateZipFile(file, 5_000);
  const workbookXml = requiredEntry(archive, file, 'xl/workbook.xml');
  const stringsXml = requiredEntry(archive, file, 'xl/sharedStrings.xml');
  const sheetXml = requiredEntry(archive, file, 'xl/worksheets/sheet1.xml');
  const tableXml = requiredEntry(archive, file, 'xl/tables/table1.xml');
  requiredEntry(archive, file, 'xl/styles.xml');
  assertContains(workbookXml, ['Test Cases'], file);
  assertContains(`${stringsXml}${sheetXml}`, expectedStrings, file);
  if (!tableXml.includes(`ref="A4:I${expectedRows + 4}"`)) {
    throw new Error(`${file}: expected table range for ${expectedRows} test cases not found`);
  }
  return { file, size };
};

const results = [
  await validateDocx(),
  await validateXlsx(
    'docs/Unit_Test_Cases.xlsx',
    ['Action item without owner', 'Meeting without a final decision', 'Implemented Test Reference'],
    59,
  ),
  await validateXlsx(
    'docs/SIT_UAT_Test_Cases.xlsx',
    ['Upload and analyze one transcript', 'Download Word report', 'User acceptance'],
    11,
  ),
];

for (const { file, size } of results) {
  console.log(`PASS ${file} (${size.toLocaleString('en-US')} bytes)`);
}
