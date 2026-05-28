/** @jest-environment node */
import { MemberInjuryModel } from '@/lib/db/models/member-injury.model';

describe('MemberInjuryModel schema', () => {
  it('requires memberId and title', () => {
    const doc = new MemberInjuryModel({});
    const err = doc.validateSync();
    expect(err?.errors['memberId']).toBeDefined();
    expect(err?.errors['title']).toBeDefined();
  });

  it('defaults status to active', () => {
    const doc = new MemberInjuryModel({ memberId: '507f1f77bcf86cd799439011', title: 'Test' });
    expect(doc.status).toBe('active');
  });

  it('has new extended fields with correct defaults', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      createdByRole: 'trainer',
    });
    expect(doc.injuryType).toBeNull();
    expect(doc.bodyPart).toBeNull();
    expect(doc.bodySide).toBeNull();
    expect(doc.painAtRest).toBeNull();
    expect(doc.painDuringExercise).toBeNull();
    expect(doc.mechanism).toBeNull();
    expect(doc.aggravatingFactors).toBeNull();
    expect(doc.relievingFactors).toBeNull();
    expect(doc.seenDoctor).toBe(false);
    expect(doc.doctorRestrictions).toBeNull();
    expect(doc.rehabilitationStatus).toBeNull();
    expect(doc.resolvedAt).toBeNull();
    expect(doc.createdByRole).toBe('trainer');
  });

  it('defaults createdByRole to trainer', () => {
    const doc = new MemberInjuryModel({ memberId: '507f1f77bcf86cd799439011', title: 'Test' });
    expect(doc.createdByRole).toBe('trainer');
  });

  it('rejects invalid injuryType', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      injuryType: 'invalid',
      createdByRole: 'trainer',
    });
    const err = doc.validateSync();
    expect(err?.errors['injuryType']).toBeDefined();
  });

  it('rejects painAtRest above 10', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      painAtRest: 11,
      createdByRole: 'trainer',
    });
    const err = doc.validateSync();
    expect(err?.errors['painAtRest']).toBeDefined();
  });
});
