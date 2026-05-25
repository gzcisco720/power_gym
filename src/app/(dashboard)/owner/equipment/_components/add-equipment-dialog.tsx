'use client';

import { useReducer, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEquipmentImageSignatureAction } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import gymEquipmentCatalog from '@/../context/data/gym_equipment.json';

const CATALOG: { id: string; name: string }[] = gymEquipmentCatalog.equipment;

export interface NewEquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
  nextServiceDate: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (item: NewEquipmentItem) => void;
}

interface AddEquipmentState {
  name: string;
  brand: string;
  quantity: string;
  status: EquipmentStatus;
  note: string;
  images: string[];
  trackCondition: boolean;
  nextServiceDate: string;
  uploadingImages: boolean;
  saving: boolean;
  suggestions: { id: string; name: string }[];
}

type AddEquipmentAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_BRAND'; value: string }
  | { type: 'SET_QUANTITY'; value: string }
  | { type: 'SET_STATUS'; value: EquipmentStatus }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_IMAGES'; value: string[] }
  | { type: 'SET_TRACK_CONDITION'; value: boolean }
  | { type: 'SET_NEXT_SERVICE_DATE'; value: string }
  | { type: 'SET_UPLOADING_IMAGES'; value: boolean }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_SUGGESTIONS'; value: { id: string; name: string }[] }
  | { type: 'RESET' };

function addEquipmentReducer(state: AddEquipmentState, action: AddEquipmentAction): AddEquipmentState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_BRAND': return { ...state, brand: action.value };
    case 'SET_QUANTITY': return { ...state, quantity: action.value };
    case 'SET_STATUS': return { ...state, status: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_IMAGES': return { ...state, images: action.value };
    case 'SET_TRACK_CONDITION': return { ...state, trackCondition: action.value };
    case 'SET_NEXT_SERVICE_DATE': return { ...state, nextServiceDate: action.value };
    case 'SET_UPLOADING_IMAGES': return { ...state, uploadingImages: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_SUGGESTIONS': return { ...state, suggestions: action.value };
    case 'RESET': return { name: '', brand: '', quantity: '1', status: 'active', note: '', images: [], trackCondition: false, nextServiceDate: '', uploadingImages: false, saving: false, suggestions: [] };
    default: return state;
  }
}

export function AddEquipmentDialog({ open, onClose, onCreated }: Props) {
  const [state, dispatch] = useReducer(addEquipmentReducer, {
    name: '', brand: '', quantity: '1', status: 'active', note: '', images: [],
    trackCondition: false, nextServiceDate: '', uploadingImages: false, saving: false, suggestions: [],
  });
  const { name, brand, quantity, status, note, images, trackCondition, nextServiceDate, uploadingImages, saving, suggestions } = state;
  const suggestionsRef = useRef<HTMLDivElement>(null);

  function reset() {
    dispatch({ type: 'RESET' });
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleNameChange(value: string) {
    dispatch({ type: 'SET_NAME', value });
    if (value.trim().length < 2) { dispatch({ type: 'SET_SUGGESTIONS', value: [] }); return; }
    const lower = value.toLowerCase();
    dispatch({ type: 'SET_SUGGESTIONS', value: CATALOG.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 8) });
  }

  function selectSuggestion(entry: { id: string; name: string }) {
    dispatch({ type: 'SET_NAME', value: entry.name });
    dispatch({ type: 'SET_SUGGESTIONS', value: [] });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 5) { toast.error('Maximum 5 images'); return; }
    dispatch({ type: 'SET_UPLOADING_IMAGES', value: true });
    try {
      const result = await getEquipmentImageSignatureAction();
      if (result.error) { toast.error(result.error); return; }
      const urls = await Promise.all(files.map((file) => uploadFile(file, result.config!)));
      dispatch({ type: 'SET_IMAGES', value: [...images, ...urls] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      dispatch({ type: 'SET_UPLOADING_IMAGES', value: false });
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const res = await fetch('/api/owner/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          quantity: parseInt(quantity) || 1,
          status: trackCondition ? status : 'active',
          images,
          note: note.trim() || null,
          trackCondition,
          nextServiceDate: trackCondition && nextServiceDate ? nextServiceDate : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? 'Failed to add equipment');
        return;
      }
      const raw = await res.json() as NewEquipmentItem;
      onCreated({
        ...raw,
        images: raw.images ?? [],
        brand: raw.brand ?? null,
        note: raw.note ?? null,
      });
      toast.success('Equipment added');
      handleClose();
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-[#0c0c0c] border-[#1a1a1a] text-white max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-[15px] font-semibold">Add Equipment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5 relative">
            <label htmlFor="add-eq-name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Name</label>
            <Input
              id="add-eq-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setTimeout(() => dispatch({ type: 'SET_SUGGESTIONS', value: [] }), 150)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
              placeholder="Search equipment type…"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div ref={suggestionsRef} className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#111] border border-[#222] rounded-lg overflow-hidden shadow-xl">
                {suggestions.map((s) => (
                  <button key={s.id} type="button" onMouseDown={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2 text-[13px] text-[#ccc] hover:bg-[#1a1a1a] transition-colors">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="add-eq-brand" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Brand (optional)</label>
              <Input id="add-eq-brand" value={brand} onChange={(e) => dispatch({ type: 'SET_BRAND', value: e.target.value })}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white" placeholder="e.g. Life Fitness" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-eq-quantity" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Quantity</label>
              <Input id="add-eq-quantity" type="number" min={1} value={quantity} onChange={(e) => dispatch({ type: 'SET_QUANTITY', value: e.target.value })}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-white">Track condition status</p>
              <p className="text-[11px] text-[#555] mt-0.5">Enable for machines, disable for consumables like plates</p>
            </div>
            <button
              type="button"
              aria-label="Track condition status"
              onClick={() => dispatch({ type: 'SET_TRACK_CONDITION', value: !trackCondition })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${trackCondition ? 'bg-white' : 'bg-[#333]'}`}
            >
              <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-black shadow transition-transform ${trackCondition ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {trackCondition && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="add-eq-status" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/40">Initial Status</label>
                <select id="add-eq-status" value={status} onChange={(e) => dispatch({ type: 'SET_STATUS', value: e.target.value as EquipmentStatus })}
                  className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="add-eq-service-date" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/40">Next Service <span className="normal-case text-foreground/40">(optional)</span></label>
                <Input
                  id="add-eq-service-date"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => dispatch({ type: 'SET_NEXT_SERVICE_DATE', value: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="add-eq-note" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Note (optional)</label>
            <Input id="add-eq-note" value={note} onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white" placeholder="Location, condition, etc." />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Images (optional)</p>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((url) => (
                  <div key={url} className="relative group">
                    <Image src={url} alt="equipment" width={56} height={56} className="object-cover rounded-md border border-[#222]" />
                    <button type="button" onClick={() => dispatch({ type: 'SET_IMAGES', value: images.filter((u) => u !== url) })}
                      className="absolute -top-1.5 -right-1.5 bg-[#333] rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="size-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`flex items-center gap-2 cursor-pointer text-[12px] text-[#555] hover:text-[#888] transition-colors ${uploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden"
                aria-label="Upload equipment images"
                disabled={uploadingImages || images.length >= 5} />
              {uploadingImages ? 'Uploading…' : '+ Add images'}
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || !name.trim() || uploadingImages}
            className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Equipment'}
          </Button>
          <Button variant="ghost" onClick={handleClose} className="text-[#777] hover:text-[#aaa] text-sm">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
