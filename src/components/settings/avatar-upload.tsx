'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage/upload-file';
import { getAvatarSignatureAction } from '@/lib/actions/get-avatar-signature';

interface Props {
  avatarUrl: string | null;
  initials: string;
  onUpload: (url: string) => void;
}

export function AvatarUpload({ avatarUrl, initials, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const config = await getAvatarSignatureAction();
      const secureUrl = await uploadFile(file, config);
      onUpload(secureUrl);
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        aria-label="Change profile photo"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[16px] font-semibold text-foreground/60">{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
            uploading...
          </div>
        )}
      </button>
      <div>
        <p className="text-sm font-medium text-foreground">Profile Photo</p>
        <p className="text-xs text-foreground/65">JPG, PNG or WebP · max 5MB</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  );
}
