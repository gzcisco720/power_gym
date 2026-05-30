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
import { useTrainerInvitesStore } from '@/stores/trainerInvitesStore';
import type { TrainerInviteListItem } from '@/api/trainer-invites';

interface DialogState {
  email: string;
  saving: boolean;
  generatedUrl: string | null;
}

type DialogAction =
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_GENERATED_URL'; value: string | null }
  | { type: 'RESET' };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'SET_EMAIL': return { ...state, email: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_GENERATED_URL': return { ...state, generatedUrl: action.value };
    case 'RESET': return { email: '', saving: false, generatedUrl: null };
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

export function TrainerInvitesPage() {
  const invites = useTrainerInvitesStore((s) => s.invites);
  const isLoading = useTrainerInvitesStore((s) => s.isLoading);
  const fetchInvites = useTrainerInvitesStore((s) => s.fetch);
  const createInviteStore = useTrainerInvitesStore((s) => s.createInvite);
  const revokeInviteStore = useTrainerInvitesStore((s) => s.revokeInvite);
  const resendInviteStore = useTrainerInvitesStore((s) => s.resendInvite);

  const [dialogOpen, setDialogOpen] = useReducer((_: boolean, v: boolean) => v, false);
  const [revoking, setRevoking] = useReducer(
    (_: TrainerInviteListItem | null, v: TrainerInviteListItem | null) => v,
    null,
  );
  const [dialogState, dialogDispatch] = useReducer(dialogReducer, {
    email: '',
    saving: false,
    generatedUrl: null,
  });
  const { email, saving, generatedUrl } = dialogState;

  useEffect(() => { void fetchInvites(); }, [fetchInvites]);

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
    if (!value) dialogDispatch({ type: 'RESET' });
    setDialogOpen(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dialogDispatch({ type: 'SET_SAVING', value: true });
    try {
      const result = await createInviteStore({ email });
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
            + Invite Member
          </button>
        }
      />
      <div className="px-4 sm:px-8 py-7">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="Pending" value={String(pending.length)} accentColor="primary" />
          <StatCard label="Accepted" value={String(accepted.length)} accentColor="success" />
        </div>

        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
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
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground/85 truncate">{inv.recipientEmail}</div>
                      </div>
                      <span className="text-[10px] text-emerald-400/70 shrink-0">
                        Joined {formatDate(inv.usedAt!)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired */}
            {expired.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[2px] text-foreground/25 font-semibold mb-3">
                  Expired ({expired.length})
                </div>
                <div className="space-y-1.5">
                  {expired.map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center gap-3 px-4 py-3 bg-white/[.015] ring-1 ring-white/[.05] rounded-xl opacity-60"
                    >
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
              </div>
            )}
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
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="invite-email"
                className="text-xs font-semibold uppercase tracking-wide text-foreground/65"
              >
                Member Email
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
