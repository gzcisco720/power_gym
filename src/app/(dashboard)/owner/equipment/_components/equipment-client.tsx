'use client';

import { useReducer, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageIcon, Loader2 } from 'lucide-react';
import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/shared/image-lightbox';

import { AddEquipmentDialog } from './add-equipment-dialog';
import { EditEquipmentDialog } from './edit-equipment-dialog';
import type { NewEquipmentItem } from './add-equipment-dialog';
import type { EquipmentItem } from './equipment.types';
import { STATUS_COLOURS } from './equipment.types';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';

type FilterTab = 'all' | EquipmentStatus;
const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

function isOverdue(nextServiceDate: string | null): boolean {
  return nextServiceDate !== null && new Date(nextServiceDate) < new Date();
}

interface Props {
  initialItems: EquipmentItem[];
}

interface EquipmentClientState {
  items: EquipmentItem[];
  showAdd: boolean;
  editTarget: EquipmentItem | null;
  deletingId: string | null;
  lightbox: { images: string[]; index: number } | null;
}

type EquipmentClientAction =
  | { type: 'ADD_ITEM'; item: EquipmentItem }
  | { type: 'UPDATE_ITEM'; updated: EquipmentItem }
  | { type: 'DELETE_ITEM'; id: string }
  | { type: 'SET_SHOW_ADD'; value: boolean }
  | { type: 'SET_EDIT_TARGET'; item: EquipmentItem | null }
  | { type: 'SET_DELETING_ID'; id: string | null }
  | { type: 'SET_LIGHTBOX'; value: { images: string[]; index: number } | null };

function equipmentClientReducer(state: EquipmentClientState, action: EquipmentClientAction): EquipmentClientState {
  switch (action.type) {
    case 'ADD_ITEM': return { ...state, items: [...state.items, action.item] };
    case 'UPDATE_ITEM': return {
      ...state,
      items: state.items.map((i) => i._id === action.updated._id ? action.updated : i),
      editTarget: state.editTarget?._id === action.updated._id ? action.updated : state.editTarget,
    };
    case 'DELETE_ITEM': return { ...state, items: state.items.filter((i) => i._id !== action.id), deletingId: null };
    case 'SET_SHOW_ADD': return { ...state, showAdd: action.value };
    case 'SET_EDIT_TARGET': return { ...state, editTarget: action.item };
    case 'SET_DELETING_ID': return { ...state, deletingId: action.id };
    case 'SET_LIGHTBOX': return { ...state, lightbox: action.value };
    default: return state;
  }
}

export function EquipmentClient({ initialItems }: Props) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(equipmentClientReducer, {
    items: initialItems,
    showAdd: false,
    editTarget: null,
    deletingId: null,
    lightbox: null,
  });
  const { items, showAdd, editTarget, deletingId, lightbox } = state;
  const [filter, setFilter] = useState<FilterTab>('all');
  const visibleItems = filter === 'all' ? items : items.filter((i) => i.status === filter);

  function handleCreated(item: NewEquipmentItem) {
    dispatch({ type: 'ADD_ITEM', item });
    refresh();
  }

  function handleUpdated(updated: EquipmentItem) {
    dispatch({ type: 'UPDATE_ITEM', updated });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this equipment? This cannot be undone.')) return;
    dispatch({ type: 'SET_DELETING_ID', id });
    try {
      const res = await fetch(`/api/owner/equipment/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      dispatch({ type: 'DELETE_ITEM', id });
      toast.success('Equipment deleted');
      refresh();
    } finally {
      dispatch({ type: 'SET_DELETING_ID', id: null });
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-foreground/5 p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${filter === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-foreground/40 hover:text-foreground/65'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => dispatch({ type: 'SET_SHOW_ADD', value: true })}
            className="bg-white text-black hover:bg-white/90 font-semibold text-sm"
          >
            + Add Equipment
          </Button>
        </div>

        {visibleItems.length === 0 && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-[13px] text-foreground/40">
              {items.length === 0 ? 'No equipment added yet.' : 'No equipment matches this filter.'}
            </p>
          </div>
        )}

        {visibleItems.length > 0 && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_140px_60px_140px_120px_60px] border-b border-foreground/8 px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/40">
              <div>Name</div>
              <div>Brand</div>
              <div>Qty</div>
              <div>Status</div>
              <div></div>
              <div></div>
            </div>

            <m.div variants={variants.staggerContainer} initial="hidden" animate="visible">
              {visibleItems.map((item) => (
                <m.div
                  key={item._id}
                  variants={variants.staggerItem}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_60px_140px_120px_60px] items-center px-5 py-3.5 border-b border-foreground/5 last:border-0 gap-2"
                >
                  <div className="flex items-center gap-3">
                    {item.images?.[0] ? (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_LIGHTBOX', value: { images: item.images, index: 0 } })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch({ type: 'SET_LIGHTBOX', value: { images: item.images, index: 0 } }); }}
                        className="size-8 rounded-md border border-foreground/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden relative"
                        aria-label={`View ${item.name} image`}
                      >
                        <Image src={item.images[0]} alt={item.name} fill sizes="32px" className="object-cover" />
                      </button>
                    ) : (
                      <div aria-label="No image" className="size-8 rounded-md border border-foreground/8 bg-foreground/5 flex items-center justify-center shrink-0">
                        <ImageIcon className="size-3.5 text-foreground/20" />
                      </div>
                    )}
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{item.name}</div>
                      {item.note && <div className="text-[11px] text-foreground/40 mt-0.5">{item.note}</div>}
                    </div>
                  </div>

                  <div className="hidden sm:block text-[12px] text-foreground/40">{item.brand ?? '—'}</div>

                  <div className="hidden sm:block text-[12px] text-foreground/40">{item.quantity}</div>

                  <div className="hidden sm:flex items-center gap-1.5">
                    {item.trackCondition ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[item.status]}`}>
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-[11px] text-foreground/20">N/A</span>
                    )}
                    {isOverdue(item.nextServiceDate) && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        Overdue
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={() => dispatch({ type: 'SET_EDIT_TARGET', item })}
                      className="text-foreground/40 hover:text-foreground/65 hover:bg-muted text-xs h-7 px-3"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id}
                      className="text-foreground/40 hover:text-destructive hover:bg-muted text-xs h-7 px-2 disabled:opacity-50"
                    >
                      {deletingId === item._id ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
                    </Button>
                  </div>
                </m.div>
              ))}
            </m.div>
          </div>
        )}
      </div>

      <AddEquipmentDialog
        open={showAdd}
        onClose={() => dispatch({ type: 'SET_SHOW_ADD', value: false })}
        onCreated={handleCreated}
      />

      <EditEquipmentDialog
        equipment={editTarget}
        onClose={() => dispatch({ type: 'SET_EDIT_TARGET', item: null })}
        onUpdated={handleUpdated}
      />

      <ImageLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        open={lightbox !== null}
        onClose={() => dispatch({ type: 'SET_LIGHTBOX', value: null })}
      />
    </>
  );
}
