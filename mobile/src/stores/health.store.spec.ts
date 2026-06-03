jest.mock('../lib/api/health.api', () => ({
  getInjuries: jest.fn(),
  createInjury: jest.fn(),
  updateInjury: jest.fn(),
  deleteInjury: jest.fn(),
  getMedications: jest.fn(),
  createMedication: jest.fn(),
  updateMedication: jest.fn(),
  deleteMedication: jest.fn(),
  getMedicalHistory: jest.fn(),
  saveMedicalHistory: jest.fn(),
}));

import * as healthApi from '../lib/api/health.api';
import { useHealthStore } from './health.store';
import { Injury, Medication, MedicalHistory } from '../types/health';

const mockGetInjuries = healthApi.getInjuries as jest.MockedFunction<typeof healthApi.getInjuries>;
const mockCreateInjury = healthApi.createInjury as jest.MockedFunction<typeof healthApi.createInjury>;
const mockUpdateInjury = healthApi.updateInjury as jest.MockedFunction<typeof healthApi.updateInjury>;
const mockDeleteInjury = healthApi.deleteInjury as jest.MockedFunction<typeof healthApi.deleteInjury>;
const mockGetMedications = healthApi.getMedications as jest.MockedFunction<typeof healthApi.getMedications>;
const mockCreateMedication = healthApi.createMedication as jest.MockedFunction<typeof healthApi.createMedication>;
const mockSaveMedicalHistory = healthApi.saveMedicalHistory as jest.MockedFunction<typeof healthApi.saveMedicalHistory>;

const MOCK_INJURY_1: Injury = {
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

const MOCK_INJURY_2: Injury = {
  ...MOCK_INJURY_1,
  _id: 'inj2',
  title: 'Shoulder strain',
};

const MOCK_MEDICATION_1: Medication = {
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

const MOCK_MEDICATION_2: Medication = {
  ...MOCK_MEDICATION_1,
  _id: 'med2',
  name: 'Vitamin D',
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

function resetStore() {
  useHealthStore.setState({
    injuries: [],
    injuriesLoading: false,
    injuriesError: null,
    medications: [],
    medicationsLoading: false,
    medicationsError: null,
    medicalHistory: null,
    medicalHistoryLoading: false,
    medicalHistoryError: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useHealthStore', () => {
  describe('fetchInjuries', () => {
    it('sets injuriesLoading true during the call and populates injuries / clears loading on success', async () => {
      let resolveApi!: (value: Injury[]) => void;
      const apiPromise = new Promise<Injury[]>((res) => {
        resolveApi = res;
      });
      mockGetInjuries.mockReturnValueOnce(apiPromise);

      const fetchPromise = useHealthStore.getState().fetchInjuries();

      expect(useHealthStore.getState().injuriesLoading).toBe(true);

      resolveApi([MOCK_INJURY_1, MOCK_INJURY_2]);
      await fetchPromise;

      const state = useHealthStore.getState();
      expect(state.injuries).toEqual([MOCK_INJURY_1, MOCK_INJURY_2]);
      expect(state.injuriesLoading).toBe(false);
      expect(state.injuriesError).toBeNull();
    });

    it('when the api rejects, injuriesLoading returns to false and error is set', async () => {
      mockGetInjuries.mockRejectedValueOnce(new Error('Network error'));

      await useHealthStore.getState().fetchInjuries();

      const state = useHealthStore.getState();
      expect(state.injuriesLoading).toBe(false);
      expect(state.injuriesError).toBe('Network error');
      expect(state.injuries).toEqual([]);
    });
  });

  describe('addInjury', () => {
    it('prepends the returned injury to the injuries array', async () => {
      useHealthStore.setState({ injuries: [MOCK_INJURY_2] });
      mockCreateInjury.mockResolvedValueOnce(MOCK_INJURY_1);

      await useHealthStore.getState().addInjury({ title: 'Left knee strain' });

      const state = useHealthStore.getState();
      expect(state.injuries[0]).toEqual(MOCK_INJURY_1);
      expect(state.injuries[1]).toEqual(MOCK_INJURY_2);
      expect(state.injuries).toHaveLength(2);
    });
  });

  describe('updateInjury', () => {
    it('replaces the matching injury in the array by _id', async () => {
      useHealthStore.setState({ injuries: [MOCK_INJURY_1, MOCK_INJURY_2] });
      const updated = { ...MOCK_INJURY_1, status: 'resolved' as const, resolvedAt: '2024-02-01T00:00:00.000Z' };
      mockUpdateInjury.mockResolvedValueOnce(updated);

      await useHealthStore.getState().updateInjury('inj1', { status: 'resolved' });

      const state = useHealthStore.getState();
      expect(state.injuries[0]).toEqual(updated);
      expect(state.injuries[1]).toEqual(MOCK_INJURY_2);
    });
  });

  describe('deleteInjury', () => {
    it('removes the injury with the given _id from the array', async () => {
      useHealthStore.setState({ injuries: [MOCK_INJURY_1, MOCK_INJURY_2] });
      mockDeleteInjury.mockResolvedValueOnce(undefined);

      await useHealthStore.getState().deleteInjury('inj1');

      const state = useHealthStore.getState();
      expect(state.injuries).toHaveLength(1);
      expect(state.injuries[0]).toEqual(MOCK_INJURY_2);
    });
  });

  describe('fetchMedications', () => {
    it('populates medications and clears medicationsLoading on success', async () => {
      mockGetMedications.mockResolvedValueOnce([MOCK_MEDICATION_1, MOCK_MEDICATION_2]);

      await useHealthStore.getState().fetchMedications();

      const state = useHealthStore.getState();
      expect(state.medications).toEqual([MOCK_MEDICATION_1, MOCK_MEDICATION_2]);
      expect(state.medicationsLoading).toBe(false);
      expect(state.medicationsError).toBeNull();
    });
  });

  describe('saveMedicalHistory', () => {
    it('stores the returned medicalHistory record', async () => {
      const saved = { ...MOCK_MEDICAL_HISTORY, chronicConditions: ['Asthma'], allergies: 'Peanuts' };
      mockSaveMedicalHistory.mockResolvedValueOnce(saved);

      await useHealthStore.getState().saveMedicalHistory({ chronicConditions: ['Asthma'], allergies: 'Peanuts' });

      const state = useHealthStore.getState();
      expect(state.medicalHistory).toEqual(saved);
    });
  });
});

describe('useHealthStore integration', () => {
  it('addMedication → fetchMedications round trip: after addMedication resolves, the new medication is present in medications', async () => {
    useHealthStore.setState({ medications: [] });
    mockCreateMedication.mockResolvedValueOnce(MOCK_MEDICATION_1);
    mockGetMedications.mockResolvedValueOnce([MOCK_MEDICATION_1]);

    await useHealthStore.getState().addMedication({
      name: 'Ibuprofen',
      purpose: 'Pain relief',
      duration: 'short_term',
      startDate: '2024-01-01',
    });

    const state = useHealthStore.getState();
    expect(state.medications.some((m) => m._id === 'med1')).toBe(true);
  });

  it('fetchInjuries when the api rejects → injuriesLoading returns to false and the store does not throw', async () => {
    mockGetInjuries.mockRejectedValueOnce(new Error('Server error'));

    await expect(useHealthStore.getState().fetchInjuries()).resolves.toBeUndefined();

    const state = useHealthStore.getState();
    expect(state.injuriesLoading).toBe(false);
    expect(state.injuriesError).toBeTruthy();
  });
});

// Suppress unused import warnings for mocks used only implicitly
void mockUpdateInjury;
void mockDeleteInjury;
void mockSaveMedicalHistory;
