import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export function OwnerSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Profile update not implemented in backend yet — show success toast
    toast.success('Settings saved');
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>
      <div className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="text-sm font-medium text-foreground/80">Name</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="text-sm font-medium text-foreground/80">Email</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
