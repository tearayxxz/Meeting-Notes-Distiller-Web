import { useState, type ChangeEvent, type DragEvent } from 'react';
import { FileUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TiltSurface } from '@/components/TiltSurface';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

export function UploadZone({ disabled, onFiles }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const accept = (files: FileList | null): void => {
    if (files) onFiles(Array.from(files));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    accept(event.currentTarget.files);
    event.currentTarget.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files);
  };

  return (
    <TiltSurface data-testid="upload-tilt-surface" depth="strong" className="h-full" glare>
      <div
        className={cn(
          'upload-zone web-theme-panel relative flex min-h-64 flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-dashed bg-card p-8 text-center shadow-xs transition-colors',
          dragging && 'border-primary bg-primary/5',
          disabled && 'opacity-60',
        )}
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileUp aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-lg font-semibold">Drop meeting transcripts here</p>
          <p className="text-sm text-muted-foreground">.txt files up to 1 MB each</p>
        </div>
        <Button asChild variant="outline" size="lg">
          <label htmlFor="transcript-files">
            <FolderOpen data-icon="inline-start" aria-hidden="true" />
            Browse files
          </label>
        </Button>
        <input
          id="transcript-files"
          className="sr-only"
          type="file"
          accept=".txt,text/plain"
          multiple
          disabled={disabled}
          aria-label="Choose transcript files"
          onChange={handleChange}
        />
      </div>
    </TiltSurface>
  );
}
