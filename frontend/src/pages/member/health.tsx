import { useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Check, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeader } from '@/components/shared/section-header';
import { useAuthStore } from '@/stores/authStore';
import { useMemberHealthStore } from '@/stores/memberHealthStore';
import type { SerializedInjury } from '@/api/member-hub';

// ─── Labels ───────────────────────────────────────────────────────────────────

const INJURY_TYPE_LABELS: Record<string, string> = {
  acute: 'Acute',
  chronic: 'Chronic',
  post_surgery: 'Post-surgery',
};

const BODY_PART_LABELS: Record<string, string> = {
  knee: 'Knee',
  shoulder: 'Shoulder',
  lower_back: 'Lower Back',
  hip: 'Hip',
  ankle: 'Ankle',
  wrist: 'Wrist',
  neck: 'Neck',
  other: 'Other',
};

const BODY_SIDE_LABELS: Record<string, string> = {
  left: 'Left',
  right: 'Right',
  bilateral: 'Bilateral',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Injury Form ──────────────────────────────────────────────────────────────

interface InjuryFormData {
  title: string;
  injuryType: string;
  bodyPart: string;
  bodySide: string;
  affectedMovements: string;
  memberNotes: string;
}

const EMPTY_FORM: InjuryFormData = {
  title: '',
  injuryType: '',
  bodyPart: '',
  bodySide: '',
  affectedMovements: '',
  memberNotes: '',
};

function injuryToForm(injury: SerializedInjury): InjuryFormData {
  return {
    title: injury.title,
    injuryType: injury.injuryType ?? '',
    bodyPart: injury.bodyPart ?? '',
    bodySide: injury.bodySide ?? '',
    affectedMovements: injury.affectedMovements ?? '',
    memberNotes: injury.memberNotes ?? '',
  };
}

type FormAction =
  | { type: 'SET'; field: keyof InjuryFormData; value: string }
  | { type: 'RESET'; data: InjuryFormData };

function formReducer(state: InjuryFormData, action: FormAction): InjuryFormData {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return action.data;
    default:
      return state;
  }
}

// ─── Injury Sheet ─────────────────────────────────────────────────────────────

function InjurySheet({
  memberId,
  editingInjury,
  open,
  onOpenChange,
}: {
  memberId: string;
  editingInjury: SerializedInjury | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { addInjury, updateInjury } = useMemberHealthStore();
  const [form, dispatch] = useReducer(formReducer, EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      dispatch({ type: 'RESET', data: editingInjury ? injuryToForm(editingInjury) : EMPTY_FORM });
    }
  }, [open, editingInjury]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        injuryType: form.injuryType || null,
        bodyPart: form.bodyPart || null,
        bodySide: form.bodySide || null,
        affectedMovements: form.affectedMovements.trim() || null,
        memberNotes: form.memberNotes.trim() || null,
      };
      if (editingInjury) {
        await updateInjury(memberId, editingInjury._id, payload);
        toast.success('Injury updated');
      } else {
        await addInjury(memberId, payload);
        toast.success('Injury reported');
      }
      onOpenChange(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingInjury ? 'Edit Injury' : 'Report Injury'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4 px-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => dispatch({ type: 'SET', field: 'title', value: e.target.value })}
              placeholder="e.g. Left knee pain"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Type
            </label>
            <Select
              value={form.injuryType}
              onValueChange={(v) => dispatch({ type: 'SET', field: 'injuryType', value: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select --" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INJURY_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Body Part
            </label>
            <Select
              value={form.bodyPart}
              onValueChange={(v) => dispatch({ type: 'SET', field: 'bodyPart', value: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select --" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BODY_PART_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Side
            </label>
            <Select
              value={form.bodySide}
              onValueChange={(v) => dispatch({ type: 'SET', field: 'bodySide', value: v ?? '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select --" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BODY_SIDE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Affected Movements
            </label>
            <Textarea
              value={form.affectedMovements}
              onChange={(e) =>
                dispatch({ type: 'SET', field: 'affectedMovements', value: e.target.value })
              }
              placeholder="e.g. Squats, running"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              My Notes
            </label>
            <Textarea
              value={form.memberNotes}
              onChange={(e) =>
                dispatch({ type: 'SET', field: 'memberNotes', value: e.target.value })
              }
              placeholder="Any additional context..."
              rows={3}
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !form.title.trim()}
            className="w-full"
          >
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {editingInjury ? 'Update' : 'Report'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Injury Section ───────────────────────────────────────────────────────────

interface InjurySectionState {
  sheetOpen: boolean;
  editingInjury: SerializedInjury | undefined;
  confirmDelete: string | null;
  actioning: boolean;
}

type InjurySectionAction =
  | { type: 'OPEN_ADD' }
  | { type: 'OPEN_EDIT'; injury: SerializedInjury }
  | { type: 'CLOSE_SHEET' }
  | { type: 'SET_CONFIRM'; id: string | null }
  | { type: 'SET_ACTIONING'; value: boolean };

function injurySectionReducer(
  state: InjurySectionState,
  action: InjurySectionAction,
): InjurySectionState {
  switch (action.type) {
    case 'OPEN_ADD':
      return { ...state, sheetOpen: true, editingInjury: undefined };
    case 'OPEN_EDIT':
      return { ...state, sheetOpen: true, editingInjury: action.injury };
    case 'CLOSE_SHEET':
      return { ...state, sheetOpen: false, editingInjury: undefined };
    case 'SET_CONFIRM':
      return { ...state, confirmDelete: action.id };
    case 'SET_ACTIONING':
      return { ...state, actioning: action.value };
    default:
      return state;
  }
}

function InjurySection({
  memberId,
  injuries,
}: {
  memberId: string;
  injuries: SerializedInjury[];
}) {
  const { updateInjury, removeInjury } = useMemberHealthStore();
  const [state, dispatch] = useReducer(injurySectionReducer, {
    sheetOpen: false,
    editingInjury: undefined,
    confirmDelete: null,
    actioning: false,
  });

  const { active, resolved } = useMemo(
    () => ({
      active: injuries.filter((i) => i.status === 'active'),
      resolved: injuries.filter((i) => i.status === 'resolved'),
    }),
    [injuries],
  );

  async function handleStatusChange(id: string, status: 'active' | 'resolved') {
    try {
      await updateInjury(memberId, id, { status });
      toast.success(status === 'resolved' ? 'Marked as resolved' : 'Injury reopened');
    } catch {
      toast.error('Failed to update');
    }
  }

  async function handleDelete(id: string) {
    dispatch({ type: 'SET_ACTIONING', value: true });
    try {
      await removeInjury(memberId, id);
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      dispatch({ type: 'SET_ACTIONING', value: false });
      dispatch({ type: 'SET_CONFIRM', id: null });
    }
  }

  function InjuryCard({ injury }: { injury: SerializedInjury }) {
    const isActive = injury.status === 'active';
    return (
      <li className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-foreground">{injury.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {isActive ? 'Active' : 'Resolved'}
              </span>
              {injury.injuryType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-foreground/15 text-foreground/65">
                  {INJURY_TYPE_LABELS[injury.injuryType]}
                </span>
              )}
            </div>
            <p className="text-[11px] text-foreground/65">
              {formatDate(injury.recordedAt)}
              {injury.bodyPart && ` · ${BODY_PART_LABELS[injury.bodyPart]}`}
              {injury.bodySide && ` · ${BODY_SIDE_LABELS[injury.bodySide]}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Edit injury"
              onClick={() => dispatch({ type: 'OPEN_EDIT', injury })}
              className="p-1.5 rounded hover:bg-muted transition-colors text-foreground/65"
            >
              <Pencil className="size-3.5" />
            </button>
            {isActive ? (
              <button
                type="button"
                aria-label="Mark as resolved"
                onClick={() => void handleStatusChange(injury._id, 'resolved')}
                className="p-1.5 rounded hover:bg-muted transition-colors text-emerald-400"
              >
                <Check className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Reopen injury"
                onClick={() => void handleStatusChange(injury._id, 'active')}
                className="p-1.5 rounded hover:bg-muted transition-colors text-foreground/65"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
            {injury.createdByRole === 'member' && (
              <button
                type="button"
                aria-label="Delete injury"
                onClick={() => dispatch({ type: 'SET_CONFIRM', id: injury._id })}
                className="p-1.5 rounded hover:bg-muted transition-colors text-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <section className="px-4 sm:px-8">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader title="Injuries" />
        <Button
          variant="outline"
          size="sm"
          className="text-xs font-medium"
          onClick={() => dispatch({ type: 'OPEN_ADD' })}
        >
          + Report Injury
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No active injuries</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((i) => (
            <InjuryCard key={i._id} injury={i} />
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-foreground/65 hover:text-foreground/80 list-none">
            ▸ Resolved ({resolved.length})
          </summary>
          <ul className="mt-2 space-y-2 opacity-60">
            {resolved.map((i) => (
              <InjuryCard key={i._id} injury={i} />
            ))}
          </ul>
        </details>
      )}

      <InjurySheet
        memberId={memberId}
        editingInjury={state.editingInjury}
        open={state.sheetOpen}
        onOpenChange={(v) => {
          if (!v) dispatch({ type: 'CLOSE_SHEET' });
          else dispatch({ type: 'OPEN_ADD' });
        }}
      />

      {/* Delete confirm */}
      <Dialog
        open={state.confirmDelete !== null}
        onOpenChange={(v) => {
          if (!v) dispatch({ type: 'SET_CONFIRM', id: null });
        }}
      >
        <DialogContent>
          <DialogTitle>Delete injury record?</DialogTitle>
          <p className="text-sm text-foreground/65">This action cannot be undone.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'SET_CONFIRM', id: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={state.actioning}
              onClick={() => state.confirmDelete && void handleDelete(state.confirmDelete)}
            >
              {state.actioning ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── MemberHealthPage ─────────────────────────────────────────────────────────

export function MemberHealthPage() {
  const user = useAuthStore((s) => s.user);
  const { injuries, isLoading, fetchHealth } = useMemberHealthStore();

  useEffect(() => {
    if (user) void fetchHealth(user.id);
  }, [user, fetchHealth]);

  if (!user) return null;

  return (
    <div>
      <div className="px-4 sm:px-8 py-6">
        <h1 className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">My Health</h1>
        <p className="text-xs text-foreground/65 mt-0.5">
          Your injuries, medications, and medical background
        </p>
      </div>

      {isLoading ? (
        <div className="px-4 sm:px-8 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10 pb-10">
          <InjurySection memberId={user.id} injuries={injuries} />
        </div>
      )}
    </div>
  );
}
