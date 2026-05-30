import type { EquipmentStatus } from '@/api/equipment';

export const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-foreground/8 text-foreground/40 border-foreground/10',
};
