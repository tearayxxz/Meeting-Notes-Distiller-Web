import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { AnalysisBatch, MeetingAnalysis } from '@meeting-distiller/shared';

const COLORS = {
  navy: '172554',
  indigo: '3346D3',
  muted: '64748B',
  border: 'CBD5E1',
  slate: 'F8FAFC',
  amber: '92400E',
  amberBackground: 'FEF3C7',
  white: 'FFFFFF',
};

const bullet = (text: string, level = 0): Paragraph =>
  new Paragraph({ text, numbering: { reference: 'report-bullets', level } });

const labelledLine = (label: string, value: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)],
  });

const heading = (text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3): Paragraph =>
  new Paragraph({ text, heading: level, keepNext: true });

const warningTable = (meeting: MeetingAnalysis): Table | null => {
  if (meeting.flags.length === 0) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: meeting.flags.map(
      (flag) =>
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: COLORS.amberBackground, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: flag.type.replace(/-/gu, ' ').toLocaleUpperCase(), bold: true, color: COLORS.amber }),
                    new TextRun({ text: `  ${flag.message}`, color: COLORS.amber }),
                  ],
                }),
                ...(flag.evidence.length > 0
                  ? [labelledLine('Evidence', flag.evidence.join(' | '))]
                  : []),
              ],
            }),
          ],
        }),
    ),
  });
};

const meetingChildren = (meeting: MeetingAnalysis, index: number): Array<Paragraph | Table> => {
  const children: Array<Paragraph | Table> = [
    heading(`Meeting ${index + 1} - ${meeting.fileName}`, HeadingLevel.HEADING_1),
    labelledLine('Detected format', meeting.format),
    labelledLine('Participants', meeting.participants.join(', ') || 'None identified'),
    heading('Topics and summaries', HeadingLevel.HEADING_2),
  ];

  if (meeting.topics.length === 0) children.push(bullet('No topics could be extracted.'));
  for (const topic of meeting.topics) {
    children.push(heading(topic.name, HeadingLevel.HEADING_3), new Paragraph(topic.summary));
    children.push(
      labelledLine(
        'Decisions',
        topic.decisions.length > 0 ? topic.decisions.map(({ text }) => text).join('; ') : 'No decision',
      ),
    );
    topic.decisions.forEach((decision) => children.push(labelledLine('Decision evidence', decision.evidence)));
  }

  children.push(heading('Action items', HeadingLevel.HEADING_2));
  if (meeting.actionItems.length === 0) children.push(bullet('No action items identified.'));
  for (const action of meeting.actionItems) {
    children.push(
      bullet(action.task),
      labelledLine('Owner', action.owner ?? 'Unassigned'),
      labelledLine('Due', action.dueDate ?? 'Not specified'),
      labelledLine('Evidence', action.evidence),
    );
  }

  children.push(heading('Problem flags', HeadingLevel.HEADING_2));
  const warnings = warningTable(meeting);
  if (warnings) children.push(warnings);
  else children.push(new Paragraph('No problems detected.'));
  return children;
};

const groupedActionsTable = (analysis: AnalysisBatch): Table => {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: ['Owner', 'Task', 'Due', 'Meeting'].map(
        (label) =>
          new TableCell({
            shading: { fill: COLORS.navy, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, color: COLORS.white })],
              }),
            ],
          }),
      ),
    }),
  ];

  for (const [owner, actions] of Object.entries(analysis.groupedActionItems)) {
    for (const action of actions) {
      rows.push(
        new TableRow({
          children: [owner, action.task, action.dueDate ?? 'Not specified', action.fileName].map(
            (value) => new TableCell({ children: [new Paragraph(value)] }),
          ),
        }),
      );
    }
  }
  if (rows.length === 1) {
    rows.push(
      new TableRow({
        children: [new TableCell({ columnSpan: 4, children: [new Paragraph('No action items identified.')] })],
      }),
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
};

export const generateWordReport = async (analysis: AnalysisBatch): Promise<Buffer> => {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 220 },
      children: [new TextRun({ text: 'Meeting Notes Distiller', bold: true, size: 40, color: COLORS.navy })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 700 },
      children: [new TextRun({ text: 'Analysis Report', size: 26, color: COLORS.muted })],
    }),
    labelledLine('Processed', new Date(analysis.processedAt).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC'),
    labelledLine('Meetings processed', String(analysis.meetings.length)),
  ];

  analysis.meetings.forEach((meeting, index) => children.push(...meetingChildren(meeting, index)));
  children.push(heading('Action items grouped by owner', HeadingLevel.HEADING_1), groupedActionsTable(analysis));
  if (analysis.failures.length > 0) {
    children.push(heading('Files not processed', HeadingLevel.HEADING_1));
    analysis.failures.forEach(({ fileName, message }) => children.push(bullet(`${fileName}: ${message}`)));
  }

  const document = new Document({
    creator: 'Meeting Notes Distiller Web',
    title: 'Meeting Notes Distiller Analysis Report',
    description: 'Structured meeting topics, decisions, action items, and warnings.',
    numbering: {
      config: [
        {
          reference: 'report-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: 'Aptos', size: 22, color: COLORS.navy },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 30, color: COLORS.navy },
          paragraph: { spacing: { before: 420, after: 180 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 25, color: COLORS.indigo },
          paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 22, color: COLORS.navy },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
};
