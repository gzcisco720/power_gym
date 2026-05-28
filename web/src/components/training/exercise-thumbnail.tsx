'use client';

import Image from 'next/image';
import { Dumbbell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}

function computePopupStyle(el: HTMLDivElement): React.CSSProperties {
  const rect = el.getBoundingClientRect();
  const popupWidth = 248;
  const fitsRight = rect.right + popupWidth <= window.innerWidth;
  return {
    position: 'fixed',
    zIndex: 50,
    top: rect.top + rect.height / 2,
    transform: 'translateY(-50%)',
    ...(fitsRight ? { left: rect.right + 8 } : { left: rect.left - 256 }),
  };
}

export function ExerciseThumbnail({ imageUrl, name, size = 40, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleMouseEnter() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!wrapperRef.current) return;
      setPopupStyle(computePopupStyle(wrapperRef.current));
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
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="64px"
          className="rounded-md object-cover"
        />
        {popupStyle !== null && (
          <div data-testid="hover-popup" style={popupStyle}>
            <div className="w-[240px] rounded-xl bg-card border border-foreground/10 p-2 shadow-2xl">
              <div className="relative w-full h-44 rounded-md overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  sizes="240px"
                  className="object-cover"
                />
              </div>
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
        'flex shrink-0 items-center justify-center rounded-md bg-muted',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Dumbbell className="text-foreground/65" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
