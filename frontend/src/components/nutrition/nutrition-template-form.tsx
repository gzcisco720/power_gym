import { useMemo, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NutritionFormPayload {
  name: string;
  description: string | null;
}

interface Props {
  initialData?: NutritionFormPayload;
  onSubmit: (data: NutritionFormPayload) => Promise<void>;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  description: string;
  saving: boolean;
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DESCRIPTION': return { ...state, description: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// NutritionTemplateForm
// ---------------------------------------------------------------------------

export function NutritionTemplateForm({ initialData, onSubmit, onCancel }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    saving: false,
  });
  const { name, description, saving } = state;

  const initialSnapshot = useMemo(
    () => JSON.stringify({ name: initialData?.name ?? '', description: initialData?.description ?? '' }),
    [initialData],
  );

  const isDirty = useMemo(
    () => JSON.stringify({ name, description }) !== initialSnapshot,
    [name, description, initialSnapshot],
  );

  const isEditMode = Boolean(initialData);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null });
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24 max-w-3xl mx-auto px-4 sm:px-8 py-5">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="tpl-name"
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 block"
          >
            Plan Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
            required
            placeholder="e.g. Off Season Bulk"
            className="text-base font-semibold"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="tpl-desc"
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 block"
          >
            Description <span className="text-foreground/65 normal-case tracking-normal">(optional)</span>
          </label>
          <Textarea
            id="tpl-desc"
            value={description}
            onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', value: e.target.value })}
            rows={2}
            placeholder="Optional notes about this plan…"
          />
        </div>
      </div>

      <p className="text-xs text-foreground/65 px-1">
        Nutrition day types, meals, and food items can be added after creation.
      </p>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 px-4 sm:px-8 py-3 border-t border-foreground/10 backdrop-blur-md bg-background/50 -mx-4 sm:-mx-8">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="text-foreground/65"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || !name.trim() || (isEditMode && !isDirty)}
          className="ml-auto"
        >
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
      </div>
    </form>
  );
}
