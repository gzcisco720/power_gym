'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  currentEmail: string;
}

export function AccountTab({ currentEmail }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/account/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update email');
      } else {
        toast.success('Email updated — please sign in again to refresh your session');
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">Email Address</p>
        {!editing ? (
          <div className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <span className="text-sm text-foreground">{currentEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-foreground/65 hover:text-foreground text-xs cursor-pointer"
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@email.com"
              autoFocus
              className="bg-card border-foreground/10 text-foreground"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !email}
                size="sm"
                className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditing(false); setEmail(''); }}
                className="text-foreground/65 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
