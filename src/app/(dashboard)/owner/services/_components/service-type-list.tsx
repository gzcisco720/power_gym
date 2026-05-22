'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceTypeDialog } from './service-type-dialog';

interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  isActive: boolean;
}

export function ServiceTypeList() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceType | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/service-types')
      .then((res) => res.json())
      .then((data: { serviceTypes: ServiceType[] }) => {
        if (!cancelled) setServiceTypes(data.serviceTypes ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  function reload() { setLoading(true); setRefreshKey((k) => k + 1); }

  const active = serviceTypes.filter((st) => st.isActive);
  const inactive = serviceTypes.filter((st) => !st.isActive);

  function openCreate() { setEditing(undefined); setDialogOpen(true); }
  function openEdit(st: ServiceType) { setEditing(st); setDialogOpen(true); }


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Services</h1>
          <p className="text-xs text-foreground/65 mt-0.5">Manage session types and pricing for your gym</p>
        </div>
        <Button onClick={openCreate}>+ Add Service</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.map((st) => (
            <div key={st._id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all cursor-pointer"
              onClick={() => openEdit(st)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{st.name}</span>
                <span className="text-xs text-foreground/65">{st.durationMin} min</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary-light">{st.currency} {st.pricePerSession}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
          ))}

          {inactive.length > 0 && (
            <>
              <div className="pt-4 pb-1 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Inactive</div>
              {inactive.map((st) => (
                <div key={st._id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 opacity-50 cursor-pointer"
                  onClick={() => openEdit(st)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground/65">{st.name}</span>
                    <span className="text-xs text-foreground/40">{st.durationMin} min</span>
                  </div>
                  <span className="text-sm text-foreground/40">{st.currency} {st.pricePerSession}</span>
                </div>
              ))}
            </>
          )}

          {active.length === 0 && inactive.length === 0 && (
            <p className="text-sm text-foreground/65 py-8 text-center">No service types yet. Add your first one.</p>
          )}
        </div>
      )}

      <ServiceTypeDialog
        key={editing?._id ?? 'create'}
        open={dialogOpen}
        serviceType={editing}
        onSuccess={reload}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
