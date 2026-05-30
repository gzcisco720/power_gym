import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoEquipmentRepository } from '@/lib/repositories/equipment.repository';
import { EquipmentClient } from './_components/equipment-client';
import { PageHeader } from '@/components/shared/page-header';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';

interface EquipmentRow {
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

export default async function OwnerEquipmentPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoEquipmentRepository().findAll();
  const items: EquipmentRow[] = raw.map((e) => ({
    _id: e._id.toString(),
    name: e.name,
    status: e.status,
    brand: e.brand ?? null,
    quantity: e.quantity ?? 1,
    images: e.images ?? [],
    note: e.note ?? null,
    trackCondition: e.trackCondition ?? false,
    nextServiceDate: e.nextServiceDate ? e.nextServiceDate.toISOString() : null,
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
