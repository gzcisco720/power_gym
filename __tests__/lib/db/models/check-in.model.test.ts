import { CheckInModel } from '@/lib/db/models/check-in.model';

describe('CheckInModel schema', () => {
  it('has all metric fields defined', () => {
    const paths = CheckInModel.schema.paths;
    const expected = [
      'memberId', 'trainerId', 'submittedAt',
      'sleepQuality', 'stress', 'fatigue', 'hunger', 'recovery', 'energy', 'digestion',
      'weight', 'waist', 'steps', 'exerciseMinutes', 'walkRunDistance', 'sleepHours',
      'dietDetails', 'stuckToDiet', 'wellbeing', 'notes', 'photos',
    ];
    expected.forEach((field) => expect(paths).toHaveProperty(field));
  });

  it('defaults optional numeric fields to null and photos to empty array', () => {
    const doc = new CheckInModel({
      memberId: '000000000000000000000001',
      trainerId: '000000000000000000000002',
      submittedAt: new Date(),
      sleepQuality: 7, stress: 3, fatigue: 4,
      hunger: 5, recovery: 6, energy: 8, digestion: 7,
      dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '',
    });
    expect(doc.weight).toBeNull();
    expect(doc.photos).toEqual([]);
  });
});
