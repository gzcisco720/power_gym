'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [prevOpen, setPrevOpen] = useState(open);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIndex(initialIndex);
  }

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  if (!open || images.length === 0) return null;

  return (
    // oxlint-disable-next-line react-doctor/prefer-tag-over-role
    <div role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
      >
        <X className="size-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-12 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="size-8" />
          </button>
        </>
      )}

      <Image
        src={images[index]}
        alt={`Image ${index + 1} of ${images.length}`}
        width={1200}
        height={900}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-1.5">
          {images.map((img, i) => (
            <button
              type="button"
              key={img}
              aria-label={`View image ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
