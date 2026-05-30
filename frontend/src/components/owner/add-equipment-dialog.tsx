import { useReducer } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEquipmentStore } from '@/stores/equipmentStore';
import type { EquipmentItem, EquipmentStatus } from '@/api/equipment';
import gymEquipmentCatalog from '@/data/gym_equipment.json';

const CATALOG: { id: string; name: string }[] = (gymEquipmentCatalog as { equipment: { id: string; name: string }[] }).equipment;

export type { EquipmentItem as NewEquipmentItem };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (item: EquipmentItem) => void;
}

interface State {
  name: string;
  brand: string;
  quantity: string;
  status: EquipmentStatus;
  note: string;
  trackCondition: boolean;
  nextServiceDate: string;
  saving: boolean;
  suggestions: { id: string; name: string }[];
}

type Action =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_BRAND'; value: string }
  | { type: 'SET_QUANTITY'; value: string }
  | { type: 'SET_STATUS'; value: EquipmentStatus }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_TRACK_CONDITION'; value: boolean }
  | { type: 'SET_NEXT_SERVICE_DATE'; value: string }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_SUGGESTIONS'; value: { id: string; name: string }[] }
  | { type: 'RESET' };

const initial: State = {
  name: '', brand: '', quantity: '1', status: 'active', note: '',
  trackCondition: false, nextServiceDate: '', saving: false, suggestions: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_BRAND': return { ...state, brand: action.value };
    case 'SET_QUANTITY': return { ...state, quantity: action.value };
    case 'SET_STATUS': return { ...state, status: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_TRACK_CONDITION': return { ...state, trackCondition: action.value };
    case 'SET_NEXT_SERVICE_DATE': return { ...state, nextServiceDate: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_SUGGESTIONS': return { ...state, suggestions: action.value };
    case 'RESET': return initial;
    default: return state;
  }
}

export function AddEquipmentDialog({ open, onClose, onCreated }: Props) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { name, brand, quantity, status, note, trackCondition, nextServiceDate, saving, suggestions } = state;
  const create = useEquipmentStore((s) => s.create);

  function handleClose() {
    dispatch({ type: 'RESET' });
    onClose();
  }

  function handleNameChange(value: string) {
    dispatch({ type: 'SET_NAME', value });
    if (value.trim().length < 2) {
      dispatch({ type: 'SET_SUGGESTIONS', value: [] });
      return;
    }
    const lower = value.toLowerCase();
    dispatch({
      type: 'SET_SUGGESTIONS',
      value: CATALOG.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 8),
    });
  }

  async function handleSave() {
    if (!name.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const created = await create({
        name: name.trim(),
        brand: brand.trim() || null,
        quantity: parseInt(quantity) || 1,
        status: trackCondition ? status : 'active',
        note: note.trim() || null,
        trackCondition,
        nextServiceDate: trackCondition && nextServiceDate ? nextServiceDate : null,
      });
      onCreated(created);
      toast.success('Equipment added');
      handleClose();
    } catch {
      toast.error('Failed to add equipment');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">Add Equipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5 relative">
            <label
              htmlFor="add-eq-name"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
            >
              Name
            </label>
            <Input
              id="add-eq-name"
              aria-label="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setTimeout(() => dispatch({ type: 'SET_SUGGESTIONS', value: [] }), 150)}
              placeholder="Search equipment type…"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-foreground/10 rounded-lg overflow-hidden shadow-xl">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => {
                      dispatch({ type: 'SET_NAME', value: s.name });
                      dispatch({ type: 'SET_SUGGESTIONS', value: [] });
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-foreground/65 hover:bg-muted transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-eq-brand"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Brand <span className="normal-case text-foreground/40">(optional)</span>
              </label>
              <Input
                id="add-eq-brand"
                value={brand}
                onChange={(e) => dispatch({ type: 'SET_BRAND', value: e.target.value })}
                placeholder="e.g. Life Fitness"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-eq-quantity"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Quantity
              </label>
              <Input
                id="add-eq-quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={(e) => dispatch({ type: 'SET_QUANTITY', value: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Track condition status</p>
              <p className="text-[11px] text-foreground/40 mt-0.5">
                Enable for machines, disable for consumables like plates
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={trackCondition}
              aria-label="Track condition status"
              onClick={() => dispatch({ type: 'SET_TRACK_CONDITION', value: !trackCondition })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${trackCondition ? 'bg-foreground' : 'bg-foreground/20'}`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow transition-transform ${trackCondition ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {trackCondition && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="add-eq-status"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Initial Status
                </label>
                <select
                  id="add-eq-status"
                  value={status}
                  onChange={(e) => dispatch({ type: 'SET_STATUS', value: e.target.value as EquipmentStatus })}
                  className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="add-eq-service-date"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Next Service{' '}
                  <span className="normal-case text-foreground/40">(optional)</span>
                </label>
                <Input
                  id="add-eq-service-date"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => dispatch({ type: 'SET_NEXT_SERVICE_DATE', value: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="add-eq-note"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
            >
              Note <span className="normal-case text-foreground/40">(optional)</span>
            </label>
            <Input
              id="add-eq-note"
              value={note}
              onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
              placeholder="Location, condition, etc."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Add Equipment'}
          </Button>
          <Button variant="ghost" onClick={handleClose} className="text-foreground/65">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
