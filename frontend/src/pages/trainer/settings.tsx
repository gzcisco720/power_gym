import { useReducer, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settingsStore';
import { saveProfile } from '@/api/settings';
import { useAuthStore } from '@/stores/authStore';

// Trainer only has Profile + Security tabs (no Gym Info)

const TABS = [
  { value: 'profile', label: 'Profile' },
];

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

export function TrainerSettingsPage() {
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
      </div>
    </div>
  );
}
