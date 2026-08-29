import type { ProblemFlag } from '@meeting-distiller/shared';
import { Badge } from '@/components/ui/badge';

type ProblemStatusType = ProblemFlag['type'] | 'failure';

const statusLabels: Record<ProblemStatusType, { accessible: string; visible: string }> = {
  conflict: { accessible: 'Conflict', visible: 'CONFLICT' },
  'empty-transcript': { accessible: 'Notice', visible: 'NOTICE' },
  failure: { accessible: 'Processing error', visible: 'PROCESSING ERROR' },
  'no-decision': { accessible: 'Unresolved', visible: 'UNRESOLVED' },
  'parse-warning': { accessible: 'Notice', visible: 'NOTICE' },
  'unassigned-action': { accessible: 'Unclaimed', visible: 'UNCLAIMED' },
};

interface ProblemStatusBadgeProps {
  type: ProblemStatusType;
}

export function ProblemStatusBadge({ type }: ProblemStatusBadgeProps) {
  const label = statusLabels[type];
  return (
    <Badge
      aria-label={`Problem status: ${label.accessible}`}
      className="problem-status-badge"
      data-problem-status={type}
      variant="outline"
    >
      {label.visible}
    </Badge>
  );
}
