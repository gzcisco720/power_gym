'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JourneyItem, JourneyResponse, JourneySummary } from '@/lib/types/journey';
import JourneyHeader from './journey-header';
import TimelineNode from './timeline-node';
import MilestoneCard from './milestone-card';

interface Props {
  memberId: string;
}

export default function JourneyClient({ memberId }: Props) {
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Use refs so the IntersectionObserver closure always sees current values
  const nextCursorRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const fetchPage = useCallback(async (cursor?: string): Promise<JourneyResponse> => {
    const url = new URL(`/api/members/${memberId}/journey`, window.location.origin);
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString());
    if (!res.ok) return { items: [], nextCursor: null, summary: null };
    return res.json() as Promise<JourneyResponse>;
  }, [memberId]);

  useEffect(() => {
    fetchPage().then(data => {
      setItems(data.items);
      setSummary(data.summary);
      setNextCursor(data.nextCursor);
      setIsLoading(false);
    });
  }, [fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursorRef.current && !isLoadingMoreRef.current) {
          setIsLoadingMore(true);
          fetchPage(nextCursorRef.current).then(data => {
            setItems(prev => [...prev, ...data.items]);
            setNextCursor(data.nextCursor);
            setIsLoadingMore(false);
          });
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-3.5 shrink-0">
              <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-foreground/10 animate-pulse" />
              <div className="flex-1 w-0.5 bg-foreground/[0.06] mt-1 min-h-10" />
            </div>
            <div className="flex-1 pb-2">
              <div className="h-12 rounded-lg bg-foreground/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <span className="text-4xl">🏋️</span>
        <p className="text-foreground font-semibold">还没有体测记录</p>
        <p className="text-foreground/65 text-sm">请联系你的教练安排第一次体测</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <JourneyHeader summary={summary} />

      <div className="flex flex-col">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 && !nextCursor;
          return item.milestone ? (
            <MilestoneCard key={item.bodyTest.id} item={item} isLast={isLast} />
          ) : (
            <TimelineNode key={item.bodyTest.id} item={item} isLast={isLast} />
          );
        })}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isLoadingMore && (
        <div className="flex justify-center gap-1 py-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {!nextCursor && !isLoading && items.length > 0 && (
        <p className="text-center text-foreground/65 text-xs py-4">· 已显示全部记录 ·</p>
      )}
    </div>
  );
}
