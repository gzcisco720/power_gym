jest.mock('../lib/api/training-templates.api', () => ({
  fetchTemplates: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
}));

import * as templatesApi from '../lib/api/training-templates.api';
import { useTrainingTemplatesStore } from './training-templates.store';
import { PlanTemplate } from '../types/training-templates';

const mockFetchTemplates = templatesApi.fetchTemplates as jest.MockedFunction<
  typeof templatesApi.fetchTemplates
>;
const mockCreateTemplate = templatesApi.createTemplate as jest.MockedFunction<
  typeof templatesApi.createTemplate
>;
const mockUpdateTemplate = templatesApi.updateTemplate as jest.MockedFunction<
  typeof templatesApi.updateTemplate
>;
const mockDeleteTemplate = templatesApi.deleteTemplate as jest.MockedFunction<
  typeof templatesApi.deleteTemplate
>;

const MOCK_TEMPLATE_1: PlanTemplate = {
  _id: 'tpl1',
  name: 'Push Pull Legs',
  description: 'Classic PPL',
  createdBy: 'user1',
  days: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_TEMPLATE_2: PlanTemplate = {
  _id: 'tpl2',
  name: 'Full Body',
  description: null,
  createdBy: 'user1',
  days: [],
  createdAt: '2024-01-02T00:00:00.000Z',
};

function resetStore() {
  useTrainingTemplatesStore.setState({ items: [], loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useTrainingTemplatesStore', () => {
  describe('fetchTemplates', () => {
    it('populates items and clears loading on success', async () => {
      mockFetchTemplates.mockResolvedValueOnce([MOCK_TEMPLATE_1, MOCK_TEMPLATE_2]);

      await useTrainingTemplatesStore.getState().fetchTemplates();

      const state = useTrainingTemplatesStore.getState();
      expect(state.items).toEqual([MOCK_TEMPLATE_1, MOCK_TEMPLATE_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      mockFetchTemplates.mockRejectedValueOnce(new Error('Network error'));

      await useTrainingTemplatesStore.getState().fetchTemplates();

      const state = useTrainingTemplatesStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addItem', () => {
    it('prepends the new template to items', () => {
      useTrainingTemplatesStore.setState({ items: [MOCK_TEMPLATE_2] });

      useTrainingTemplatesStore.getState().addItem(MOCK_TEMPLATE_1);

      const state = useTrainingTemplatesStore.getState();
      expect(state.items[0]).toEqual(MOCK_TEMPLATE_1);
      expect(state.items[1]).toEqual(MOCK_TEMPLATE_2);
      expect(state.items).toHaveLength(2);
    });
  });

  describe('updateItem', () => {
    it('replaces the matching template by id in items', () => {
      useTrainingTemplatesStore.setState({ items: [MOCK_TEMPLATE_1, MOCK_TEMPLATE_2] });
      const updated: PlanTemplate = { ...MOCK_TEMPLATE_1, name: 'Updated PPL' };

      useTrainingTemplatesStore.getState().updateItem(updated);

      const state = useTrainingTemplatesStore.getState();
      expect(state.items[0]).toEqual(updated);
      expect(state.items[1]).toEqual(MOCK_TEMPLATE_2);
    });
  });

  describe('removeItem', () => {
    it('drops the template with the given id from items', () => {
      useTrainingTemplatesStore.setState({ items: [MOCK_TEMPLATE_1, MOCK_TEMPLATE_2] });

      useTrainingTemplatesStore.getState().removeItem('tpl1');

      const state = useTrainingTemplatesStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(MOCK_TEMPLATE_2);
    });
  });
});

// Silence unused mock warnings
void mockCreateTemplate;
void mockUpdateTemplate;
void mockDeleteTemplate;
