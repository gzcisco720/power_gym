import { useReducer, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settingsStore';
import type { UserProfile } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
];

// ─── MemberProfileTab ─────────────────────────────────────────────────────────

interface MemberProfileTabProps {
  initialProfile: UserProfile | null;
  currentEmail: string;
  firstName: string;
  lastName: string;
  onSave: () => void;
}

interface ProfileFormState {
  mobile: string;
  address: string;
  dateOfBirth: string;
  sex: string;
  fitnessGoal: string;
  fitnessLevel: string;
}

type ProfileFormAction =
  | { type: 'SET_FIELD'; field: keyof ProfileFormState; value: string }
  | { type: 'RESET'; profile: UserProfile | null };

function profileToForm(profile: UserProfile | null): ProfileFormState {
  const extProfile = profile as (UserProfile & { sex?: string; fitnessGoal?: string; fitnessLevel?: string }) | null;
  return {
    mobile: profile?.mobile ?? '',
    address: profile?.address ?? '',
    dateOfBirth: profile?.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
      : '',
    sex: extProfile?.sex ?? '',
    fitnessGoal: extProfile?.fitnessGoal ?? '',
    fitnessLevel: extProfile?.fitnessLevel ?? '',
  };
}

function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return profileToForm(action.profile);
    default:
      return state;
  }
}

const FITNESS_GOALS = [
  { value: 'lose_fat', label: 'Lose Fat' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_performance', label: 'Improve Performance' },
] as const;

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export function MemberProfileTab({
  initialProfile,
  currentEmail,
  firstName,
  lastName,
  onSave,
}: MemberProfileTabProps) {
  const [saving, setSaving] = useState(false);
  const [form, dispatch] = useReducer(profileFormReducer, undefined, () =>
    profileToForm(initialProfile),
  );

  const initialSnapshot = useMemo(() => JSON.stringify(profileToForm(initialProfile)), [initialProfile]);
  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot]);

  const { patchProfile } = useSettingsStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await patchProfile({
        mobile: form.mobile.trim() || null,
        address: form.address.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
      });
      toast.success('Profile saved');
      onSave();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  const initials =
    `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar placeholder */}
      <div className="flex items-center gap-3">
        <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-bold text-lg">
          {initials}
        </div>
      </div>

      {/* Name — read-only display */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            First Name
          </p>
          <div className="flex items-center rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <span className="text-sm text-foreground">{firstName}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Last Name
          </p>
          <div className="flex items-center rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <span className="text-sm text-foreground">{lastName}</span>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Email
        </p>
        <div className="flex items-center rounded-lg border border-foreground/10 bg-card px-4 py-3">
          <span className="text-sm text-foreground">{currentEmail}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dateOfBirth"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Date of Birth
        </label>
        <Input
          id="dateOfBirth"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'dateOfBirth', value: e.target.value })
          }
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="mobile"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Mobile{' '}
          <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input
          id="mobile"
          type="tel"
          value={form.mobile}
          placeholder="+1 234 567 8900"
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'mobile', value: e.target.value })
          }
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="address"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Address{' '}
          <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'address', value: e.target.value })
          }
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sex"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Sex
        </label>
        <select
          id="sex"
          value={form.sex}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sex', value: e.target.value })}
          className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="fitnessGoal"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Fitness Goal
        </label>
        <select
          id="fitnessGoal"
          value={form.fitnessGoal}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'fitnessGoal', value: e.target.value })
          }
          className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">-- Select --</option>
          {FITNESS_GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="fitnessLevel"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Fitness Level
        </label>
        <select
          id="fitnessLevel"
          value={form.fitnessLevel}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'fitnessLevel', value: e.target.value })
          }
          className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">-- Select --</option>
          {FITNESS_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saving || !isDirty}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}

// ─── SecurityTab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        toast.error(data.message ?? 'Failed to change password');
      } else {
        toast.success('Password changed');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="currentPassword"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Current Password <span className="text-destructive">*</span>
        </label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          required
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="newPassword"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          New Password <span className="text-destructive">*</span>
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          required
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saving || !currentPassword || !newPassword}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Change Password'}
        </Button>
      </div>
    </form>
  );
}

// ─── MemberSettingsPage ───────────────────────────────────────────────────────

export function MemberSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'profile';
  const user = useAuthStore((s) => s.user);
  const { profile, fetchProfileData } = useSettingsStore();

  useEffect(() => {
    void fetchProfileData();
  }, [fetchProfileData]);

  function setTab(value: string) {
    setSearchParams({ tab: value });
  }

  const [firstName, lastName] = (user?.name ?? '').split(' ');

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="border-b border-foreground/[.06]">
        <div className="flex px-4 sm:px-8 gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={[
                'px-3 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground/65 hover:text-foreground',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-7 max-w-lg">
        {tab === 'profile' && user && (
          <MemberProfileTab
            initialProfile={profile}
            currentEmail={user.email}
            firstName={firstName ?? ''}
            lastName={lastName ?? ''}
            onSave={() => void fetchProfileData()}
          />
        )}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
