import { useEffect, useReducer } from 'react';
import { m } from 'framer-motion';
import { Clock, DollarSign, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useServiceTypesStore } from '@/stores/serviceTypesStore';
import type { ServiceType } from '@/stores/serviceTypesStore';
import { variants } from '@/lib/animations/variants';

// ─── ServiceTypeDialog ────────────────────────────────────────────────────────

interface ServiceTypeDialogProps {
  open: boolean;
  serviceType?: ServiceType;
  onSuccess: () => void;
  onClose: () => void;
}

interface DialogState {
  name: string;
  durationMin: string;
  pricePerSession: string;
  note: string;
  loading: boolean;
  error: string;
}

type DialogAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DURATION'; value: string }
  | { type: 'SET_PRICE'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ERROR'; value: string };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DURATION': return { ...state, durationMin: action.value };
    case 'SET_PRICE': return { ...state, pricePerSession: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    default: return state;
  }
}

function ServiceTypeDialog({ open, serviceType, onSuccess, onClose }: ServiceTypeDialogProps) {
  const isEdit = !!serviceType;
  const { create, update } = useServiceTypesStore();
  const [state, dispatch] = useReducer(dialogReducer, undefined, () => ({
    name: serviceType?.name ?? '',
    durationMin: String(serviceType?.durationMin ?? 60),
    pricePerSession: String(serviceType?.pricePerSession ?? ''),
    note: serviceType?.note ?? '',
    loading: false,
    error: '',
  }));
  const { name, durationMin, pricePerSession, note, loading, error } = state;

  async function handleSubmit() {
    if (!name.trim()) { dispatch({ type: 'SET_ERROR', value: 'Name is required' }); return; }
    const dur = Number(durationMin);
    const price = Number(pricePerSession);
    if (!dur || dur < 1) { dispatch({ type: 'SET_ERROR', value: 'Duration must be at least 1 minute' }); return; }
    if (isNaN(price) || price < 0) { dispatch({ type: 'SET_ERROR', value: 'Price must be a non-negative number' }); return; }

    dispatch({ type: 'SET_ERROR', value: '' });
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      if (isEdit) {
        await update(serviceType._id, {
          name: name.trim(),
          durationMin: dur,
          pricePerSession: price,
          note: note.trim() || null,
        });
      } else {
        await create({
          name: name.trim(),
          durationMin: dur,
          pricePerSession: price,
          note: note.trim() || null,
        });
      }
      onSuccess();
      onClose();
    } catch {
      dispatch({ type: 'SET_ERROR', value: 'Failed to save' });
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }

  async function handleToggleActive() {
    if (!serviceType) return;
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      await update(serviceType._id, { isActive: !serviceType.isActive });
      onSuccess();
      onClose();
    } catch {
      dispatch({ type: 'SET_ERROR', value: 'Failed to update' });
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service Type' : 'Add Service Type'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="stName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Name</label>
            <Input
              id="stName"
              className="mt-1"
              value={name}
              onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
              placeholder="1hr Personal Training"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="stDur" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Duration (min)</label>
              <Input
                id="stDur"
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={durationMin}
                onChange={(e) => dispatch({ type: 'SET_DURATION', value: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="stPrice" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Price (AUD)</label>
              <Input
                id="stPrice"
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={pricePerSession}
                onChange={(e) => dispatch({ type: 'SET_PRICE', value: e.target.value })}
                placeholder="300"
              />
            </div>
          </div>

          <div>
            <label htmlFor="stNote" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Note <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
            </label>
            <Textarea
              id="stNote"
              className="mt-1 resize-none"
              rows={3}
              value={note}
              onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
              placeholder="e.g. Includes program design and session recap"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEdit && (
            <Button
              variant="ghost"
              onClick={() => void handleToggleActive()}
              disabled={loading}
              className="sm:mr-auto text-foreground/40"
            >
              {serviceType.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-foreground/65">Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Services Page ────────────────────────────────────────────────────────────

interface PageState {
  dialogOpen: boolean;
  editing: ServiceType | undefined;
}

type PageAction =
  | { type: 'OPEN_CREATE' }
  | { type: 'OPEN_EDIT'; serviceType: ServiceType }
  | { type: 'CLOSE_DIALOG' };

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'OPEN_CREATE': return { dialogOpen: true, editing: undefined };
    case 'OPEN_EDIT': return { dialogOpen: true, editing: action.serviceType };
    case 'CLOSE_DIALOG': return { ...state, dialogOpen: false };
    default: return state;
  }
}

export function OwnerServicesPage() {
  const { serviceTypes, isLoading, fetch } = useServiceTypesStore();
  const [{ dialogOpen, editing }, dispatch] = useReducer(pageReducer, { dialogOpen: false, editing: undefined });

  useEffect(() => { void fetch(); }, [fetch]);

  const active = serviceTypes.filter((st) => st.isActive);
  const inactive = serviceTypes.filter((st) => !st.isActive);
  const currency = active[0]?.currency ?? 'AUD';
  const avgPrice = active.length
    ? Math.round(active.reduce((s, st) => s + st.pricePerSession, 0) / active.length)
    : 0;
  const priceRange = active.length
    ? { min: Math.min(...active.map((st) => st.pricePerSession)), max: Math.max(...active.map((st) => st.pricePerSession)) }
    : null;

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage session types and pricing for your gym"
        actions={
          <Button onClick={() => dispatch({ type: 'OPEN_CREATE' })} className="gap-1.5">
            <Plus className="size-3.5" />
            Add Service
          </Button>
        }
      />

      <div className="px-4 sm:px-8 py-7">
        {!isLoading && serviceTypes.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Layers className="size-4 text-primary-light" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground leading-none">{active.length}</div>
                <div className="text-[11px] text-foreground/65 mt-0.5">Active services</div>
              </div>
            </div>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <DollarSign className="size-4 text-primary-light" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground leading-none">
                  {priceRange ? (priceRange.min === priceRange.max ? `${currency} ${priceRange.min}` : `${currency} ${priceRange.min}–${priceRange.max}`) : '—'}
                </div>
                <div className="text-[11px] text-foreground/65 mt-0.5">Price range</div>
              </div>
            </div>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Clock className="size-4 text-primary-light" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground leading-none">{currency} {avgPrice}</div>
                <div className="text-[11px] text-foreground/65 mt-0.5">Average price</div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-[110px] bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : serviceTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Layers className="size-6 text-primary-light" />
            </div>
            <p className="text-sm font-medium text-foreground">No service types yet</p>
            <p className="text-xs text-foreground/65 mt-1 mb-4">Create your first service to start tracking session billing.</p>
            <Button onClick={() => dispatch({ type: 'OPEN_CREATE' })} variant="outline" size="sm" className="gap-1.5">
              <Plus className="size-3.5" />
              Add Service
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-2">Active ({active.length})</div>
                <m.div
                  variants={variants.staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                >
                  {active.map((st) => (
                    <m.div
                      key={st._id}
                      variants={variants.staggerItem}
                      onClick={() => dispatch({ type: 'OPEN_EDIT', serviceType: st })}
                      className="group relative rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-primary/40 hover:bg-primary/[.03] transition-all duration-150 cursor-pointer p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground leading-snug">{st.name}</span>
                        <span className="shrink-0 text-[11px] font-medium text-foreground/65 bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{st.durationMin} min</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary-light tracking-tight">{st.pricePerSession.toLocaleString()}</span>
                        <span className="text-xs text-foreground/65">{st.currency} / session</span>
                      </div>
                      <div className="text-[11px] text-foreground/40 group-hover:text-foreground/65 transition-colors line-clamp-2 leading-relaxed">
                        {st.note ?? 'Click to edit'}
                      </div>
                    </m.div>
                  ))}
                </m.div>
              </div>
            )}

            {inactive.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-2">Inactive ({inactive.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {inactive.map((st) => (
                    <button
                      type="button"
                      key={st._id}
                      onClick={() => dispatch({ type: 'OPEN_EDIT', serviceType: st })}
                      className="rounded-xl bg-card ring-1 ring-foreground/[.06] opacity-45 hover:opacity-70 transition-opacity cursor-pointer p-4 flex flex-col gap-3 text-left w-full"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground/65 leading-snug">{st.name}</span>
                        <span className="shrink-0 text-[11px] font-medium text-foreground/40 bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{st.durationMin} min</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground/40 tracking-tight">{st.pricePerSession.toLocaleString()}</span>
                        <span className="text-xs text-foreground/40">{st.currency} / session</span>
                      </div>
                      <div className="text-[11px] text-foreground/30">Click to reactivate</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ServiceTypeDialog
        key={editing?._id ?? 'create'}
        open={dialogOpen}
        serviceType={editing}
        onSuccess={() => void fetch()}
        onClose={() => dispatch({ type: 'CLOSE_DIALOG' })}
      />
    </div>
  );
}
