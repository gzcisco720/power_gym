import { useEffect, useState } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function OwnerEquipmentPage() {
  const { equipment, conditionReports, fetchEquipment, createEquipment, deleteEquipment, fetchConditionReports, addConditionReport, isLoading } = useEquipmentStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingReportsId, setViewingReportsId] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createEquipment({ name });
      toast.success('Equipment added');
      setShowAddForm(false);
      setName('');
    } catch {
      toast.error('Failed to add equipment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewReports(id: string) {
    setViewingReportsId(id);
    await fetchConditionReports(id);
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    if (!viewingReportsId) return;
    setReportSubmitting(true);
    try {
      await addConditionReport(viewingReportsId, { note: reportNote });
      toast.success('Report added');
      setReportNote('');
    } catch {
      toast.error('Failed to add report');
    } finally {
      setReportSubmitting(false);
    }
  }

  if (isLoading && equipment.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Equipment</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          Add Equipment
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Add Equipment</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div>
              <label htmlFor="eq-name" className="text-xs text-foreground/80">Name</label>
              <input
                id="eq-name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-2 text-sm text-foreground/65"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {equipment.map((eq) => (
          <div key={eq._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{eq.name}</p>
                <p className="text-xs text-foreground/65">{eq.status}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleViewReports(eq._id)}
                  className="rounded px-2 py-1 text-xs text-foreground/65 ring-1 ring-foreground/10 hover:ring-foreground/25"
                >
                  Condition Reports
                </button>
                <button
                  onClick={() => setDeleteId(eq._id)}
                  className="rounded px-2 py-1 text-xs text-destructive ring-1 ring-foreground/10 hover:ring-destructive/40"
                >
                  Delete
                </button>
              </div>
            </div>

            {viewingReportsId === eq._id && (
              <div className="mt-3 border-t border-foreground/10 pt-3">
                <h3 className="mb-2 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Condition Reports</h3>
                <div className="space-y-1.5 mb-3">
                  {(conditionReports[eq._id] ?? []).map((r) => (
                    <div key={r._id} className="rounded-lg bg-background px-3 py-2 text-sm text-foreground">
                      {r.note}
                    </div>
                  ))}
                  {(conditionReports[eq._id] ?? []).length === 0 && (
                    <p className="text-xs text-foreground/65">No reports yet.</p>
                  )}
                </div>
                <form onSubmit={(e) => void handleAddReport(e)} className="flex gap-2">
                  <input
                    name="note"
                    required
                    placeholder="Note (e.g. Good condition)"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="flex-1 rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
                  />
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Add Report
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
        {equipment.length === 0 && !showAddForm && (
          <p className="text-sm text-foreground/65">No equipment yet.</p>
        )}
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete equipment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                void deleteEquipment(deleteId!).then(() => {
                  toast.success('Equipment deleted');
                  setDeleteId(null);
                }).catch(() => {
                  toast.error('Failed to delete equipment');
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
