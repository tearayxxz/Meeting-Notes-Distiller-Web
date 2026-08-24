const englishWeekdays = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
const englishMonths =
  'January|February|March|April|May|June|July|August|September|October|November|December';

const datePatterns = [
  new RegExp(String.raw`\bnext\s+(?:${englishWeekdays})\b`, 'iu'),
  new RegExp(String.raw`\b(?:${englishWeekdays})\b`, 'iu'),
  new RegExp(String.raw`\b(?:${englishMonths})\s+\d{1,2}(?:,\s*\d{4})?\b`, 'iu'),
  /\b\d{4}-\d{2}-\d{2}\b/u,
  /\b(?:today|tomorrow|tonight|next week|end of (?:the )?week|end of (?:the )?month)\b/iu,
  /วัน(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์)/u,
];

const replaceUnsafeControls = (value: string): string =>
  [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
        ? ' '
        : character;
    })
    .join('');

export const normalizeWhitespace = (value: string): string =>
  replaceUnsafeControls(value).replace(/\s+/gu, ' ').trim();

export const stripTerminalPunctuation = (value: string): string =>
  normalizeWhitespace(value).replace(/[.!?。]+$/u, '').trim();

export const sentenceCase = (value: string): string => {
  const clean = stripTerminalPunctuation(value);
  return clean ? `${clean[0]?.toLocaleUpperCase() ?? ''}${clean.slice(1)}` : clean;
};

export const lowerInitial = (value: string): string => {
  const clean = stripTerminalPunctuation(value);
  return clean ? `${clean[0]?.toLocaleLowerCase() ?? ''}${clean.slice(1)}` : clean;
};

export const extractDate = (value: string): string | null => {
  for (const pattern of datePatterns) {
    const match = pattern.exec(value);
    if (match?.[0]) return match[0];
  }
  return null;
};

export const extractAllDates = (value: string): string[] => {
  const combined = new RegExp(
    String.raw`\bnext\s+(?:${englishWeekdays})\b|\b(?:${englishWeekdays})\b|\b(?:${englishMonths})\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:today|tomorrow|next week)\b|วัน(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์)`,
    'giu',
  );
  return [...value.matchAll(combined)].map(([date]) => date);
};

export const removeDeadline = (value: string, dueDate: string | null): string => {
  let task = stripTerminalPunctuation(value);
  if (dueDate) {
    const escaped = dueDate.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    task = task.replace(
      new RegExp(
        String.raw`(?:\s+(?:(?:by|before|on|no later than)\s+)?${escaped}|ภายใน\s*${escaped})\s*$`,
        'iu',
      ),
      '',
    );
  }
  return lowerInitial(task.replace(/^(?:to\s+)/iu, ''));
};

export const countWords = (value: string): number =>
  normalizeWhitespace(value)
    .split(/\s+/u)
    .filter(Boolean).length;
