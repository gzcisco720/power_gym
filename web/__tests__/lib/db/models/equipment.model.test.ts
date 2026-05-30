/** @jest-environment node */

describe('EquipmentModel schema', () => {
  it('requires name field', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({});
    const err = doc.validateSync();
    expect(err?.errors['name']).toBeDefined();
  });

  it('rejects invalid status', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Treadmill', status: 'broken' });
    const err = doc.validateSync();
    expect(err?.errors['status']).toBeDefined();
  });

  it('defaults status to active', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.status).toBe('active');
  });

  it('defaults brand to null', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.brand).toBeNull();
  });

  it('defaults images to empty array', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.images).toEqual([]);
  });

  it('defaults note to null', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.note).toBeNull();
  });

  it('accepts valid equipment with all fields', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({
      name: 'Smith Machine',
      status: 'active',
      brand: 'Matrix',
      images: ['https://res.cloudinary.com/demo/image/upload/eq1.jpg'],
      note: 'First floor, near free weights',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('does not have category field', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Smith Machine', category: 'strength' });
    expect((doc as Record<string, unknown>)['category']).toBeUndefined();
  });

  it('defaults quantity to 1', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Smith Machine' });
    expect(doc.quantity).toBe(1);
  });

  it('rejects quantity below 1', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell', quantity: 0 });
    const err = doc.validateSync();
    expect(err?.errors['quantity']).toBeDefined();
  });

  it('defaults trackCondition to false', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.trackCondition).toBe(false);
  });

  it('accepts trackCondition true', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Treadmill', trackCondition: true });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.trackCondition).toBe(true);
  });

  it('defaults nextServiceDate to null', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const doc = new EquipmentModel({ name: 'Barbell' });
    expect(doc.nextServiceDate).toBeNull();
  });

  it('accepts a valid Date for nextServiceDate', async () => {
    const { EquipmentModel } = await import('@/lib/db/models/equipment.model');
    const date = new Date('2026-12-01');
    const doc = new EquipmentModel({ name: 'Treadmill', nextServiceDate: date });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.nextServiceDate).toEqual(date);
  });
});
