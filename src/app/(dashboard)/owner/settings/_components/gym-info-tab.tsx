'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage/upload-file';
import { getGymAssetSignatureAction } from '@/lib/actions/get-gym-asset-signature';
import { LogoCropDialog } from '@/components/settings/logo-crop-dialog';
import { updateGymInfoAction } from '../actions';

interface GymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginLogoUrl: string | null;
}

interface Props {
  gymInfo: GymInfo | null;
}

const GYM_FIELDS: { id: string; label: string; placeholder?: string }[] = [
  { id: 'gymName', label: 'Gym Name' },
  { id: 'gymAddress', label: 'Address' },
  { id: 'gymPhone', label: 'Phone' },
  { id: 'gymEmail', label: 'Email' },
  { id: 'gymWebsite', label: 'Website' },
  { id: 'gymHours', label: 'Hours', placeholder: 'Mon–Fri 6am–10pm' },
];

export function GymInfoTab({ gymInfo }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(gymInfo?.logoUrl ?? null);
  const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(gymInfo?.loginLogoUrl ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loginLogoCropSrc, setLoginLogoCropSrc] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);

  const gymName = gymInfo?.name ?? '';
  const fallbackInitial = gymName.trim().charAt(0).toUpperCase() || 'G';

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleCropApply(blob: Blob) {
    if (!cropSrc) return;
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploadingLogo(true);
    try {
      const config = await getGymAssetSignatureAction('gym-logos');
      const file = new File([blob], 'logo.webp', { type: 'image/webp' });
      const url = await uploadFile(file, config);
      setLogoUrl(url);
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleLoginLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLoginLogoCropSrc(objectUrl);
    if (loginLogoInputRef.current) loginLogoInputRef.current.value = '';
  }

  async function handleLoginLogoCropApply(blob: Blob) {
    if (!loginLogoCropSrc) return;
    URL.revokeObjectURL(loginLogoCropSrc);
    setLoginLogoCropSrc(null);
    setUploadingLoginLogo(true);
    try {
      const config = await getGymAssetSignatureAction('gym-login-logos');
      const file = new File([blob], 'login-logo.webp', { type: 'image/webp' });
      const url = await uploadFile(file, config);
      setLoginLogoUrl(url);
    } catch {
      toast.error('Failed to upload login logo');
    } finally {
      setUploadingLoginLogo(false);
    }
  }

  function handleLoginLogoCropCancel() {
    if (loginLogoCropSrc) URL.revokeObjectURL(loginLogoCropSrc);
    setLoginLogoCropSrc(null);
  }

  const fieldValues: Record<string, string | null | undefined> = {
    gymName: gymInfo?.name,
    gymAddress: gymInfo?.address,
    gymPhone: gymInfo?.phone,
    gymEmail: gymInfo?.email,
    gymWebsite: gymInfo?.website,
    gymHours: gymInfo?.hours,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    if (logoUrl) formData.set('logoUrl', logoUrl);
    if (loginLogoUrl) formData.set('loginLogoUrl', loginLogoUrl);
    const result = await updateGymInfoAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else { toast.success('Gym info saved'); router.refresh(); }
  }

  return (
    <>
      {cropSrc !== null && (
        <LogoCropDialog
          open
          imageSrc={cropSrc}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}
      {loginLogoCropSrc !== null && (
        <LogoCropDialog
          open
          imageSrc={loginLogoCropSrc}
          title="Crop Login Logo"
          aspect={1}
          cropShape="rect"
          onApply={handleLoginLogoCropApply}
          onCancel={handleLoginLogoCropCancel}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Branding section */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Gym Branding</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Sidebar logo */}
            <div className="space-y-2">
              <p className="text-xs text-foreground/65">Sidebar Logo</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                aria-label="Upload logo"
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {logoUrl ? (
                  <Image src={logoUrl} alt="Gym logo" fill className="object-cover" />
                ) : (
                  <span className="text-[16px] font-semibold text-foreground/60">{fallbackInitial}</span>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">uploading...</div>
                )}
              </button>
              <p className="text-[10px] text-foreground/40">200×200px</p>
            </div>

            {/* Login logo */}
            <div className="space-y-2">
              <p className="text-xs text-foreground/65">Login Logo</p>
              <button
                type="button"
                onClick={() => loginLogoInputRef.current?.click()}
                disabled={uploadingLoginLogo}
                aria-label="Upload login logo"
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {loginLogoUrl ? (
                  <Image src={loginLogoUrl} alt="Login logo" fill className="object-contain p-1" />
                ) : (
                  <span className="text-[11px] text-foreground/40">None</span>
                )}
                {uploadingLoginLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white">uploading...</div>
                )}
              </button>
              <p className="text-[10px] text-foreground/40">PNG recommended</p>
            </div>
          </div>
          <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} aria-hidden="true" />
          <input ref={loginLogoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLoginLogoChange} aria-hidden="true" />
        </div>

        {GYM_FIELDS.map(({ id, label, placeholder }) => (
          <div key={id} className="space-y-1.5">
            <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">{label}</label>
            <Input id={id} name={id} defaultValue={fieldValues[id] ?? ''} placeholder={placeholder} className="bg-card border-foreground/10 text-foreground" />
          </div>
        ))}
        <div className="space-y-1.5">
          <label htmlFor="gymDescription" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Description</label>
          <Textarea id="gymDescription" name="gymDescription" defaultValue={gymInfo?.description ?? ''} rows={3} className="bg-card border-foreground/10 text-foreground" />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 cursor-pointer">
            {saving ? 'Saving...' : 'Save Gym Info'}
          </Button>
        </div>
      </form>
    </>
  );
}
