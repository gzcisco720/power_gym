import { useReducer, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/stores/settingsStore';
import type { GymInfo } from '@/stores/settingsStore';
import { saveProfile } from '@/api/settings';
import { useAuthStore } from '@/stores/authStore';

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'gym-info', label: 'Gym Info' },
];

// ─── GymInfoTab ───────────────────────────────────────────────────────────────

interface GymInfoTabProps {
  gymInfo: GymInfo | null;
  onSave: (updated: GymInfo) => Promise<void>;
}

interface GymInfoFormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  description: string;
  logoUrl: string | null;
  loginLogoUrl: string | null;
}

function gymInfoToForm(g: GymInfo | null): GymInfoFormState {
  return {
    name: g?.name ?? '',
    address: g?.address ?? '',
    phone: g?.phone ?? '',
    email: g?.email ?? '',
    website: g?.website ?? '',
    hours: g?.hours ?? '',
    description: g?.description ?? '',
    logoUrl: g?.logoUrl ?? null,
    loginLogoUrl: g?.loginLogoUrl ?? null,
  };
}

type GymInfoAction =
  | { type: 'SET_FIELD'; field: keyof GymInfoFormState; value: string | null }
  | { type: 'RESET'; gymInfo: GymInfo | null };

function gymInfoReducer(state: GymInfoFormState, action: GymInfoAction): GymInfoFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return gymInfoToForm(action.gymInfo);
    default:
      return state;
  }
}

export function GymInfoTab({ gymInfo, onSave }: GymInfoTabProps) {
  const initialSnapshot = useMemo(() => JSON.stringify(gymInfoToForm(gymInfo)), [gymInfo]);
  const [form, dispatch] = useReducer(gymInfoReducer, undefined, () => gymInfoToForm(gymInfo));
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot]);

  const GYM_FIELDS: { field: keyof GymInfoFormState; label: string; placeholder?: string }[] = [
    { field: 'name', label: 'Gym Name' },
    { field: 'address', label: 'Address' },
    { field: 'phone', label: 'Phone' },
    { field: 'email', label: 'Email' },
    { field: 'website', label: 'Website' },
    { field: 'hours', label: 'Hours', placeholder: 'Mon–Fri 6am–10pm' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: GymInfo = {
        name: form.name.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        hours: form.hours.trim() || null,
        description: form.description.trim() || null,
        logoUrl: form.logoUrl,
        loginLogoUrl: form.loginLogoUrl,
      };
      await onSave(payload);
      toast.success('Gym info saved');
    } catch {
      toast.error('Failed to save gym info');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {GYM_FIELDS.map(({ field, label, placeholder }) => (
        <div key={field} className="space-y-1.5">
          <label
            htmlFor={`gym-${field}`}
            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            {label}
          </label>
          <Input
            id={`gym-${field}`}
            value={form[field] as string}
            placeholder={placeholder}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field, value: e.target.value })}
            className="bg-card border-foreground/10 text-foreground"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label
          htmlFor="gym-description"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Description
        </label>
        <Textarea
          id="gym-description"
          value={form.description}
          rows={3}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!isDirty || saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Gym Info'}
        </Button>
      </div>
    </form>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

interface ProfileFormState {
  mobile: string;
  address: string;
  dateOfBirth: string;
  certifications: string;
  saving: boolean;
}

type ProfileAction =
  | { type: 'SET_FIELD'; field: keyof Omit<ProfileFormState, 'saving'>; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function profileReducer(state: ProfileFormState, action: ProfileAction): ProfileFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_SAVING':
      return { ...state, saving: action.value };
    default:
      return state;
  }
}

interface ProfileTabProps {
  currentEmail: string;
  mobile: string | null;
  address: string | null;
  dateOfBirth: string | null;
  certifications: string[];
  onSave: () => void;
}

function ProfileTab({
  currentEmail,
  mobile,
  address,
  dateOfBirth,
  certifications,
  onSave,
}: ProfileTabProps) {
  const dobValue = dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : '';
  const [state, dispatch] = useReducer(profileReducer, {
    mobile: mobile ?? '',
    address: address ?? '',
    dateOfBirth: dobValue,
    certifications: certifications.join(', '),
    saving: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const certList = state.certifications
        .split(',')
        .flatMap((s) => { const t = s.trim(); return t ? [t] : []; });
      await saveProfile({
        mobile: state.mobile.trim() || null,
        address: state.address.trim() || null,
        dateOfBirth: state.dateOfBirth || null,
        certifications: certList,
      });
      toast.success('Profile saved');
      onSave();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email — read-only display */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Email</p>
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
          value={state.dateOfBirth}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dateOfBirth', value: e.target.value })}
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
          value={state.mobile}
          placeholder="+1 234 567 8900"
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'mobile', value: e.target.value })}
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
          value={state.address}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'address', value: e.target.value })}
          className="bg-card border-foreground/10 text-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="certifications"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
        >
          Certifications
        </label>
        <Input
          id="certifications"
          value={state.certifications}
          placeholder="NSCA-CPT, ACE, CSCS (comma-separated)"
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'certifications', value: e.target.value })}
          className="bg-card border-foreground/10 text-foreground"
        />
        <p className="text-xs text-foreground/65">Separate multiple certifications with commas</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={state.saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer"
        >
          {state.saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function OwnerSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'profile';
  const user = useAuthStore((s) => s.user);
  const { profile, gymInfo, fetchProfileData, patchGymInfo } = useSettingsStore();

  useEffect(() => {
    void fetchProfileData();
  }, [fetchProfileData]);

  function setTab(value: string) {
    setSearchParams({ tab: value });
  }

  async function handleGymInfoSave(updated: GymInfo) {
    await patchGymInfo(updated);
  }

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
          <ProfileTab
            currentEmail={user.email}
            mobile={profile?.mobile ?? null}
            address={profile?.address ?? null}
            dateOfBirth={profile?.dateOfBirth ?? null}
            certifications={profile?.certifications ?? []}
            onSave={() => void fetchProfileData()}
          />
        )}
        {tab === 'gym-info' && (
          <GymInfoTab
            gymInfo={gymInfo}
            onSave={handleGymInfoSave}
          />
        )}
      </div>
    </div>
  );
}
