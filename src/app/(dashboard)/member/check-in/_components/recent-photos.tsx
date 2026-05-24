'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { PhotoGalleryModal } from './photo-gallery-modal';

interface PhotoEntry {
  url: string;
  submittedAt: string;
}

interface Props {
  recentPhotos: PhotoEntry[];  // 6 most recent
  allPhotos: PhotoEntry[];     // all photos for gallery
  totalCount: number;
}

export function RecentPhotos({ recentPhotos, allPhotos, totalCount }: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  if (totalCount === 0) return null;

  return (
    <>
      <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
            Recent Photos
          </span>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="text-[11px] text-primary-light"
          >
            All {totalCount} →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-[3px] p-[3px]">
          {recentPhotos.slice(0, 6).map((photo) => (
            <button
              type="button"
              key={photo.url}
              onClick={() => setGalleryOpen(true)}
              className="aspect-square rounded-[6px] overflow-hidden relative"
            >
              <Image src={photo.url} alt="" fill className="object-cover" />
              <div className="absolute bottom-0 inset-x-0 py-[3px] bg-gradient-to-t from-background/70 to-transparent text-[8px] text-foreground/55 text-center">
                {format(new Date(photo.submittedAt), 'd MMM')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <PhotoGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={allPhotos}
        totalCount={totalCount}
      />
    </>
  );
}
