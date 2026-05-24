'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X as XIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExerciseThumbnail } from './exercise-thumbnail';

export interface ExerciseOption {
  _id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseOption[];
  onSelect: (exercise: ExerciseOption) => void;
  onCreated: (exercise: ExerciseOption) => void;
}

export function ExerciseSearchSheet({
  open,
  onOpenChange,
  exercises,
  onSelect,
  onCreated,
}: Props) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newBW, setNewBW] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus search input when dialog opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('');
      setCreating(false);
      setNewName('');
      setNewImageUrl('');
      setNewMuscle('');
      setNewBW(false);
    }
    onOpenChange(next);
  }

  const filtered = useMemo(
    () =>
      exercises.filter((e) =>
        e.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [exercises, query],
  );

  async function createExercise() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          imageUrl: newImageUrl.trim() || null,
          muscleGroup: newMuscle.trim() || null,
          isBodyweight: newBW,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? 'Failed to create exercise');
        return;
      }
      const created = (await res.json()) as ExerciseOption;
      onCreated(created);
      onSelect(created);
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base">Select exercise</DialogTitle>
          <DialogDescription className="sr-only">
            Search the catalog or create a new exercise.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50 pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8 pr-8 text-sm"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 w-5 rounded text-foreground/50 hover:text-foreground cursor-pointer"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-foreground/65">
              No exercises found.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((ex) => (
                <li key={ex._id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(ex);
                      handleOpenChange(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors cursor-pointer"
                  >
                    <ExerciseThumbnail
                      imageUrl={ex.imageUrl}
                      name={ex.name}
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {ex.name}
                      </div>
                      {ex.muscleGroup && (
                        <div className="text-[11px] text-foreground/65 truncate">
                          {ex.muscleGroup}
                        </div>
                      )}
                    </div>
                    {ex.isBodyweight && (
                      <span className="shrink-0 text-[10px] text-foreground/65 bg-muted rounded px-1.5 py-0.5">
                        BW
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-foreground/10 p-3">
          {!creating ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreating(true)}
              className="w-full text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Create new exercise
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  New exercise
                </span>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
              <Input
                placeholder="Name (required)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Image URL (optional)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Muscle group (optional)"
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value)}
                className="h-8 text-sm"
              />
              <label className="inline-flex items-center gap-2 text-xs text-foreground/65 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newBW}
                  onChange={(e) => setNewBW(e.target.checked)}
                  aria-label="Bodyweight exercise"
                  className="accent-foreground"
                />
                Bodyweight exercise
              </label>
              <Button
                type="button"
                onClick={() => void createExercise()}
                disabled={saving || !newName.trim()}
                className="w-full text-xs"
              >
                {saving ? 'Creating…' : 'Create & Add'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
