/** @jest-environment node */
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';

describe('MemberMedicationModel schema', () => {
  it('has correct defaults', () => {
    const doc = new MemberMedicationModel({
      memberId: '507f1f77bcf86cd799439011',
      name: 'Ibuprofen 400mg',
      purpose: 'Pain relief',
      duration: 'short_term',
      startDate: new Date(),
    });
    expect(doc.status).toBe('active');
    expect(doc.endDate).toBeNull();
    expect(doc.notes).toBeNull();
  });

  it('rejects invalid duration', () => {
    const doc = new MemberMedicationModel({
      memberId: '507f1f77bcf86cd799439011',
      name: 'X',
      purpose: 'Y',
      duration: 'forever',
      startDate: new Date(),
    });
    const err = doc.validateSync();
    expect(err?.errors['duration']).toBeDefined();
  });

  it('requires name and duration', () => {
    const doc = new MemberMedicationModel({ memberId: '507f1f77bcf86cd799439011' });
    const err = doc.validateSync();
    expect(err?.errors['name']).toBeDefined();
    expect(err?.errors['duration']).toBeDefined();
  });
});
