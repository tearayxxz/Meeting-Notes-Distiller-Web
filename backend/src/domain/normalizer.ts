import type {
  NormalizedTranscript,
  NormalizedUtterance,
  TranscriptFormat,
} from '@meeting-distiller/shared';

const timestamp = String.raw`\d{1,2}:\d{2}(?::\d{2})?`;
const dashPattern = new RegExp(
  String.raw`^\[(${timestamp})\]\s*([^-–—:]{1,60}?)\s*[-–—]\s*(.+)$`,
);
const blockHeaderPattern = new RegExp(String.raw`^(${timestamp})\s+(.{1,60})$`);
const colonPattern = /^([^:[\]\r\n]{1,60}):\s*(.+)$/u;
const metadataLabelPattern = /^(?:date|facilitator|attendees?|participants?|next sync|ppl|วันที่|ผู้เข้าร่วม|คนเข้าร่วม)$/iu;
const dateOnlyPattern = /^(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})$/u;
const markdownHeadingPattern = /^#{1,6}\s+(.+)$/u;
const bulletPattern = /^(?:[*+-]|\d+[.)])\s+(.+)$/u;

const cleanLines = (text: string): string[] =>
  text
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trim());

const appendContinuation = (utterance: NormalizedUtterance, text: string): void => {
  utterance.text = `${utterance.text} ${text}`.replace(/\s+/gu, ' ').trim();
};

const cleanHeading = (text: string): string =>
  text.replace(/^Topic\s+\d+\s*:\s*/iu, '').replace(/\s*\(not decided\)\s*$/iu, '').trim();

const colonParts = (line: string): { label: string; value: string } | null => {
  const match = colonPattern.exec(line);
  const label = match?.[1]?.trim();
  const value = match?.[2]?.trim();
  return label && value ? { label, value } : null;
};

const isMetadataLine = (line: string): boolean => {
  const parts = colonParts(line);
  return Boolean(parts && metadataLabelPattern.test(parts.label));
};

const isSpeakerLine = (line: string): boolean => {
  if (markdownHeadingPattern.test(line) || bulletPattern.test(line)) return false;
  const parts = colonParts(line);
  if (!parts || metadataLabelPattern.test(parts.label)) return false;
  return !/^(?:topic\s+\d+|action item|task)$/iu.test(parts.label);
};

const noteUtterance = (
  text: string,
  lineNumber: number,
  kind: NormalizedUtterance['kind'] = 'note',
): NormalizedUtterance => ({ speaker: null, timestamp: null, text, lineNumber, kind });

const parseSingleLineFormat = (
  lines: string[],
  format: Extract<TranscriptFormat, 'speaker-colon' | 'timestamp-dash'>,
): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    if (!line) return;

    const match = format === 'timestamp-dash' ? dashPattern.exec(line) : colonPattern.exec(line);
    if (match) {
      const [, first, second, third] = match;
      const speaker = format === 'timestamp-dash' ? second : first;
      const utteranceText = format === 'timestamp-dash' ? third : second;
      if (speaker && utteranceText && !/^\d+$/u.test(speaker.trim())) {
        utterances.push({
          speaker: speaker.trim(),
          timestamp: format === 'timestamp-dash' && first ? first : null,
          text: utteranceText.trim(),
          lineNumber: index + 1,
          kind: 'speech',
        });
        return;
      }
    }

    const last = utterances.at(-1);
    if (last) appendContinuation(last, line);
    else warnings.push(`Line ${index + 1} did not include a recognized speaker label.`);
  });

  return { format, utterances, warnings };
};

const parseBlockFormat = (lines: string[]): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    if (!line) return;
    const header = blockHeaderPattern.exec(line);
    if (header) {
      const [, time, speaker] = header;
      if (time && speaker) {
        utterances.push({
          speaker: speaker.trim(),
          timestamp: time,
          text: '',
          lineNumber: index + 1,
          kind: 'speech',
        });
      }
      return;
    }

    const last = utterances.at(-1);
    if (last) appendContinuation(last, line);
    else warnings.push(`Line ${index + 1} appeared before the first timestamp and speaker.`);
  });

  return {
    format: 'timestamp-block',
    utterances: utterances.filter(({ text }) => text.length > 0),
    warnings,
  };
};

const parseMixedSpeakerFormat = (lines: string[]): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  let previousLineWasBlank = true;

  lines.forEach((line, index) => {
    if (!line) {
      previousLineWasBlank = true;
      return;
    }

    const heading = markdownHeadingPattern.exec(line)?.[1];
    if (heading) {
      const cleaned = cleanHeading(heading);
      if (!/^this week$/iu.test(cleaned)) {
        utterances.push(noteUtterance(cleaned, index + 1, 'heading'));
      }
      previousLineWasBlank = false;
      return;
    }

    const bullet = bulletPattern.exec(line)?.[1];
    if (bullet) {
      utterances.push(noteUtterance(bullet.trim(), index + 1));
      previousLineWasBlank = false;
      return;
    }

    if (isMetadataLine(line) || dateOnlyPattern.test(line)) {
      utterances.push(noteUtterance(line, index + 1, 'metadata'));
      previousLineWasBlank = false;
      return;
    }

    if (isSpeakerLine(line)) {
      const parts = colonParts(line);
      if (parts) {
        utterances.push({
          speaker: parts.label,
          timestamp: null,
          text: parts.value,
          lineNumber: index + 1,
          kind: 'speech',
        });
      }
      previousLineWasBlank = false;
      return;
    }

    const last = utterances.at(-1);
    if (!previousLineWasBlank && last?.kind === 'speech') appendContinuation(last, line);
    else utterances.push(noteUtterance(line, index + 1, index === 0 ? 'heading' : 'note'));
    previousLineWasBlank = false;
  });

  return { format: 'speaker-colon', utterances, warnings: [] };
};

const parseUnstructured = (lines: string[]): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  const firstContentIndex = lines.findIndex(Boolean);
  const nextContent = lines.slice(firstContentIndex + 1).find(Boolean);
  const hasTitleAndDate = firstContentIndex >= 0 && Boolean(nextContent && dateOnlyPattern.test(nextContent));
  let previousLineWasBlank = true;

  lines.forEach((line, index) => {
    if (!line) {
      previousLineWasBlank = true;
      return;
    }
    const heading = markdownHeadingPattern.exec(line)?.[1];
    const bullet = bulletPattern.exec(line)?.[1];
    if (heading) utterances.push(noteUtterance(cleanHeading(heading), index + 1, 'heading'));
    else if (bullet) utterances.push(noteUtterance(bullet.trim(), index + 1));
    else if (isMetadataLine(line) || dateOnlyPattern.test(line)) {
      utterances.push(noteUtterance(line, index + 1, 'metadata'));
    } else if (index === firstContentIndex && hasTitleAndDate) {
      utterances.push(noteUtterance(line, index + 1, 'heading'));
    } else {
      const last = utterances.at(-1);
      if (!previousLineWasBlank && last?.kind === 'note') appendContinuation(last, line);
      else utterances.push(noteUtterance(line, index + 1));
    }
    previousLineWasBlank = false;
  });

  return {
    format: 'unstructured',
    utterances,
    warnings: ['No supported speaker format was detected; content was analyzed as structured notes without speaker labels.'],
  };
};

export const normalizeTranscript = (text: string): NormalizedTranscript => {
  const lines = cleanLines(text);
  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length === 0) return { format: 'unstructured', utterances: [], warnings: [] };

  if (nonEmpty.some((line) => dashPattern.test(line))) {
    return parseSingleLineFormat(lines, 'timestamp-dash');
  }

  if (nonEmpty.some((line) => blockHeaderPattern.test(line))) {
    return parseBlockFormat(lines);
  }

  if (nonEmpty.some(isSpeakerLine)) return parseMixedSpeakerFormat(lines);

  return parseUnstructured(lines);
};
