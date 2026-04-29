/** @jest-environment node */

describe('EquipmentModel schema', () => {
  it('requires name field', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({});
    const err = doc.validateSync();
    expect(err?.errors['name']).toBeDefined();
  });

  it('rejects invalid category', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Smith Machine', category: 'flying_machine' });
    const err = doc.validateSync();
    expect(err?.errors['category']).toBeDefined();
  });

  it('rejects invalid status', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Treadmill', status: 'broken' });
    const err = doc.validateSync();
    expect(err?.errors['status']).toBeDefined();
  });

  it('accepts valid equipment with all fields', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({
      name: 'Smith Machine',
      category: 'strength',
      quantity: 2,
      status: 'active',
      purchasedAt: new Date('2024-01-15'),
      notes: 'First floor, near free weights',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('defaults status to active and quantity to 1', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.status).toBe('active');
    expect(doc.quantity).toBe(1);
  });
});
