'use client';

import { useReducer } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageIcon, Loader2 } from 'lucide-react';
import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import { AddEquipmentDialog } from './add-equipment-dialog';
import { EditEquipmentDialog } from './edit-equipment-dialog';
import type { NewEquipmentItem } from './add-equipment-dialog';
import type { EquipmentItem } from './equipment.types';
import { STATUS_COLOURS } from './equipment.types';

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
        <div className="flex justify-end">
          <Button
            onClick={() => dispatch({ type: 'SET_SHOW_ADD', value: true })}
            className="bg-white text-black hover:bg-white/90 font-semibold text-sm"
          >
            + Add Equipment
          </Button>
        </div>

        {items.length === 0 && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
            <p className="text-[13px] text-[#777]">No equipment added yet.</p>
          </Card>
        )}

        {items.length > 0 && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_140px_60px_110px_120px_60px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">
              <div>Name</div>
              <div>Brand</div>
              <div>Qty</div>
              <div>Status</div>
              <div></div>
              <div></div>
            </div>

            <m.div
              variants={variants.staggerContainer}
              initial="hidden"
              animate="visible"
            >
            {items.map((item) => (
              <m.div
                key={item._id}
                variants={variants.staggerItem}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_60px_110px_120px_60px] items-center px-5 py-3.5 border-b border-[#0f0f0f] last:border-0 gap-2"
              >
                <div className="flex items-center gap-3">
                  {item.images?.[0] ? (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_LIGHTBOX', value: { images: item.images, index: 0 } })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch({ type: 'SET_LIGHTBOX', value: { images: item.images, index: 0 } }); }}
                      className="size-8 rounded-md border border-[#222] shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden relative"
                      aria-label={`View ${item.name} image`}
                    >
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </button>
                  ) : (
                    <div
                      aria-label="No image"
                      className="size-8 rounded-md border border-[#1e1e1e] bg-[#111] flex items-center justify-center shrink-0"
                    >
                      <ImageIcon className="size-3.5 text-[#333]" />
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] font-medium text-white">{item.name}</div>
                    {item.note && <div className="text-[11px] text-[#555] mt-0.5">{item.note}</div>}
                  </div>
                </div>

                <div className="hidden sm:block text-[12px] text-[#666]">{item.brand ?? '—'}</div>

                <div className="hidden sm:block text-[12px] text-[#666]">{item.quantity}</div>

                <div className="hidden sm:flex">
                  {item.trackCondition ? (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[item.status]}`}>
                      {item.status}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#3a3a3a]">N/A</span>
                  )}
                </div>

                <div className="hidden sm:flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => dispatch({ type: 'SET_EDIT_TARGET', item })}
                    className="text-[#555] hover:text-[#aaa] hover:bg-[#141414] text-xs h-7 px-3"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(item._id)}
                    disabled={deletingId === item._id}
                    className="text-[#555] hover:text-red-400 hover:bg-[#141414] text-xs h-7 px-2 disabled:opacity-50"
                  >
                    {deletingId === item._id
                      ? <Loader2 className="size-3 animate-spin" />
                      : 'Delete'}
                  </Button>
                </div>
              </m.div>
            ))}
            </m.div>
          </Card>
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
