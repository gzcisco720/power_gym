import { useEffect, useReducer } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Clock, DollarSign, Layers, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useBillingStore } from '@/stores/billingStore';
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

interface ServicesPageState {
  showAdd: boolean;
  addName: string;
  addDuration: string;
  addPrice: string;
  addNote: string;
  addSubmitting: boolean;
  deleteId: string | null;
  deleteSubmitting: boolean;
}

type ServicesPageAction =
  | { type: 'OPEN_ADD' }
  | { type: 'CLOSE_ADD' }
  | { type: 'SET_ADD_NAME'; value: string }
  | { type: 'SET_ADD_DURATION'; value: string }
  | { type: 'SET_ADD_PRICE'; value: string }
  | { type: 'SET_ADD_NOTE'; value: string }
  | { type: 'SET_ADD_SUBMITTING'; value: boolean }
  | { type: 'SET_DELETE_ID'; id: string | null }
  | { type: 'SET_DELETE_SUBMITTING'; value: boolean };

function reducer(state: ServicesPageState, action: ServicesPageAction): ServicesPageState {
  switch (action.type) {
    case 'OPEN_ADD': return { ...state, showAdd: true, addName: '', addDuration: '60', addPrice: '', addNote: '' };
    case 'CLOSE_ADD': return { ...state, showAdd: false, addName: '', addDuration: '60', addPrice: '', addNote: '' };
    case 'SET_ADD_NAME': return { ...state, addName: action.value };
    case 'SET_ADD_DURATION': return { ...state, addDuration: action.value };
    case 'SET_ADD_PRICE': return { ...state, addPrice: action.value };
    case 'SET_ADD_NOTE': return { ...state, addNote: action.value };
    case 'SET_ADD_SUBMITTING': return { ...state, addSubmitting: action.value };
    case 'SET_DELETE_ID': return { ...state, deleteId: action.id };
    case 'SET_DELETE_SUBMITTING': return { ...state, deleteSubmitting: action.value };
    default: return state;
  }
}

export function OwnerServicesPage() {
  const { serviceTypes, isLoading, fetchServiceTypes, createServiceType, deleteServiceType } =
    useBillingStore();
  const shouldReduceMotion = useReducedMotion();

  const [state, dispatch] = useReducer(reducer, {
    showAdd: false,
    addName: '',
    addDuration: '60',
    addPrice: '',
    addNote: '',
    addSubmitting: false,
    deleteId: null,
    deleteSubmitting: false,
  });

  useEffect(() => {
    void fetchServiceTypes();
  }, [fetchServiceTypes]);

  async function handleCreate() {
    const name = state.addName.trim();
    const durationMin = Number(state.addDuration);
    const pricePerSession = Number(state.addPrice);
    if (!name || !durationMin || !pricePerSession) return;
    dispatch({ type: 'SET_ADD_SUBMITTING', value: true });
    try {
      await createServiceType({
        name,
        durationMin,
        pricePerSession,
        note: state.addNote.trim() || undefined,
      });
      toast.success('Service created');
      dispatch({ type: 'CLOSE_ADD' });
    } catch {
      toast.error('Failed to create service');
    } finally {
      dispatch({ type: 'SET_ADD_SUBMITTING', value: false });
    }
  }

  async function handleDelete() {
    if (!state.deleteId) return;
    dispatch({ type: 'SET_DELETE_SUBMITTING', value: true });
    try {
      await deleteServiceType(state.deleteId);
      toast.success('Service deleted');
      dispatch({ type: 'SET_DELETE_ID', id: null });
    } catch {
      toast.error('Failed to delete service');
      dispatch({ type: 'SET_DELETE_ID', id: null });
    } finally {
      dispatch({ type: 'SET_DELETE_SUBMITTING', value: false });
    }
  }

  const currency = serviceTypes[0]?.currency ?? 'AUD';
  const active = serviceTypes.filter((s) => s.isActive);

  const addActions = (
    <Button size="sm" onClick={() => dispatch({ type: 'OPEN_ADD' })}>
      <Plus className="size-3.5" />
      Add Service
    </Button>
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title="Services"
        subtitle="Manage session types and pricing"
        actions={addActions}
      />

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {/* Stats strip */}
        {!isLoading && serviceTypes.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="size-3.5 text-primary-light" />
              </div>
              <div>
                <div className="text-[18px] font-semibold leading-none">{active.length}</div>
                <div className="text-[11px] text-foreground/65 mt-0.5">Active</div>
              </div>
            </div>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="size-3.5 text-primary-light" />
              </div>
              <div>
                <div className="text-[18px] font-semibold leading-none">
                  {active.length
                    ? `${currency} ${Math.min(...active.map((s) => s.pricePerSession))}`
                    : '—'}
                </div>
                <div className="text-[11px] text-foreground/65 mt-0.5">From</div>
              </div>
            </div>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="size-3.5 text-primary-light" />
              </div>
              <div>
                <div className="text-[18px] font-semibold leading-none">
                  {active.length
                    ? `${Math.round(active.reduce((s, st) => s + st.pricePerSession, 0) / active.length)}`
                    : '—'}
                </div>
                <div className="text-[11px] text-foreground/65 mt-0.5">Avg price</div>
              </div>
            </div>
          </div>
        )}

        {isLoading && serviceTypes.length === 0 ? (
          <StatCardsSkeleton count={3} className="grid-cols-1 sm:grid-cols-3" />
        ) : serviceTypes.length === 0 ? (
          <EmptyState
            heading="No services yet"
            description="Create your first service type to start tracking session billing."
            action={
              <Button size="sm" onClick={() => dispatch({ type: 'OPEN_ADD' })}>
                <Plus className="size-3.5" />
                Add Service
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
            {serviceTypes.map((st) => (
              <m.div
                key={st._id}
                variants={!shouldReduceMotion ? variants.staggerItem : undefined}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{st.name}</p>
                  <p className="text-xs text-foreground/65">
                    {st.durationMin} min · {st.currency} {st.pricePerSession} / session
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_DELETE_ID', id: st._id })}
                  className="text-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  Delete
                </Button>
              </m.div>
            ))}
          </m.div>
        )}
      </div>

      {/* Add Service Dialog */}
      <Dialog
        open={state.showAdd}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_ADD' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="svc-name"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="svc-name"
                aria-label="Name"
                value={state.addName}
                onChange={(e) => dispatch({ type: 'SET_ADD_NAME', value: e.target.value })}
                placeholder="e.g. Personal Training"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="svc-duration"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Duration (min) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="svc-duration"
                  aria-label="Duration (min)"
                  type="text"
                  inputMode="decimal"
                  value={state.addDuration}
                  onChange={(e) => dispatch({ type: 'SET_ADD_DURATION', value: e.target.value })}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="svc-price"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Price / session <span className="text-destructive">*</span>
                </label>
                <Input
                  id="svc-price"
                  aria-label="Price per session"
                  type="text"
                  inputMode="decimal"
                  value={state.addPrice}
                  onChange={(e) => dispatch({ type: 'SET_ADD_PRICE', value: e.target.value })}
                  placeholder="120"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="svc-note"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Note{' '}
                <span className="normal-case text-foreground/40">(optional)</span>
              </label>
              <Input
                id="svc-note"
                value={state.addNote}
                onChange={(e) => dispatch({ type: 'SET_ADD_NOTE', value: e.target.value })}
                placeholder="Description of this service"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_ADD' })}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={
                state.addSubmitting ||
                !state.addName.trim() ||
                !state.addDuration ||
                !state.addPrice
              }
            >
              Create Service
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
            <DialogTitle>Delete service?</DialogTitle>
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
