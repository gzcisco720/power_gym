/** @jest-environment node */

describe('ConditionReportModel schema', () => {
  it('requires equipmentId', async () => {
    const { ConditionReportModel } = await import('@/lib/db/models/condition-report.model');
    const doc = new ConditionReportModel({});
    const err = doc.validateSync();
    expect(err?.errors['equipmentId']).toBeDefined();
  });

  it('requires note', async () => {
    const { ConditionReportModel } = await import('@/lib/db/models/condition-report.model');
    const mongoose = await import('mongoose');
    const doc = new ConditionReportModel({ equipmentId: new mongoose.default.Types.ObjectId() });
    const err = doc.validateSync();
    expect(err?.errors['note']).toBeDefined();
  });

  it('does not have a status field', async () => {
    const { ConditionReportModel } = await import('@/lib/db/models/condition-report.model');
    const mongoose = await import('mongoose');
    const doc = new ConditionReportModel({
      equipmentId: new mongoose.default.Types.ObjectId(),
      note: 'Belt worn',
    });
    expect((doc as Record<string, unknown>)['status']).toBeUndefined();
  });

  it('accepts valid report with note', async () => {
    const { ConditionReportModel } = await import('@/lib/db/models/condition-report.model');
    const mongoose = await import('mongoose');
    const doc = new ConditionReportModel({
      equipmentId: new mongoose.default.Types.ObjectId(),
      note: 'Belt worn, needs replacement',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('sets reportedAt automatically', async () => {
    const { ConditionReportModel } = await import('@/lib/db/models/condition-report.model');
    const mongoose = await import('mongoose');
    const doc = new ConditionReportModel({
      equipmentId: new mongoose.default.Types.ObjectId(),
      note: 'Routine check',
    });
    expect(doc.reportedAt).toBeInstanceOf(Date);
  });
});
