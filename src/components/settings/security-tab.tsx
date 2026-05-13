'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update password');
      } else {
        toast.success('Password updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-4">Change Password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-card border-foreground/10 text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="bg-card border-foreground/10 text-foreground"
            />
            <p className="text-xs text-foreground/65">Min 8 characters, 1 uppercase, 1 number</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="bg-card border-foreground/10 text-foreground"
            />
          </div>
          <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-foreground/65">
          Forgot your password?{' '}
          <Link href="/forgot-password" className="underline text-foreground/80 hover:text-foreground">
            Reset it here
          </Link>
        </p>
      </div>
    </div>
  );
}
