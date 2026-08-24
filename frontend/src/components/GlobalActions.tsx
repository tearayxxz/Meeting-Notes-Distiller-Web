import type { GroupedActionItem } from '@meeting-distiller/shared';
import { CalendarClock, CircleUserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';

interface GlobalActionsProps { groups: Record<string, GroupedActionItem[]> }

export function GlobalActions({ groups }: GlobalActionsProps) {
  const entries = Object.entries(groups);
  if (entries.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><CircleUserRound aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>No action items</EmptyTitle>
          <EmptyDescription>No owner-grouped tasks were identified in these meetings.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {entries.map(([owner, actions]) => (
        <Card key={owner} size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><CircleUserRound aria-hidden="true" /> {owner}</CardTitle>
            <CardDescription>{actions.length} action {actions.length === 1 ? 'item' : 'items'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-0">
            {actions.map((action, index) => (
              <div key={`${action.meetingId}-${action.task}-${index}`}>
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-2 py-3">
                  <p className="font-medium">{action.task}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{action.fileName}</Badge>
                    <Badge variant="secondary">
                      <CalendarClock data-icon="inline-start" aria-hidden="true" />
                      {action.dueDate ?? 'Not specified'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
