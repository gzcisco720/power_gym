import type { EquipmentStatus } from '@/lib/db/models/equipment.model';

export interface EquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
}

export const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-[#333] text-[#666] border-[#222]',
};
