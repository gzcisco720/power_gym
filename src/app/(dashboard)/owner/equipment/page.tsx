import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import { EquipmentClient } from './_components/equipment-client';
import { PageHeader } from '@/components/shared/page-header';
import type { EquipmentCategory, EquipmentStatus } from '@/lib/db/models/equipment.model';

interface EquipmentRow {
  _id: string;
  name: string;
  category: EquipmentCategory;
  quantity: number;
  status: EquipmentStatus;
  purchasedAt: string | null;
  notes: string | null;
}

export default async function OwnerEquipmentPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoEquipmentRepository().findAll();
  const items: EquipmentRow[] = raw.map((e) => ({
    _id: e._id.toString(),
    name: e.name,
    category: e.category,
    quantity: e.quantity,
    status: e.status,
    purchasedAt: e.purchasedAt ? e.purchasedAt.toISOString() : null,
    notes: e.notes,
  }));

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} in catalogue`}
      />
      <div className="px-4 sm:px-8 py-7">
        <EquipmentClient initialItems={items} />
      </div>
    </div>
  );
}
