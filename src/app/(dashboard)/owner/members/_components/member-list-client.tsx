'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { ReassignModal } from './reassign-modal';
import { initials } from '@/lib/utils';

const PAGE_SIZE = 10;

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
  createdAt: string;
}

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  members: MemberRow[];
  trainers: TrainerOption[];
  totalCount: number;
  trainerCount: number;
  unassignedCount: number;
}

export function MemberListClient({
  members,
  trainers,
  totalCount,
  trainerCount,
  unassignedCount,
}: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);
  const [search, setSearch] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchesTrainer =
        trainerFilter === 'all' ||
        (trainerFilter === 'unassigned' ? !m.trainerId : m.trainerId === trainerFilter);
      return matchesSearch && matchesTrainer;
    });
  }, [members, search, trainerFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(value: string) {
    setTrainerFilter(value);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Members" value={String(totalCount)} accentColor="primary" />
        <StatCard label="Trainers" value={String(trainerCount)} />
        <StatCard
          label="Unassigned"
          value={String(unassignedCount)}
          accentColor={unassignedCount > 0 ? 'achievement' : undefined}
        />
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-white/20 transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={trainerFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-3 text-sm text-foreground/60 focus:outline-none focus:ring-white/20 transition-all cursor-pointer"
        >
          <option value="all">All Trainers</option>
          {trainers.map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* Section label */}
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold mb-3">
        {filtered.length === totalCount
          ? `All Members (${totalCount})`
          : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-10 text-center">
          <p className="text-sm text-foreground/40">
            {search || trainerFilter !== 'all' ? 'No members match your filters.' : 'No members yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {paginated.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                {initials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{member.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5 truncate">{member.email}</div>
              </div>
              <div className="hidden sm:block shrink-0">
                {member.trainerName ? (
                  <span className="text-[11px] font-medium text-foreground/50 bg-white/[.05] ring-1 ring-white/[.08] rounded px-2 py-0.5">
                    {member.trainerName}
                  </span>
                ) : (
                  <span className="text-[11px] text-foreground/20 italic">Unassigned</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/trainer/members/${member._id}`}
                  className="text-[11px] text-foreground/35 hover:text-foreground/70 transition-colors"
                >
                  View →
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReassigning(member)}
                  className="text-primary-light/70 hover:text-primary-light hover:bg-primary/10 text-xs h-7 px-2"
                >
                  Reassign
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client-side pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="h-8 px-3 rounded-lg text-sm text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] disabled:opacity-30 hover:ring-white/20 transition-all"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition-all ${
                n === safePage
                  ? 'bg-primary/20 ring-1 ring-primary/40 text-primary-light'
                  : 'text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] hover:ring-white/20'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="h-8 px-3 rounded-lg text-sm text-foreground/40 bg-white/[.03] ring-1 ring-white/[.07] disabled:opacity-30 hover:ring-white/20 transition-all"
          >
            →
          </button>
        </div>
      )}

      {reassigning && (
        <ReassignModal
          memberId={reassigning._id}
          memberName={reassigning.name}
          currentTrainerId={reassigning.trainerId}
          trainers={trainers}
          onClose={() => setReassigning(null)}
        />
      )}
    </>
  );
}
