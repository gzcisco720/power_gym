'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface WorkoutCompleteModalProps {
  onConfirm: (rpe: number | null, memberNote: string | null) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function WorkoutCompleteModal({ onConfirm, onCancel, isLoading }: WorkoutCompleteModalProps) {
  const [rpe, setRpe] = useState<number>(5);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] p-6 space-y-5">
        <div className="text-center">
          <div className="text-[20px] font-bold text-white mb-1">Workout Completed!</div>
          <div className="text-[12px] text-[#555]">How did it go?</div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
          <div className="text-[12px] text-[#ccc]">How hard was this workout?</div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[#444]">
            <span>Very easy</span>
            <span className="text-[14px] font-bold text-white">RPE {rpe}</span>
            <span>Very hard</span>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-2">
          <div className="text-[12px] text-[#888]">Note for coach:</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Add a note for your coach..."
            className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333] resize-none text-[12px]"
          />
        </div>

        <Button
          onClick={() => onConfirm(rpe, note.trim() || null)}
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-white/90 font-bold text-[13px] h-12 rounded-xl"
        >
          {isLoading ? 'Saving…' : 'Finish Workout'}
        </Button>

        <button
          onClick={onCancel}
          className="w-full text-[11px] text-[#555] hover:text-[#888] transition-colors text-center"
        >
          Cancel, go back
        </button>
      </div>
    </div>
  );
}
