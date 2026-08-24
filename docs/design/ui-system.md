# Meeting Notes Distiller UI System

Reference concept: `docs/design/meeting-dashboard-concept.png`

## Layout and copy

- Compact top header: “Meeting Notes Distiller” and “Turn raw transcripts into decisions and action.”
- Desktop first band: upload dropzone left, queued files and primary action right; stack on mobile.
- Status alert follows upload band.
- Result tabs: “Meeting Results”, “Action Items by Owner”, and “Problems”.
- Meeting cards preserve visible participants, topic summaries, decisions, action items, and warnings.
- Global grouped actions and “Download Word Report” stay visible after successful analysis.

## Tokens

- Background: true white with cool slate page band (`#f8fafc`).
- Text: deep navy (`#0f172a`); muted text (`#64748b`).
- Primary: indigo (`#3346d3`); focus ring uses a lighter indigo.
- Success: emerald; warning: amber; conflict/error: red.
- Surfaces: white, cool-gray hairline borders, restrained shadow.
- Radius: 10px controls, 14px cards and dropzone.
- Spacing: 4px base scale, 24px major gaps, 32px page gutters.
- Motion: 150ms color, border, and shadow transitions; respect reduced motion.

## Typography and icons

- Font: Inter-compatible system sans stack; 34px/700 title, 20-24px section headings, 14-16px app chrome and body.
- Lucide outline icons at consistent optical sizes and default stroke weight.
- Button icons use inline-start/inline-end data attributes.

## Components

- shadcn/ui Button, Card, Badge, Alert, Tabs, Separator, Progress, and Tooltip.
- Custom UploadZone and file rows composed from those primitives.
- Open sections remain open; avoid nesting every subsection in a card.
