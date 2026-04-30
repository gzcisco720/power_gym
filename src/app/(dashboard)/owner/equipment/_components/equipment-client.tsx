'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EquipmentCategory, EquipmentStatus } from '@/lib/db/models/equipment.model';

interface EquipmentItem {
  _id: string;
  name: string;
  category: EquipmentCategory;
  quantity: number;
  status: EquipmentStatus;
  purchasedAt: string | null;
  notes: string | null;
}

interface Props {
  initialItems: EquipmentItem[];
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cardio: 'Cardio',
  strength: 'Strength',
  free_weight: 'Free Weight',
  cable: 'Cable',
  other: 'Other',
};

const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-[#333] text-[#666] border-[#222]',
};

export function EquipmentClient({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('other');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/owner/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          quantity: parseInt(quantity) || 1,
          status,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add equipment');
        return;
      }
      const created = (await res.json()) as EquipmentItem;
      setItems((prev) => [...prev, created]);
      setShowForm(false);
      setName('');
      setCategory('other');
      setQuantity('1');
      setStatus('active');
      setNotes('');
      toast.success('Equipment added');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/owner/equipment/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete');
      return;
    }
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success('Equipment deleted');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-white text-black hover:bg-white/90 font-semibold text-sm"
        >
          + Add Equipment
        </Button>
      </div>

      {showForm && (
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="eq-name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Name
            </label>
            <Input
              id="eq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
              placeholder="e.g. Smith Machine"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="eq-category" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
                Category
              </label>
              <select
                id="eq-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
              >
                {(Object.keys(CATEGORY_LABELS) as EquipmentCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="eq-qty" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
                Quantity
              </label>
              <Input
                id="eq-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="eq-notes" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
              Notes (optional)
            </label>
            <Input
              id="eq-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
              placeholder="Location, condition, etc."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-[#777] hover:text-[#aaa] text-sm"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 && !showForm && (
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
          <p className="text-[13px] text-[#777]">No equipment added yet.</p>
        </Card>
      )}

      {items.length > 0 && (
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_120px_60px_100px_80px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">
            <div>Name</div>
            <div>Category</div>
            <div>Qty</div>
            <div>Status</div>
            <div></div>
          </div>
          {items.map((item) => (
            <div
              key={item._id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_60px_100px_80px] items-center px-5 py-3.5 border-b border-[#0f0f0f] last:border-0 gap-2"
            >
              <div>
                <div className="text-[13px] font-medium text-white">{item.name}</div>
                {item.notes && <div className="text-[11px] text-[#555] mt-0.5">{item.notes}</div>}
              </div>
              <div className="hidden sm:block text-[12px] text-[#666]">{CATEGORY_LABELS[item.category]}</div>
              <div className="hidden sm:block text-[12px] text-[#666]">{item.quantity}</div>
              <div className="hidden sm:flex">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(item._id)}
                  className="text-[#555] hover:text-red-400 hover:bg-[#141414] text-xs h-7 px-2"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
