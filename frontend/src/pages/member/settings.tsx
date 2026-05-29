import { useEffect, useMemo, useReducer } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useAccountStore } from '@/stores/accountStore';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { variants } from '@/lib/animations/variants';

interface SettingsState {
  bio: string;
  isSaving: boolean;
}

type SettingsAction =
  | { type: 'SET_BIO'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_BIO': return { ...state, bio: action.value };
    case 'SET_SAVING': return { ...state, isSaving: action.value };
    default: return state;
  }
}

export function MemberSettingsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { profile, fetchProfile, updateProfile, isLoading } = useAccountStore();

  const [state, dispatch] = useReducer(settingsReducer, {
    bio: '',
    isSaving: false,
  });

  useEffect(() => {
    if (!profile) void fetchProfile();
  }, [profile, fetchProfile]);

  useEffect(() => {
    if (profile) {
      dispatch({ type: 'SET_BIO', value: profile.bio ?? '' });
    }
  }, [profile]);

  const initialBio = useMemo(() => profile?.bio ?? '', [profile]);
  const isDirty = useMemo(() => state.bio !== initialBio, [state.bio, initialBio]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await updateProfile({ bio: state.bio || null });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Settings" />
      <div className="px-4 sm:px-8 py-6 max-w-lg mx-auto">
        {isLoading && !profile ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
            ))}
          </div>
        ) : (
          <m.div
            className="space-y-6"
            variants={shouldReduceMotion ? undefined : variants.fadeSlideUp}
            initial="hidden"
            animate="visible"
          >
            {/* Read-only name fields */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Profile</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/65">First Name</span>
                  <span className="text-sm font-medium text-foreground">{profile?.firstName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/65">Last Name</span>
                  <span className="text-sm font-medium text-foreground">{profile?.lastName ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/65">Email</span>
                  <span className="text-sm font-medium text-foreground">{profile?.email ?? '—'}</span>
                </div>
              </div>
              <p className="text-xs text-foreground/65">Contact your trainer to update your name.</p>
            </div>

            {/* Editable bio */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="bio"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Bio <span className="text-foreground/40 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  value={state.bio}
                  onChange={(e) => dispatch({ type: 'SET_BIO', value: e.target.value })}
                  rows={4}
                  placeholder="Tell your trainer a bit about yourself..."
                  className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="sticky bottom-0 z-10 flex items-center gap-2 py-3 border-t border-foreground/10 backdrop-blur-md bg-background/50 -mx-4 px-4 sm:-mx-8 sm:px-8">
                <Button
                  type="submit"
                  disabled={state.isSaving}
                >
                  {state.isSaving ? 'Saving…' : 'Save'}
                </Button>
                {isDirty && (
                  <span className="text-xs text-foreground/65">Unsaved changes</span>
                )}
              </div>
            </form>
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}
