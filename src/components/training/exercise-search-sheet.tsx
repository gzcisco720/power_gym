'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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

export function ExerciseSearchSheet({ open, onOpenChange, exercises, onSelect, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newBW, setNewBW] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
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
      setNewName('');
      setNewImageUrl('');
      setNewMuscle('');
      setNewBW(false);
      setCreating(false);
      onSelect(created);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0f0f0f] border-t border-[#1e1e1e] rounded-t-xl px-4 pb-8 pt-4 h-[80vh] overflow-y-auto">
        <SheetTitle className="text-[13px] font-semibold text-white mb-3">Select Exercise</SheetTitle>

        <Input
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3 bg-[#141414] border-[#1e1e1e] text-white placeholder:text-[#555]"
          autoFocus
        />

        <div className="space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-[12px] text-[#555] py-2">No exercises found.</p>
          )}
          {filtered.map((ex) => (
            <button
              key={ex._id}
              onClick={() => { onSelect(ex); onOpenChange(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#1a1a1a] transition-colors text-left"
            >
              <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.name} size={36} />
              <div>
                <div className="text-[12px] font-medium text-white">{ex.name}</div>
                {ex.muscleGroup && (
                  <div className="text-[10px] text-[#555]">{ex.muscleGroup}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {!creating ? (
          <Button
            variant="ghost"
            onClick={() => setCreating(true)}
            className="w-full border border-[#1a1a1a] text-[#666] hover:border-[#333] hover:text-[#aaa] text-[11px]"
          >
            + Create new exercise
          </Button>
        ) : (
          <div className="space-y-2 border border-[#1e1e1e] rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666] mb-2">New Exercise</div>
            <Input
              placeholder="Name (required)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <Input
              placeholder="Image URL (optional)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <Input
              placeholder="Muscle group (optional)"
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <label className="flex items-center gap-2 text-[12px] text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newBW}
                onChange={(e) => setNewBW(e.target.checked)}
                className="accent-white"
              />
              Bodyweight exercise
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={createExercise}
                disabled={saving || !newName.trim()}
                className="flex-1 bg-white text-black hover:bg-white/90 text-[11px] font-semibold disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCreating(false)}
                className="text-[#666] text-[11px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
