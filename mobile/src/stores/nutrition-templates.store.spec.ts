jest.mock('../lib/api/nutrition-templates.api', () => ({
  fetchTemplates: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
}));

import * as nutritionTemplatesApi from '../lib/api/nutrition-templates.api';
import { useNutritionTemplatesStore } from './nutrition-templates.store';
import { NutritionTemplate } from '../types/nutrition-templates';

const mockFetchTemplates = nutritionTemplatesApi.fetchTemplates as jest.MockedFunction<
  typeof nutritionTemplatesApi.fetchTemplates
>;
const mockCreateTemplate = nutritionTemplatesApi.createTemplate as jest.MockedFunction<
  typeof nutritionTemplatesApi.createTemplate
>;
const mockUpdateTemplate = nutritionTemplatesApi.updateTemplate as jest.MockedFunction<
  typeof nutritionTemplatesApi.updateTemplate
>;
const mockDeleteTemplate = nutritionTemplatesApi.deleteTemplate as jest.MockedFunction<
  typeof nutritionTemplatesApi.deleteTemplate
>;

const MOCK_TEMPLATE_1: NutritionTemplate = {
  _id: 'nt1',
  name: 'Cut Day',
  description: null,
  createdBy: 'user1',
  dayTypes: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_TEMPLATE_2: NutritionTemplate = {
  _id: 'nt2',
  name: 'Bulk Day',
  description: null,
  createdBy: 'user1',
  dayTypes: [],
  createdAt: '2024-01-02T00:00:00.000Z',
};

function resetStore() {
  useNutritionTemplatesStore.setState({ items: [], loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useNutritionTemplatesStore', () => {
  describe('fetchTemplates', () => {
    it('populates templates and clears loading on success', async () => {
      mockFetchTemplates.mockResolvedValueOnce([MOCK_TEMPLATE_1, MOCK_TEMPLATE_2]);

      await useNutritionTemplatesStore.getState().fetchTemplates();

      const state = useNutritionTemplatesStore.getState();
      expect(state.items).toEqual([MOCK_TEMPLATE_1, MOCK_TEMPLATE_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading on failure', async () => {
      mockFetchTemplates.mockRejectedValueOnce(new Error('Network error'));

      await useNutritionTemplatesStore.getState().fetchTemplates();

      const state = useNutritionTemplatesStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('removeTemplate', () => {
    it('deletes via api and removes the template from state', async () => {
      useNutritionTemplatesStore.setState({ items: [MOCK_TEMPLATE_1, MOCK_TEMPLATE_2] });
      mockDeleteTemplate.mockResolvedValueOnce(undefined);

      await useNutritionTemplatesStore.getState().removeTemplate('nt1');

      expect(mockDeleteTemplate).toHaveBeenCalledWith('nt1');
      const state = useNutritionTemplatesStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(MOCK_TEMPLATE_2);
    });
  });

  describe('createTemplate', () => {
    it('calls api.createTemplate and prepends the returned template to state', async () => {
      useNutritionTemplatesStore.setState({ items: [MOCK_TEMPLATE_2] });
      mockCreateTemplate.mockResolvedValueOnce(MOCK_TEMPLATE_1);

      await useNutritionTemplatesStore.getState().createTemplate({ name: 'Cut Day', dayTypes: [] });

      expect(mockCreateTemplate).toHaveBeenCalledWith({ name: 'Cut Day', dayTypes: [] });
      const state = useNutritionTemplatesStore.getState();
      expect(state.items[0]).toEqual(MOCK_TEMPLATE_1);
      expect(state.items[1]).toEqual(MOCK_TEMPLATE_2);
      expect(state.items).toHaveLength(2);
    });
  });

  describe('updateTemplate', () => {
    it('calls api.updateTemplate and replaces the matching template in state by _id', async () => {
      useNutritionTemplatesStore.setState({ items: [MOCK_TEMPLATE_1, MOCK_TEMPLATE_2] });
      const updated: NutritionTemplate = { ...MOCK_TEMPLATE_1, name: 'Modified Cut Day' };
      mockUpdateTemplate.mockResolvedValueOnce(updated);

      await useNutritionTemplatesStore
        .getState()
        .updateTemplate('nt1', { name: 'Modified Cut Day', dayTypes: [] });

      expect(mockUpdateTemplate).toHaveBeenCalledWith('nt1', {
        name: 'Modified Cut Day',
        dayTypes: [],
      });
      const state = useNutritionTemplatesStore.getState();
      expect(state.items[0]).toEqual(updated);
      expect(state.items[1]).toEqual(MOCK_TEMPLATE_2);
    });
  });
});
