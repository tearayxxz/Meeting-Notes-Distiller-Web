import { FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TiltSurface } from '@/components/TiltSurface';

interface FileQueueProps {
  disabled: boolean;
  files: File[];
  onRemove: (key: string) => void;
}

export const fileKey = (file: File): string => `${file.name}:${file.size}:${file.lastModified}`;

const fileSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function FileQueue({ disabled, files, onRemove }: FileQueueProps) {
  return (
    <TiltSurface data-testid="queue-tilt-surface" depth="strong" className="h-full" glare={false}>
      <Card className="web-theme-panel h-full" aria-label="Uploaded files" role="region">
      <CardHeader className="border-b">
        <CardTitle>Uploaded files ({files.length})</CardTitle>
        <CardDescription>Add transcripts now or in another selection round.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-40 flex-1 flex-col gap-0">
        {files.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No transcripts selected</EmptyTitle>
              <EmptyDescription>Your selected .txt files will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          files.map((file, index) => (
            <div key={fileKey(file)}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center gap-3 py-3">
                <FileText className="shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{fileSize(file.size)}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      aria-label={`Remove ${file.name}`}
                      onClick={() => onRemove(fileKey(file))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove file</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))
        )}
      </CardContent>
      </Card>
    </TiltSurface>
  );
}
