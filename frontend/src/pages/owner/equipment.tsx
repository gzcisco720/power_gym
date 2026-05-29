import { useEffect, useReducer } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Plus, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { variants } from '@/lib/animations/variants';

interface EquipmentPageState {
  showAdd: boolean;
  addName: string;
  addNote: string;
  addSubmitting: boolean;
  deleteId: string | null;
  deleteSubmitting: boolean;
}

type EquipmentPageAction =
  | { type: 'OPEN_ADD' }
  | { type: 'CLOSE_ADD' }
  | { type: 'SET_ADD_NAME'; value: string }
  | { type: 'SET_ADD_NOTE'; value: string }
  | { type: 'SET_ADD_SUBMITTING'; value: boolean }
  | { type: 'SET_DELETE_ID'; id: string | null }
  | { type: 'SET_DELETE_SUBMITTING'; value: boolean };

function reducer(state: EquipmentPageState, action: EquipmentPageAction): EquipmentPageState {
  switch (action.type) {
    case 'OPEN_ADD': return { ...state, showAdd: true, addName: '', addNote: '' };
    case 'CLOSE_ADD': return { ...state, showAdd: false, addName: '', addNote: '' };
    case 'SET_ADD_NAME': return { ...state, addName: action.value };
    case 'SET_ADD_NOTE': return { ...state, addNote: action.value };
    case 'SET_ADD_SUBMITTING': return { ...state, addSubmitting: action.value };
    case 'SET_DELETE_ID': return { ...state, deleteId: action.id };
    case 'SET_DELETE_SUBMITTING': return { ...state, deleteSubmitting: action.value };
    default: return state;
  }
}

const STATUS_COLOURS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  maintenance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  retired: 'bg-foreground/5 text-foreground/40 border-foreground/10',
};

export function OwnerEquipmentPage() {
  const { equipment, isLoading, fetchEquipment, createEquipment, deleteEquipment } =
    useEquipmentStore();
  const shouldReduceMotion = useReducedMotion();

  const [state, dispatch] = useReducer(reducer, {
    showAdd: false,
    addName: '',
    addNote: '',
    addSubmitting: false,
    deleteId: null,
    deleteSubmitting: false,
  });

  useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  async function handleAdd() {
    if (!state.addName.trim()) return;
    dispatch({ type: 'SET_ADD_SUBMITTING', value: true });
    try {
      await createEquipment({ name: state.addName.trim(), note: state.addNote.trim() || undefined });
      toast.success('Equipment added');
      dispatch({ type: 'CLOSE_ADD' });
    } catch {
      toast.error('Failed to add equipment');
    } finally {
      dispatch({ type: 'SET_ADD_SUBMITTING', value: false });
    }
  }

  async function handleDelete() {
    if (!state.deleteId) return;
    dispatch({ type: 'SET_DELETE_SUBMITTING', value: true });
    try {
      await deleteEquipment(state.deleteId);
      toast.success('Equipment deleted');
      dispatch({ type: 'SET_DELETE_ID', id: null });
    } catch {
      toast.error('Failed to delete equipment');
      dispatch({ type: 'SET_DELETE_ID', id: null });
    } finally {
      dispatch({ type: 'SET_DELETE_SUBMITTING', value: false });
    }
  }

  const addActions = (
    <Button size="sm" onClick={() => dispatch({ type: 'OPEN_ADD' })}>
      <Plus className="size-3.5" />
      Add Equipment
    </Button>
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title="Equipment"
        subtitle={`${equipment.length} item${equipment.length !== 1 ? 's' : ''}`}
        actions={addActions}
      />

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {isLoading && equipment.length === 0 ? (
          <StatCardsSkeleton count={4} className="grid-cols-1 sm:grid-cols-2" />
        ) : equipment.length === 0 ? (
          <EmptyState
            heading="No equipment yet"
            description="Add your first piece of equipment to start tracking condition and maintenance."
            action={
              <Button size="sm" onClick={() => dispatch({ type: 'OPEN_ADD' })}>
                <Plus className="size-3.5" />
                Add Equipment
              </Button>
            }
          />
        ) : (
          <m.div
            variants={!shouldReduceMotion ? variants.staggerContainer : undefined}
            initial="hidden"
            animate="visible"
            className="space-y-1.5"
          >
            {equipment.map((eq) => (
              <m.div
                key={eq._id}
                variants={!shouldReduceMotion ? variants.staggerItem : undefined}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Wrench className="size-3.5 text-primary-light" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{eq.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[eq.status] ?? STATUS_COLOURS.active}`}
                      >
                        {eq.status}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_DELETE_ID', id: eq._id })}
                  className="text-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  Delete
                </Button>
              </m.div>
            ))}
          </m.div>
        )}
      </div>

      {/* Add Equipment Dialog */}
      <Dialog
        open={state.showAdd}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_ADD' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="add-eq-name"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="add-eq-name"
                aria-label="Name"
                value={state.addName}
                onChange={(e) => dispatch({ type: 'SET_ADD_NAME', value: e.target.value })}
                placeholder="e.g. Barbell"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-eq-note"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Note{' '}
                <span className="normal-case text-foreground/40">(optional)</span>
              </label>
              <Input
                id="add-eq-note"
                value={state.addNote}
                onChange={(e) => dispatch({ type: 'SET_ADD_NOTE', value: e.target.value })}
                placeholder="Location, condition, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_ADD' })}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleAdd()}
              disabled={state.addSubmitting || !state.addName.trim()}
            >
              Add Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={state.deleteId !== null}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'SET_DELETE_ID', id: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete equipment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">This action cannot be undone.</p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'SET_DELETE_ID', id: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={state.deleteSubmitting}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LazyMotion>
  );
}
