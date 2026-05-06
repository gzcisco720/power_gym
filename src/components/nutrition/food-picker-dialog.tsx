'use client';
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FoodPicker, computePickedFood, useMacroPreview } from '@/components/nutrition/food-picker';
import type { FoodEntry, PickedFood } from '@/components/nutrition/food-picker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoodPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = trainer/template context — hides the Recent tab */
  memberId: string | null;
  onSelect: (item: PickedFood) => void;
  onCreateNewHref?: string;
}

type DialogView = 'list' | 'detail';

// ---------------------------------------------------------------------------
// Detail view — shown inside the Dialog when a food row is clicked
// ---------------------------------------------------------------------------

interface DetailViewProps {
  entry: FoodEntry;
  onBack: () => void;
  onAdd: (picked: PickedFood) => void;
}

function DetailView({ entry, onBack, onAdd }: DetailViewProps) {
  const [servingId, setServingId] = useState(entry.defaultServingId);
  const [qty, setQty] = useState(1);

  const preview = useMacroPreview(entry, servingId, qty);
  const displayName = entry.brand ? `${entry.brand} ${entry.name}` : entry.name;

  function handleAdd(): void {
    const picked = computePickedFood(entry, servingId, qty);
    onAdd(picked);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          ← Back
        </Button>
        <span className="font-semibold text-sm flex-1 truncate">{displayName}</span>
      </div>

      <div className="space-y-3">
        {/* Serving picker */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Serving</label>
          <Select value={servingId} onValueChange={(v) => { if (v !== null) setServingId(v); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entry.servings.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Quantity</label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            aria-label="Quantity"
          />
        </div>

        {/* Live macro preview */}
        {preview && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="font-semibold text-foreground tabular-nums">{preview.kcal.toFixed(0)}</div>
                <div className="text-xs">kcal</div>
              </div>
              <div>
                <div className="font-semibold text-foreground tabular-nums">{preview.protein.toFixed(1)}g</div>
                <div className="text-xs">protein</div>
              </div>
              <div>
                <div className="font-semibold text-foreground tabular-nums">{preview.carbs.toFixed(1)}g</div>
                <div className="text-xs">carbs</div>
              </div>
              <div>
                <div className="font-semibold text-foreground tabular-nums">{preview.fat.toFixed(1)}g</div>
                <div className="text-xs">fat</div>
              </div>
            </div>
          </div>
        )}

        <Button className="w-full" onClick={handleAdd} disabled={!preview || qty <= 0}>
          + Add to meal
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FoodPickerDialog — public component
// ---------------------------------------------------------------------------

export function FoodPickerDialog({
  open,
  onOpenChange,
  memberId,
  onSelect,
  onCreateNewHref,
}: FoodPickerDialogProps) {
  const [view, setView] = useState<DialogView>('list');
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        // Reset internal state when dialog closes
        setView('list');
        setSelectedEntry(null);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  const handleSelectFood = useCallback((entry: FoodEntry) => {
    setSelectedEntry(entry);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setSelectedEntry(null);
  }, []);

  const handleAdd = useCallback(
    (picked: PickedFood) => {
      onSelect(picked);
      onOpenChange(false);
      // Reset state after close
      setView('list');
      setSelectedEntry(null);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton={view === 'list'}>
        {view === 'list' && (
          <>
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
            <FoodPicker
              memberId={memberId}
              onSelectFood={handleSelectFood}
              onCreateNewHref={onCreateNewHref}
            />
          </>
        )}
        {view === 'detail' && selectedEntry && (
          <DetailView
            entry={selectedEntry}
            onBack={handleBack}
            onAdd={handleAdd}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
