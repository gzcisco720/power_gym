import { useEffect, useState } from 'react';
import { useBillingStore } from '@/stores/billingStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function OwnerServicesPage() {
  const { serviceTypes, fetchServiceTypes, createServiceType, deleteServiceType, isLoading } = useBillingStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [pricePerSession, setPricePerSession] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void fetchServiceTypes();
  }, [fetchServiceTypes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createServiceType({ name, durationMin: Number(durationMin), pricePerSession: Number(pricePerSession) });
      toast.success('Service type created');
      setShowForm(false);
      setName('');
      setDurationMin('60');
      setPricePerSession('');
    } catch {
      toast.error('Failed to create service type');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && serviceTypes.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Service Types</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          New Service
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">New Service Type</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div>
              <label htmlFor="name" className="text-xs text-foreground/80">Name</label>
              <input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div>
              <label htmlFor="durationMin" className="text-xs text-foreground/80">Duration (min)</label>
              <input
                id="durationMin"
                name="durationMin"
                type="text"
                inputMode="decimal"
                required
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div>
              <label htmlFor="pricePerSession" className="text-xs text-foreground/80">Price per session</label>
              <input
                id="pricePerSession"
                name="pricePerSession"
                type="text"
                inputMode="decimal"
                required
                value={pricePerSession}
                onChange={(e) => setPricePerSession(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Create
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
        {serviceTypes.map((st) => (
          <div key={st._id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div>
              <p className="text-sm font-medium text-foreground">{st.name}</p>
              <p className="text-xs text-foreground/65">{st.durationMin} min · ${st.pricePerSession}</p>
            </div>
            <button
              onClick={() => setDeleteId(st._id)}
              className="rounded px-2 py-1 text-xs text-destructive ring-1 ring-foreground/10 hover:ring-destructive/40"
            >
              Delete
            </button>
          </div>
        ))}
        {serviceTypes.length === 0 && !showForm && (
          <p className="text-sm text-foreground/65">No service types yet.</p>
        )}
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete service type?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                void deleteServiceType(deleteId!).then(() => {
                  toast.success('Service type deleted');
                  setDeleteId(null);
                }).catch(() => {
                  toast.error('Failed to delete');
                  setDeleteId(null);
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
