import { useEffect, useReducer, useMemo } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { variants } from '@/lib/animations/variants';
import { cn } from '@/lib/utils';
import type { Invite } from '@/api/users';

interface DialogState {
  open: boolean;
  role: 'trainer' | 'member';
  email: string;
  trainerId: string;
  saving: boolean;
}

type DialogAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_ROLE'; value: 'trainer' | 'member' }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_TRAINER_ID'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN': return { ...state, open: true };
    case 'CLOSE': return { ...state, open: false, role: 'member', email: '', trainerId: '', saving: false };
    case 'SET_ROLE': return { ...state, role: action.value };
    case 'SET_EMAIL': return { ...state, email: action.value };
    case 'SET_TRAINER_ID': return { ...state, trainerId: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

function expiryLabel(isoDate: string): string {
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Expires today';
  if (days === 1) return 'Expires in 1d';
  return `Expires in ${days}d`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const roleBadgeClass: Record<'trainer' | 'member', string> = {
  trainer: 'bg-primary/15 text-primary-light',
  member: 'bg-emerald-500/15 text-emerald-400',
};

function RoleBadge({ role }: { role: 'trainer' | 'member' }) {
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded flex-shrink-0 ${roleBadgeClass[role]}`}
    >
      {role}
    </span>
  );
}

function InviteCard({ inv }: { inv: Invite }) {
  const role = inv.role as 'trainer' | 'member';

  function copyLink() {
    const url = `${window.location.origin}/register?token=${inv.token}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success('Link copied to clipboard');
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-card ring-1 ring-foreground/10 rounded-xl hover:ring-foreground/25 transition-all">
      <RoleBadge role={role} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground/85 truncate">
          {inv.recipientEmail}
        </div>
        {inv.usedAt ? (
          <div className="text-[10px] text-emerald-400/70 mt-0.5">
            ✓ Joined {formatDate(inv.usedAt)}
          </div>
        ) : (
          <div className="text-[10px] text-foreground/40 mt-0.5">
            {expiryLabel(inv.expiresAt)}
          </div>
        )}
      </div>
      {!inv.usedAt && (
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLink}
          className="text-foreground/50 hover:text-foreground/80 hover:bg-white/[.06] text-xs h-7 px-2 shrink-0"
        >
          Copy Link
        </Button>
      )}
    </div>
  );
}

export function OwnerInvitesPage() {
  const { invites, trainers, fetchOwnerInvites, fetchTrainers, createInvite, isLoading } =
    useUsersStore();
  const shouldReduceMotion = useReducedMotion();

  const [dlg, dispatch] = useReducer(dialogReducer, {
    open: false,
    role: 'member',
    email: '',
    trainerId: '',
    saving: false,
  });

  useEffect(() => {
    void fetchOwnerInvites();
    void fetchTrainers();
  }, [fetchOwnerInvites, fetchTrainers]);

  const now = useMemo(() => new Date(), []);
  const pending = useMemo(
    () => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now),
    [invites, now],
  );
  const accepted = useMemo(() => invites.filter((inv) => !!inv.usedAt), [invites]);
  const expired = useMemo(
    () => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now),
    [invites, now],
  );

  const animProps = shouldReduceMotion
    ? {}
    : { variants: variants.staggerItem, initial: 'hidden', animate: 'visible' };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await createInvite({
        recipientEmail: dlg.email,
        role: dlg.role,
        trainerId: dlg.role === 'member' && dlg.trainerId ? dlg.trainerId : undefined,
      });
      toast.success('Invite link generated');
      dispatch({ type: 'CLOSE' });
    } catch {
      toast.error('Failed to create invite');
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  const sendInviteAction = (
    <Button size="sm" onClick={() => dispatch({ type: 'OPEN' })}>
      Send Invite
    </Button>
  );

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title="Invites"
          subtitle={`${pending.length} pending`}
          actions={sendInviteAction}
        />
        <div className="px-4 sm:px-8 py-6 space-y-6">
          {isLoading && invites.length === 0 ? (
            <StatCardsSkeleton count={3} className="sm:grid-cols-3" />
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
                <StatCard label="Accepted" value={String(accepted.length)} accentColor="success" />
                <StatCard label="Expired" value={String(expired.length)} />
              </div>

              {/* Pending section */}
              <div className="space-y-3">
                <div className="text-[9px] uppercase tracking-[2px] text-primary-light font-semibold">
                  Pending ({pending.length})
                </div>
                {pending.length === 0 ? (
                  <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
                    <p className="text-sm text-foreground/40">No pending invites</p>
                  </div>
                ) : (
                  <m.div
                    className="space-y-1.5"
                    variants={variants.staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {pending.map((inv) => (
                      <m.div key={inv._id} {...animProps}>
                        <InviteCard inv={inv} />
                      </m.div>
                    ))}
                  </m.div>
                )}
              </div>

              {/* Accepted section */}
              {accepted.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[9px] uppercase tracking-[2px] text-emerald-400 font-semibold">
                    Accepted ({accepted.length})
                  </div>
                  <m.div
                    className="space-y-1.5"
                    variants={variants.staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {accepted.map((inv) => (
                      <m.div key={inv._id} {...animProps}>
                        <InviteCard inv={inv} />
                      </m.div>
                    ))}
                  </m.div>
                </div>
              )}

              {/* Expired section */}
              <div className="space-y-3">
                <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold">
                  Expired ({expired.length})
                </div>
                {expired.length === 0 ? (
                  <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
                    <p className="text-sm text-foreground/40">No expired invites</p>
                  </div>
                ) : (
                  <m.div
                    className="space-y-1.5"
                    variants={variants.staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {expired.map((inv) => (
                      <m.div key={inv._id} {...animProps} className="opacity-60">
                        <InviteCard inv={inv} />
                      </m.div>
                    ))}
                  </m.div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Send Invite Dialog */}
      <Dialog open={dlg.open} onOpenChange={(open) => { if (!open) dispatch({ type: 'CLOSE' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invite</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 mt-1">
            {/* Role toggle */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Role
              </div>
              <div className="flex gap-2">
                {(['member', 'trainer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_ROLE', value: r })}
                    className={cn(
                      'flex-1 h-9 rounded-lg text-sm font-semibold capitalize transition-all',
                      dlg.role === r
                        ? 'bg-primary/20 ring-1 ring-primary/40 text-primary-light'
                        : 'bg-white/[.03] ring-1 ring-white/[.08] text-foreground/40 hover:text-foreground/65',
                    )}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Trainer selector (member only) */}
            {dlg.role === 'member' && trainers.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="invite-trainer"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Assign to Trainer
                </label>
                <select
                  id="invite-trainer"
                  value={dlg.trainerId}
                  onChange={(e) => dispatch({ type: 'SET_TRAINER_ID', value: e.target.value })}
                  className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-3 text-sm text-foreground/80 focus:outline-none focus:ring-white/20 transition-all"
                >
                  <option value="">No trainer</option>
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="invite-email"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                name="invite-email"
                required
                value={dlg.email}
                onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
                placeholder="member@example.com"
                aria-label="Email"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={dlg.saving}>
                {dlg.saving ? 'Generating...' : 'Generate Invite Link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => dispatch({ type: 'CLOSE' })}
                className="text-foreground/65"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </LazyMotion>
  );
}
