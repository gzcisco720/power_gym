'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { variants } from '@/lib/animations/variants';
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
  function openCreate() { setEditing(undefined); setDialogOpen(true); }
  function openEdit(st: ServiceType) { setEditing(st); setDialogOpen(true); }

  const active = serviceTypes.filter((st) => st.isActive);
  const inactive = serviceTypes.filter((st) => !st.isActive);

  const avgPrice = active.length
    ? Math.round(active.reduce((s, st) => s + st.pricePerSession, 0) / active.length)
    : 0;
  const priceRange = active.length
    ? { min: Math.min(...active.map((st) => st.pricePerSession)), max: Math.max(...active.map((st) => st.pricePerSession)) }
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Services</h1>
          <p className="text-xs text-foreground/65 mt-0.5">Manage session types and pricing for your gym</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Service
        </Button>
      </div>

      {/* Stats strip */}
      {!loading && serviceTypes.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-primary-light" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground leading-none">{active.length}</div>
              <div className="text-[11px] text-foreground/65 mt-0.5">Active services</div>
            </div>
          </div>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4 text-primary-light" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground leading-none">
                {priceRange ? (priceRange.min === priceRange.max ? `¥${priceRange.min}` : `¥${priceRange.min}–${priceRange.max}`) : '—'}
              </div>
              <div className="text-[11px] text-foreground/65 mt-0.5">Price range</div>
            </div>
          </div>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-primary-light" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground leading-none">¥{avgPrice}</div>
              <div className="text-[11px] text-foreground/65 mt-0.5">Average price</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[110px] bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : serviceTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Layers className="h-6 w-6 text-primary-light" />
          </div>
          <p className="text-sm font-medium text-foreground">No service types yet</p>
          <p className="text-xs text-foreground/65 mt-1 mb-4">Create your first service to start tracking session billing.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Service
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active services grid */}
          {active.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-2">
                Active — {active.length}
              </div>
              <motion.div
                variants={variants.staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                {active.map((st) => (
                  <motion.div
                    key={st._id}
                    variants={variants.staggerItem}
                    onClick={() => openEdit(st)}
                    className="group relative rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-primary/40 hover:bg-primary/[.03] transition-all duration-150 cursor-pointer p-4 flex flex-col gap-3"
                  >
                    {/* Name + duration row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground leading-snug">{st.name}</span>
                      <span className="shrink-0 text-[11px] font-medium text-foreground/65 bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                        {st.durationMin} min
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary-light tracking-tight">
                        {st.pricePerSession.toLocaleString()}
                      </span>
                      <span className="text-xs text-foreground/65">{st.currency} / session</span>
                    </div>

                    {/* Edit hint */}
                    <div className="text-[11px] text-foreground/30 group-hover:text-foreground/55 transition-colors">
                      Click to edit
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Inactive services */}
          {inactive.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-2">
                Inactive — {inactive.length}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {inactive.map((st) => (
                  <div
                    key={st._id}
                    onClick={() => openEdit(st)}
                    className="rounded-xl bg-card ring-1 ring-foreground/[.06] opacity-45 hover:opacity-70 transition-opacity cursor-pointer p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground/65 leading-snug">{st.name}</span>
                      <span className="shrink-0 text-[11px] font-medium text-foreground/40 bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                        {st.durationMin} min
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground/40 tracking-tight">
                        {st.pricePerSession.toLocaleString()}
                      </span>
                      <span className="text-xs text-foreground/40">{st.currency} / session</span>
                    </div>
                    <div className="text-[11px] text-foreground/30">Click to reactivate</div>
                  </div>
                ))}
              </div>
            </div>
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
