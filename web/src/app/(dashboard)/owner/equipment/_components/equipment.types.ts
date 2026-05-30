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
  nextServiceDate: string | null;
}

export const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-foreground/8 text-foreground/40 border-foreground/10',
};
