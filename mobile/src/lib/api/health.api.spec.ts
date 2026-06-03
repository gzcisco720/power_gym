jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  getInjuries,
  createInjury,
  updateInjury,
  deleteInjury,
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicalHistory,
  saveMedicalHistory,
} from './health.api';
import { Injury, Medication, MedicalHistory } from '../../types/health';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;

const MOCK_INJURY: Injury = {
  _id: 'inj1',
  memberId: 'mem1',
  title: 'Left knee strain',
  status: 'active',
  recordedAt: '2024-01-01T00:00:00.000Z',
  trainerNotes: null,
  memberNotes: null,
  affectedMovements: null,
  injuryType: null,
  bodyPart: null,
  bodySide: null,
  painAtRest: null,
  painDuringExercise: null,
  mechanism: null,
  aggravatingFactors: null,
  relievingFactors: null,
  seenDoctor: false,
  doctorRestrictions: null,
  rehabilitationStatus: null,
  resolvedAt: null,
  createdByRole: 'member',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_MEDICATION: Medication = {
  _id: 'med1',
  memberId: 'mem1',
  name: 'Ibuprofen',
  purpose: 'Pain relief',
  duration: 'short_term',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: null,
  notes: null,
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_MEDICAL_HISTORY: MedicalHistory = {
  _id: 'mh1',
  memberId: 'mem1',
  chronicConditions: [],
  surgeries: null,
  allergies: null,
  familyHistory: null,
  currentDoctor: null,
  emergencyContact: null,
  pregnancyStatus: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('health.api', () => {
  describe('getInjuries', () => {
    it('calls apiClient with GET /health/injuries and returns the parsed array', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_INJURY] });

      const result = await getInjuries();

      expect(mockGet).toHaveBeenCalledWith('/health/injuries');
      expect(result).toEqual([MOCK_INJURY]);
    });
  });

  describe('createInjury', () => {
    it('calls apiClient with POST /health/injuries and the dto as JSON body', async () => {
      const dto = { title: 'Left knee strain' };
      mockPost.mockResolvedValueOnce({ data: MOCK_INJURY });

      const result = await createInjury(dto);

      expect(mockPost).toHaveBeenCalledWith('/health/injuries', dto);
      expect(result).toEqual(MOCK_INJURY);
    });
  });

  describe('updateInjury', () => {
    it('calls apiClient with PATCH /health/injuries/:id and the dto body', async () => {
      const dto = { status: 'resolved' as const };
      const updated = { ...MOCK_INJURY, status: 'resolved' as const };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateInjury('inj1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/health/injuries/inj1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteInjury', () => {
    it('calls apiClient with DELETE /health/injuries/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteInjury('inj1');

      expect(mockDelete).toHaveBeenCalledWith('/health/injuries/inj1');
    });
  });

  describe('getMedications', () => {
    it('calls apiClient with GET /health/medications and returns the parsed array', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_MEDICATION] });

      const result = await getMedications();

      expect(mockGet).toHaveBeenCalledWith('/health/medications');
      expect(result).toEqual([MOCK_MEDICATION]);
    });
  });

  describe('createMedication', () => {
    it('calls apiClient with POST /health/medications and the dto as JSON body', async () => {
      const dto = {
        name: 'Ibuprofen',
        purpose: 'Pain relief',
        duration: 'short_term' as const,
        startDate: '2024-01-01',
      };
      mockPost.mockResolvedValueOnce({ data: MOCK_MEDICATION });

      const result = await createMedication(dto);

      expect(mockPost).toHaveBeenCalledWith('/health/medications', dto);
      expect(result).toEqual(MOCK_MEDICATION);
    });
  });

  describe('updateMedication', () => {
    it('calls apiClient with PATCH /health/medications/:id and the dto body', async () => {
      const dto = { status: 'ended' as const };
      const updated = { ...MOCK_MEDICATION, status: 'ended' as const };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateMedication('med1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/health/medications/med1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteMedication', () => {
    it('calls apiClient with DELETE /health/medications/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteMedication('med1');

      expect(mockDelete).toHaveBeenCalledWith('/health/medications/med1');
    });
  });

  describe('getMedicalHistory', () => {
    it('calls apiClient with GET /health/medical-background and returns the record', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_MEDICAL_HISTORY });

      const result = await getMedicalHistory();

      expect(mockGet).toHaveBeenCalledWith('/health/medical-background');
      expect(result).toEqual(MOCK_MEDICAL_HISTORY);
    });
  });

  describe('saveMedicalHistory', () => {
    it('calls apiClient with PUT /health/medical-background and the dto body', async () => {
      const dto = { chronicConditions: ['Asthma'], allergies: 'Peanuts' };
      const saved = { ...MOCK_MEDICAL_HISTORY, chronicConditions: ['Asthma'], allergies: 'Peanuts' };
      mockPut.mockResolvedValueOnce({ data: saved });

      const result = await saveMedicalHistory(dto);

      expect(mockPut).toHaveBeenCalledWith('/health/medical-background', dto);
      expect(result).toEqual(saved);
    });
  });
});
