import { hasDirtyInputs } from '@/lib/training/dirty-input-guard';

describe('hasDirtyInputs', () => {
  it('returns false when all inputs are empty', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '', reps: '' }, { weight: '', reps: '' }],
        [{ completedAt: null }, { completedAt: null }],
      ),
    ).toBe(false);
  });

  it('returns true when an unconfirmed set has a typed weight', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '60', reps: '' }],
        [{ completedAt: null }],
      ),
    ).toBe(true);
  });

  it('returns true when an unconfirmed set has a typed reps value', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '', reps: '8' }],
        [{ completedAt: null }],
      ),
    ).toBe(true);
  });

  it('returns false when only confirmed sets have non-empty inputs', () => {
    // Already on the server; closing the tab is safe.
    expect(
      hasDirtyInputs(
        [{ weight: '60', reps: '8' }, { weight: '', reps: '' }],
        [{ completedAt: new Date() }, { completedAt: null }],
      ),
    ).toBe(false);
  });

  it('returns true when one confirmed and one pending input is dirty', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '60', reps: '8' }, { weight: '70', reps: '' }],
        [{ completedAt: new Date() }, { completedAt: null }],
      ),
    ).toBe(true);
  });

  it('treats whitespace as empty', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '   ', reps: '\t' }],
        [{ completedAt: null }],
      ),
    ).toBe(false);
  });

  it('handles inputs longer than sets gracefully', () => {
    expect(
      hasDirtyInputs(
        [{ weight: '60', reps: '8' }, { weight: '', reps: '' }],
        [{ completedAt: null }],
      ),
    ).toBe(true);
  });
});
