import { useEffect, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useInvitesStore } from '@/stores/invitesStore';
import { useTrainersStore } from '@/stores/trainersStore';
import { cn } from '@/lib/utils';
import type { InviteListItem } from '@/api/invites';

interface DialogState {
  role: 'trainer' | 'member';
  email: string;
  trainerId: string;
  saving: boolean;
  generatedUrl: string | null;
}

type DialogAction =
  | { type: 'SET_ROLE'; value: 'trainer' | 'member' }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_TRAINER_ID'; value: string }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_GENERATED_URL'; value: string | null }
  | { type: 'RESET'; defaultTrainerId: string };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'SET_ROLE': return { ...state, role: action.value };
    case 'SET_EMAIL': return { ...state, email: action.value };
    case 'SET_TRAINER_ID': return { ...state, trainerId: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_GENERATED_URL': return { ...state, generatedUrl: action.value };
    case 'RESET': return { role: 'member', email: '', trainerId: action.defaultTrainerId, saving: false, generatedUrl: null };
    default: return state;
  }
}

const roleBadgeClass: Record<'trainer' | 'member', string> = {
  trainer: 'bg-primary/15 text-primary-light',
  member: 'bg-emerald-500/15 text-emerald-400',
};

function expiryLabel(isoDate: string): string {
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Expires today';
  if (days === 1) return 'Expires in 1d';
  return `Expires in ${days}d`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RoleBadge({ role }: { role: 'trainer' | 'member' }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded flex-shrink-0 ${roleBadgeClass[role]}`}>
      {role}
    </span>
  );
}

export function OwnerInvitesPage() {
  const invites = useInvitesStore((s) => s.invites);
  const isLoading = useInvitesStore((s) => s.isLoading);
  const fetchInvites = useInvitesStore((s) => s.fetch);
  const createInviteStore = useInvitesStore((s) => s.createInvite);
  const revokeInviteStore = useInvitesStore((s) => s.revokeInvite);
  const resendInviteStore = useInvitesStore((s) => s.resendInvite);
  const trainers = useTrainersStore((s) => s.trainers);
  const fetchTrainers = useTrainersStore((s) => s.fetchTrainers);

  const [dialogOpen, setDialogOpen] = useReducer((_: boolean, v: boolean) => v, false);
  const [revoking, setRevoking] = useReducer(
    (_: InviteListItem | null, v: InviteListItem | null) => v,
    null,
  );

  const defaultTrainerId = trainers[0]?._id ?? '';
  const [dialogState, dialogDispatch] = useReducer(dialogReducer, {
    role: 'member',
    email: '',
    trainerId: defaultTrainerId,
    saving: false,
    generatedUrl: null,
  });
  const { role, email, trainerId, saving, generatedUrl } = dialogState;

  useEffect(() => { void fetchInvites(); void fetchTrainers(); }, [fetchInvites, fetchTrainers]);

  const pending = useMemo(
    () => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > new Date()),
    [invites],
  );
  const accepted = useMemo(() => invites.filter((inv) => !!inv.usedAt), [invites]);
  const expired = useMemo(
    () => invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= new Date()),
    [invites],
  );

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success('Link copied to clipboard');
  }

  async function handleResend(id: string) {
    try {
      await resendInviteStore(id);
      toast.success('Invite email resent');
    } catch {
      toast.error('Failed to resend invite');
    }
  }

  async function handleRegenerate(id: string) {
    try {
      const result = await resendInviteStore(id);
      if (result.inviteUrl) {
        await navigator.clipboard.writeText(result.inviteUrl).catch(() => undefined);
      }
      toast.success('New link copied to clipboard');
      void fetchInvites();
    } catch {
      toast.error('Failed to regenerate invite');
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    try {
      await revokeInviteStore(revoking._id);
      toast.success('Invite revoked');
    } catch {
      toast.error('Failed to revoke invite');
    } finally {
      setRevoking(null);
    }
  }

  function handleDialogOpen(value: boolean) {
    if (!value) {
      dialogDispatch({ type: 'RESET', defaultTrainerId: trainers[0]?._id ?? '' });
    }
    setDialogOpen(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dialogDispatch({ type: 'SET_SAVING', value: true });
    const payload: { email: string; role: 'trainer' | 'member'; trainerId?: string } = {
      email,
      role,
    };
    if (role === 'member' && trainerId) payload.trainerId = trainerId;

    try {
      const result = await createInviteStore(payload);
      dialogDispatch({ type: 'SET_GENERATED_URL', value: result.inviteUrl });
      toast.success('Invite link generated');
    } catch {
      toast.error('Failed to create invite');
    } finally {
      dialogDispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <div>
      <PageHeader
        title="Invites"
        subtitle={`${pending.length} pending`}
        actions={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Invite
          </button>
        }
      />
      <div className="px-4 sm:px-8 py-7">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
          <StatCard label="Accepted" value={String(accepted.length)} accentColor="success" />
          <StatCard label="Expired" value={String(expired.length)} />
        </div>

        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending */}
            <div>
              <div className="text-[9px] uppercase tracking-[2px] text-primary-light font-semibold mb-3">
                Pending ({pending.length})
              </div>
              {pending.length === 0 ? (
                <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
                  <p className="text-sm text-foreground/40">No pending invites</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pending.map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center gap-3 px-4 py-3 bg-primary/[.03] ring-1 ring-primary/[.1] rounded-xl"
                    >
                      <RoleBadge role={inv.role} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground/85 truncate">{inv.recipientEmail}</div>
                      </div>
                      <span className="text-[10px] text-foreground/65 shrink-0">{expiryLabel(inv.expiresAt)}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyLink(inv.token)}
                          className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-foreground/50 hover:text-foreground/80 hover:bg-white/[.06] transition-colors"
                        >
                          Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResend(inv._id)}
                          className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-foreground/50 hover:text-foreground/80 hover:bg-white/[.06] transition-colors"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevoking(inv)}
                          className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accepted */}
            {accepted.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[2px] text-emerald-400 font-semibold mb-3">
                  Accepted ({accepted.length})
                </div>
                <div className="space-y-1.5">
                  {accepted.map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center gap-3 px-4 py-3 bg-emerald-500/[.03] ring-1 ring-emerald-500/[.1] rounded-xl"
                    >
                      <RoleBadge role={inv.role} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground/85 truncate">{inv.recipientEmail}</div>
                      </div>
                      <span className="text-[10px] text-emerald-400/70 shrink-0">
                        ✓ Joined {formatDate(inv.usedAt!)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired */}
            <div>
              <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold mb-3">
                Expired ({expired.length})
              </div>
              {expired.length === 0 ? (
                <div className="bg-white/[.02] ring-1 ring-white/[.06] rounded-xl p-6 text-center">
                  <p className="text-sm text-foreground/40">No expired invites</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {expired.map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center gap-3 px-4 py-3 bg-white/[.015] ring-1 ring-white/[.05] rounded-xl opacity-60"
                    >
                      <RoleBadge role={inv.role} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground/50 truncate">{inv.recipientEmail}</div>
                      </div>
                      <span className="text-[10px] text-foreground/65 shrink-0">Expired {formatDate(inv.expiresAt)}</span>
                      <button
                        type="button"
                        onClick={() => void handleRegenerate(inv._id)}
                        className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-foreground/40 hover:text-foreground/70 hover:bg-white/[.06] transition-colors shrink-0"
                      >
                        Regenerate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revoke confirm */}
      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The link sent to <strong>{revoking?.recipientEmail}</strong> will no longer work.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Confirm Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New invite dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>New Invite</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
                Role
              </div>
              <div className="flex gap-2">
                {(['member', 'trainer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => dialogDispatch({ type: 'SET_ROLE', value: r })}
                    className={cn(
                      'flex-1 h-9 rounded-lg text-sm font-semibold capitalize transition-all',
                      role === r
                        ? 'bg-primary/20 ring-1 ring-primary/40 text-primary-light'
                        : 'bg-white/[.03] ring-1 ring-white/[.08] text-foreground/40 hover:text-foreground/65',
                    )}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {role === 'member' && trainers.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="invite-trainer"
                  className="text-xs font-semibold uppercase tracking-wide text-foreground/65"
                >
                  Assign to Trainer
                </label>
                <select
                  id="invite-trainer"
                  value={trainerId}
                  onChange={(e) => dialogDispatch({ type: 'SET_TRAINER_ID', value: e.target.value })}
                  className="w-full h-9 rounded-lg bg-white/[.03] ring-1 ring-white/[.08] px-3 text-sm text-foreground/80 focus:outline-none focus:ring-white/20 transition-all"
                >
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="invite-email"
                className="text-xs font-semibold uppercase tracking-wide text-foreground/65"
              >
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => dialogDispatch({ type: 'SET_EMAIL', value: e.target.value })}
                placeholder="member@example.com"
                className="w-full h-9 rounded-lg bg-input ring-1 ring-foreground/10 px-3 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-foreground/25 transition-all"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Generating...' : 'Generate Invite Link'}
              </button>
              <button
                type="button"
                onClick={() => handleDialogOpen(false)}
                className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-foreground/65 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {generatedUrl && (
            <div className="border-t border-foreground/[.06] pt-4 space-y-2">
              <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/35">
                Invite Link
              </div>
              <div className="break-all text-[11px] text-foreground/65 bg-white/[.03] ring-1 ring-white/[.07] rounded-lg px-3 py-2">
                {generatedUrl}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedUrl).catch(() => undefined)}
                className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-foreground/50 hover:text-foreground/80 ring-1 ring-white/[.08] hover:ring-white/20 transition-colors"
              >
                Copy Link
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
