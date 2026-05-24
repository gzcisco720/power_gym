'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { initials } from '@/lib/utils';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  members: MemberRow[];
  sessionsThisMonth: number;
  newThisMonth: number;
}

export function TrainerMembersClient({ members, sessionsThisMonth, newThisMonth }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Members" value={String(members.length)} accentColor="primary" />
        <StatCard label="Sessions This Month" value={String(sessionsThisMonth)} />
        <StatCard label="New This Month" value={String(newThisMonth)} accentColor={newThisMonth > 0 ? 'success' : undefined} />
      </div>

      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/30"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          aria-label="Search members"
          className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-9 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
        {filtered.length === members.length
          ? `All Members (${members.length})`
          : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
          <p className="text-sm text-foreground/40">No members match your search.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((member) => (
            <div
              key={member._id}
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
                href={`/trainer/members/${member._id}`}
                className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors shrink-0"
              >
                View Hub →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
