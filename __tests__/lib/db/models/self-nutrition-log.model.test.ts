import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

describe('SelfNutritionLogModel', () => {
  it('exposes the expected schema paths', () => {
    const paths = SelfNutritionLogModel.schema.paths;
    expect(paths.userId.instance).toBe('ObjectId');
    expect(paths.date.instance).toBe('String');
    expect(paths.sourceTemplateId.instance).toBe('ObjectId');
    expect(paths.sourceTemplateDayTypeName.instance).toBe('String');
    expect(paths.dayLabel.instance).toBe('String');
    expect(paths.dayCompleted.instance).toBe('Boolean');
    expect(paths.meals).toBeDefined();
  });

  it('declares a unique index on userId+date', () => {
    const indexes = SelfNutritionLogModel.schema.indexes();
    const match = indexes.find(([keys]) => keys.userId === 1 && keys.date === 1);
    expect(match).toBeDefined();
    expect(match?.[1]).toMatchObject({ unique: true });
  });
});
