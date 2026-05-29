import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TrainerMembersPage() {
  const { members, fetchMembers, isLoading } = useUsersStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  function handleSearch(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, debouncedQuery]);

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title="Members"
          subtitle={
            isLoading
              ? undefined
              : `${members.length} member${members.length !== 1 ? 's' : ''} assigned to you`
          }
        />

        <div className="px-4 sm:px-8 py-7 space-y-4">
          {isLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[60px] rounded-xl" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              heading="No members yet"
              description="Members assigned to you will appear here."
            />
          ) : (
            <>
              {/* Search input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search members…"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  aria-label="Search members"
                  className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-9 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => { setQuery(''); setDebouncedQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold">
                {filtered.length === members.length
                  ? `All Members (${members.length})`
                  : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              </div>

              {filtered.length === 0 ? (
                <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
                  <p className="text-sm text-foreground/40">No members match your search.</p>
                </div>
              ) : (
                <m.div
                  className="space-y-1.5"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {filtered.map((member) => (
                    <m.div
                      key={member._id}
                      variants={{ hidden: { opacity: 0, y: shouldReduce ? 0 : 6 }, visible: { opacity: 1, y: 0 } }}
                      className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                        {initials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground/85 truncate">{member.name}</div>
                        <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{member.email}</div>
                      </div>
                      <Link
                        to={`/trainer/members/${member._id}`}
                        className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors shrink-0"
                      >
                        View Hub →
                      </Link>
                    </m.div>
                  ))}
                </m.div>
              )}
            </>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
