import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAccountStore } from '@/stores/accountStore';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OwnerSettingsPage() {
  const { profile, fetchProfile, updateProfile, isLoading } = useAccountStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setMobile(profile.mobile ?? '');
    }
  }, [profile]);

  const initialSnapshot = useMemo(
    () => JSON.stringify({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', mobile: profile?.mobile ?? '' }),
    [profile],
  );

  const isDirty = useMemo(
    () => JSON.stringify({ firstName, lastName, mobile }) !== initialSnapshot,
    [firstName, lastName, mobile, initialSnapshot],
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName, mobile: mobile || null });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile and preferences" />

      <div className="px-4 sm:px-8 py-6 max-w-lg">
        {isLoading && !profile ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
                Profile
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-first-name"
                    className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                  >
                    First Name
                  </label>
                  <Input
                    id="settings-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-last-name"
                    className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                  >
                    Last Name
                  </label>
                  <Input
                    id="settings-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-email"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Email
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-foreground/40">Email cannot be changed here.</p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-mobile"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Mobile{' '}
                  <span className="normal-case text-foreground/40">(optional)</span>
                </label>
                <Input
                  id="settings-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+61 400 000 000"
                />
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="sticky bottom-0 z-10 flex items-center gap-2 py-3 border-t border-foreground/10 backdrop-blur-md bg-background/50 -mx-4 sm:-mx-8 px-4 sm:px-8">
              <Button
                type="submit"
                disabled={!isDirty || saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFirstName(profile?.firstName ?? '');
                    setLastName(profile?.lastName ?? '');
                    setMobile(profile?.mobile ?? '');
                  }}
                >
                  Discard
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
