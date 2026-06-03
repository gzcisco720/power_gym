jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './training-templates.api';
import { PlanTemplate, CreatePlanTemplateDto, UpdatePlanTemplateDto } from '../../types/training-templates';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const MOCK_TEMPLATE: PlanTemplate = {
  _id: 'tpl1',
  name: 'Push Pull Legs',
  description: 'Classic PPL',
  createdBy: 'user1',
  days: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('training-templates.api', () => {
  describe('fetchTemplates', () => {
    it('calls GET /plan-templates and returns response data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_TEMPLATE] });

      const result = await fetchTemplates();

      expect(mockGet).toHaveBeenCalledWith('/plan-templates');
      expect(result).toEqual([MOCK_TEMPLATE]);
    });
  });

  describe('createTemplate', () => {
    it('calls POST /plan-templates with the dto and returns the created template', async () => {
      const dto: CreatePlanTemplateDto = { name: 'Push Pull Legs', days: [] };
      mockPost.mockResolvedValueOnce({ data: MOCK_TEMPLATE });

      const result = await createTemplate(dto);

      expect(mockPost).toHaveBeenCalledWith('/plan-templates', dto);
      expect(result).toEqual(MOCK_TEMPLATE);
    });
  });

  describe('updateTemplate', () => {
    it('calls PATCH /plan-templates/:id with the dto and returns response data', async () => {
      const dto: UpdatePlanTemplateDto = { name: 'Updated PPL', days: [] };
      const updated = { ...MOCK_TEMPLATE, name: 'Updated PPL' };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateTemplate('tpl1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/plan-templates/tpl1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTemplate', () => {
    it('calls DELETE /plan-templates/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteTemplate('tpl1');

      expect(mockDelete).toHaveBeenCalledWith('/plan-templates/tpl1');
    });
  });
});
