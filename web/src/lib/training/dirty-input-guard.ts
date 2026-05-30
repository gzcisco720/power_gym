'use client';

import { useEffect } from 'react';

interface InputState {
  weight: string;
  reps: string;
}

interface SetState {
  completedAt: Date | string | null;
}

// Pure helper — exported separately so it can be unit-tested without React.
// Returns true when at least one input row has a non-empty value AND the
// corresponding set has not been confirmed (completedAt = null). Confirmed
// sets are already on the server, so closing the tab is safe for them.
export function hasDirtyInputs(inputs: InputState[], sets: SetState[]): boolean {
  const len = Math.min(inputs.length, sets.length);
  for (let i = 0; i < len; i++) {
    const input = inputs[i];
    const set = sets[i];
    if (set.completedAt != null) continue;
    if ((input.weight ?? '').trim() !== '' || (input.reps ?? '').trim() !== '') {
      return true;
    }
  }
  return false;
}

// Hook that registers a beforeunload listener while there are dirty inputs.
// Removes itself when clean or unmounted. The browser shows its native
// "Leave site?" dialog when the listener calls preventDefault.
export function useDirtyInputGuard(inputs: InputState[], sets: SetState[]): void {
  const dirty = hasDirtyInputs(inputs, sets);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Some older browsers required a non-empty returnValue. Modern Chrome
      // ignores this string but still pops the dialog when preventDefault fired.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
