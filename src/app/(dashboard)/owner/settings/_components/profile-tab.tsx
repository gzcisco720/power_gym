'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AvatarUpload } from '@/components/settings/avatar-upload';
import { updateOwnerProfileAction } from '../actions';

interface Props {
  firstName: string;
  lastName: string;
  currentEmail: string;
  mobile: string | null;
  address: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  certifications: string[];
}

interface OwnerProfileTabState {
  avatarUrl: string | null;
  saving: boolean;
  editingEmail: boolean;
  newEmail: string;
  savingEmail: boolean;
}

type OwnerProfileTabAction =
  | { type: 'SET_AVATAR_URL'; value: string | null }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_EDITING_EMAIL'; value: boolean }
  | { type: 'SET_NEW_EMAIL'; value: string }
  | { type: 'SET_SAVING_EMAIL'; value: boolean };

function ownerProfileTabReducer(state: OwnerProfileTabState, action: OwnerProfileTabAction): OwnerProfileTabState {
  switch (action.type) {
    case 'SET_AVATAR_URL': return { ...state, avatarUrl: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_EDITING_EMAIL': return { ...state, editingEmail: action.value };
    case 'SET_NEW_EMAIL': return { ...state, newEmail: action.value };
    case 'SET_SAVING_EMAIL': return { ...state, savingEmail: action.value };
    default: return state;
  }
}

export function OwnerProfileTab(props: Props) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(ownerProfileTabReducer, undefined, () => ({
    avatarUrl: props.avatarUrl,
    saving: false,
    editingEmail: false,
    newEmail: '',
    savingEmail: false,
  }));
  const { avatarUrl, saving, editingEmail, newEmail, savingEmail } = state;

  async function handleEmailSave() {
    dispatch({ type: 'SET_SAVING_EMAIL', value: true });
    try {
      const res = await fetch('/api/account/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update email');
      } else {
        toast.success('Email updated — please sign in again to refresh your session');
        dispatch({ type: 'SET_EDITING_EMAIL', value: false });
      }
    } finally {
      dispatch({ type: 'SET_SAVING_EMAIL', value: false });
    }
  }
  const userInitials = `${props.firstName[0] ?? ''}${props.lastName[0] ?? ''}`.toUpperCase();
  const dobValue = props.dateOfBirth
    ? new Date(props.dateOfBirth).toISOString().split('T')[0]
    : '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    dispatch({ type: 'SET_SAVING', value: true });
    const formData = new FormData(e.currentTarget);
    if (avatarUrl) formData.set('avatarUrl', avatarUrl);
    const result = await updateOwnerProfileAction({ error: '' }, formData);
    dispatch({ type: 'SET_SAVING', value: false });
    if (result.error) toast.error(result.error);
    else { toast.success('Profile saved'); refresh(); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AvatarUpload avatarUrl={avatarUrl} initials={userInitials} onUpload={(url) => dispatch({ type: 'SET_AVATAR_URL', value: url })} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            First Name <span className="text-destructive">*</span>
          </label>
          <Input id="firstName" name="firstName" required defaultValue={props.firstName} className="bg-card border-foreground/10 text-foreground" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Last Name <span className="text-destructive">*</span>
          </label>
          <Input id="lastName" name="lastName" required defaultValue={props.lastName} className="bg-card border-foreground/10 text-foreground" />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Email</p>
        {!editingEmail ? (
          <div className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <span className="text-sm text-foreground">{props.currentEmail}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_EDITING_EMAIL', value: true })}
              className="text-foreground/65 hover:text-foreground text-xs cursor-pointer"
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => dispatch({ type: 'SET_NEW_EMAIL', value: e.target.value })}
              placeholder="new@email.com"
              autoFocus
              className="bg-card border-foreground/10 text-foreground"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleEmailSave}
                disabled={savingEmail || !newEmail}
                size="sm"
                className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer"
              >
                {savingEmail ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { dispatch({ type: 'SET_EDITING_EMAIL', value: false }); dispatch({ type: 'SET_NEW_EMAIL', value: '' }); }}
                className="text-foreground/65 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="dateOfBirth" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Date of Birth</label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dobValue} className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="mobile" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Mobile <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input id="mobile" name="mobile" type="tel" defaultValue={props.mobile ?? ''} placeholder="+1 234 567 8900" className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Address <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input id="address" name="address" defaultValue={props.address ?? ''} className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="certifications" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Certifications</label>
        <Input
          id="certifications"
          name="certifications"
          defaultValue={props.certifications.join(', ')}
          placeholder="NSCA-CPT, ACE, CSCS (comma-separated)"
          className="bg-card border-foreground/10 text-foreground"
        />
        <p className="text-xs text-foreground/65">Separate multiple certifications with commas</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
