'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  photos: string[];
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckInPhotosSection({ photos, uploading, onFileChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = photos.length < 5 && !uploading;

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Progress Photos
        </h3>
        <span className="text-[11px] text-foreground/40">{photos.length} / 5</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <Image
            key={i}
            src={url}
            alt={`Photo ${i + 1}`}
            width={64}
            height={64}
            className="rounded-lg object-cover ring-1 ring-foreground/10"
          />
        ))}

        {uploading && (
          <div
            aria-label="Uploading..."
            className="size-16 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center"
          >
            <Loader2 className="size-4 text-foreground/40 animate-spin" />
          </div>
        )}

        {canAdd && (
          <button
            type="button"
            aria-label="Add photo"
            onClick={() => inputRef.current?.click()}
            className="size-16 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center hover:border-foreground/40 transition-colors cursor-pointer"
          >
            <Plus className="size-4 text-foreground/30" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={!canAdd}
        onChange={onFileChange}
        aria-label="Upload check-in photos"
        className="hidden"
      />
    </div>
  );
}
