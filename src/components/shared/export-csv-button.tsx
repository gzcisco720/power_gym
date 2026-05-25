'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  url: string;
  filename: string;
  className?: string;
}

export function ExportCsvButton({ url, filename, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        toast.error('Export failed');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={loading}
      className={className ?? 'inline-flex items-center gap-1.5 h-8 rounded-lg bg-foreground/8 px-3 text-xs font-semibold text-foreground/65 hover:bg-foreground/12 hover:text-foreground transition-colors disabled:opacity-50'}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      {loading ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
