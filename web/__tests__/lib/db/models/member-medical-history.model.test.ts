/** @jest-environment node */
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';

describe('MemberMedicalHistoryModel schema', () => {
  it('has correct defaults', () => {
    const doc = new MemberMedicalHistoryModel({ memberId: '507f1f77bcf86cd799439011' });
    expect(doc.chronicConditions).toEqual([]);
    expect(doc.surgeries).toBeNull();
    expect(doc.allergies).toBeNull();
    expect(doc.familyHistory).toBeNull();
    expect(doc.currentDoctor).toBeNull();
    expect(doc.emergencyContact).toBeNull();
    expect(doc.pregnancyStatus).toBeNull();
  });

  it('rejects invalid pregnancyStatus', () => {
    const doc = new MemberMedicalHistoryModel({
      memberId: '507f1f77bcf86cd799439011',
      pregnancyStatus: 'unknown',
    });
    const err = doc.validateSync();
    expect(err?.errors['pregnancyStatus']).toBeDefined();
  });
});
