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
} from './nutrition-templates.api';
import {
  NutritionTemplate,
  CreateNutritionTemplateDto,
  UpdateNutritionTemplateDto,
} from '../../types/nutrition-templates';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const MOCK_TEMPLATE: NutritionTemplate = {
  _id: 'nt1',
  name: 'Cut Day',
  description: null,
  createdBy: 'user1',
  dayTypes: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('nutrition-templates.api', () => {
  describe('fetchTemplates', () => {
    it('GETs /nutrition-templates and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_TEMPLATE] });

      const result = await fetchTemplates();

      expect(mockGet).toHaveBeenCalledWith('/nutrition-templates');
      expect(result).toEqual([MOCK_TEMPLATE]);
    });
  });

  describe('createTemplate', () => {
    it('POSTs /nutrition-templates with the dto and returns the created template', async () => {
      const dto: CreateNutritionTemplateDto = { name: 'Cut Day', dayTypes: [] };
      mockPost.mockResolvedValueOnce({ data: MOCK_TEMPLATE });

      const result = await createTemplate(dto);

      expect(mockPost).toHaveBeenCalledWith('/nutrition-templates', dto);
      expect(result).toEqual(MOCK_TEMPLATE);
    });
  });

  describe('updateTemplate', () => {
    it('PATCHes /nutrition-templates/:id with name and dayTypes', async () => {
      const dto: UpdateNutritionTemplateDto = { name: 'Bulk Day', dayTypes: [] };
      const updated = { ...MOCK_TEMPLATE, name: 'Bulk Day' };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateTemplate('nt1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/nutrition-templates/nt1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTemplate', () => {
    it('DELETEs /nutrition-templates/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteTemplate('nt1');

      expect(mockDelete).toHaveBeenCalledWith('/nutrition-templates/nt1');
    });
  });
});
