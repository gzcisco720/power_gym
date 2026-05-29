import { useEffect, useState } from 'react';
import { useUsersStore } from '@/stores/usersStore';
import { toast } from 'sonner';

export function OwnerInvitesPage() {
  const { invites, trainers, fetchOwnerInvites, fetchTrainers, createInvite, isLoading } = useUsersStore();
  const [showForm, setShowForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [role, setRole] = useState<'trainer' | 'member'>('member');
  const [trainerId, setTrainerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchOwnerInvites();
    void fetchTrainers();
  }, [fetchOwnerInvites, fetchTrainers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInvite({ recipientEmail, role, trainerId: role === 'member' && trainerId ? trainerId : undefined });
      toast.success('Invite sent');
      setShowForm(false);
      setRecipientEmail('');
      setRole('member');
      setTrainerId('');
    } catch {
      toast.error('Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && invites.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Invites</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          Invite
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Send Invite</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div>
              <label htmlFor="recipientEmail" className="text-xs text-foreground/80">Email</label>
              <input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div>
              <label htmlFor="role" className="text-xs text-foreground/80">Role</label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'trainer' | 'member')}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              >
                <option value="member">Member</option>
                <option value="trainer">Trainer</option>
              </select>
            </div>
            {role === 'member' && trainers.length > 0 && (
              <div>
                <label htmlFor="trainerId" className="text-xs text-foreground/80">Trainer (optional)</label>
                <select
                  id="trainerId"
                  name="trainerId"
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
                >
                  <option value="">No trainer</option>
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send Invite
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-sm text-foreground/65"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {invites.map((inv) => (
          <div key={inv._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{inv.recipientEmail}</p>
            <p className="text-xs text-foreground/65">{inv.role} · {inv.usedAt ? 'Used' : 'Pending'}</p>
          </div>
        ))}
        {invites.length === 0 && !showForm && (
          <p className="text-sm text-foreground/65">No invites yet.</p>
        )}
      </div>
    </div>
  );
}
