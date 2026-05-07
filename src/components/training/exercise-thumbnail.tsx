'use client';

import { Dumbbell } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function ExerciseThumbnail({ imageUrl, name, size = 40, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const popupWidth = 160;
      const fitsRight = rect.right + popupWidth <= window.innerWidth;
      setPopupStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        transform: 'translateY(-50%)',
        ...(fitsRight ? { left: rect.right + 8 } : { left: rect.left - 160 - 8 }),
      });
    }, 150);
  }

  function handleMouseLeave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPopupStyle(null);
  }

  if (imageUrl) {
    return (
      <div
        ref={wrapperRef}
        className={cn('relative shrink-0', className)}
        style={{ width: size, height: size }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="rounded-md object-cover w-full h-full"
        />
        {popupStyle !== null && (
          <div data-testid="hover-popup" style={popupStyle} className="z-50">
            <div className="w-[140px] rounded-xl bg-[#1c1c1c] border border-foreground/10 p-2 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-24 rounded-md object-cover"
              />
              <p className="mt-2 text-[11px] font-semibold text-foreground text-center">{name}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="thumbnail-placeholder"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-[#161616]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Dumbbell className="text-[#444]" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
