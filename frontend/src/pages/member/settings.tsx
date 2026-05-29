import { useEffect, useState } from 'react';
import { useAccountStore } from '@/stores/accountStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MemberSettingsPage() {
  const { profile, fetchProfile, updateProfile, isLoading } = useAccountStore();
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) void fetchProfile();
  }, [profile, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ bio: bio || null });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-foreground/65">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>
      <div className="max-w-md">
        <div className="mb-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground/80">First Name</p>
            <p className="mt-1 text-sm text-foreground">{profile?.firstName ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/80">Last Name</p>
            <p className="mt-1 text-sm text-foreground">{profile?.lastName ?? '—'}</p>
          </div>
          <p className="text-xs text-foreground/65">Contact your trainer to update your name.</p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="bio" className="text-sm font-medium text-foreground/80">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </div>
    </div>
  );
}
