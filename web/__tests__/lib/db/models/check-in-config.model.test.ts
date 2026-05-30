import { CheckInConfigModel } from '@/lib/db/models/check-in-config.model';

describe('CheckInConfigModel schema', () => {
  it('has the required fields defined in the schema', () => {
    const paths = CheckInConfigModel.schema.paths;
    expect(paths).toHaveProperty('memberId');
    expect(paths).toHaveProperty('trainerId');
    expect(paths).toHaveProperty('dayOfWeek');
    expect(paths).toHaveProperty('hour');
    expect(paths).toHaveProperty('minute');
    expect(paths).toHaveProperty('active');
    expect(paths).toHaveProperty('reminderSentAt');
  });

  it('defaults active to true and reminderSentAt to null', () => {
    const doc = new CheckInConfigModel({
      memberId: '000000000000000000000001',
      trainerId: '000000000000000000000002',
      dayOfWeek: 4,
      hour: 7,
      minute: 0,
    });
    expect(doc.active).toBe(true);
    expect(doc.reminderSentAt).toBeNull();
  });
});
