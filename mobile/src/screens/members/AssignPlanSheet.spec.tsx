/**
 * Stage 3 unit tests — AssignPlanSheet
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockAssignPlanApi = jest.fn();

jest.mock('../../lib/api/training.api', () => ({
  assignPlan: (...args: Parameters<typeof mockAssignPlanApi>) => mockAssignPlanApi(...args),
}));

const mockFetchTemplates = jest.fn();

jest.mock('../../stores/training-templates.store', () => ({
  useTrainingTemplatesStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useTrainingTemplatesStore } from '../../stores/training-templates.store';
import { PlanTemplate } from '../../types/training-templates';
import { AssignPlanSheet } from './AssignPlanSheet';

const mockUseTemplatesStore = useTrainingTemplatesStore as jest.MockedFunction<typeof useTrainingTemplatesStore>;

function makeTemplate(overrides: Partial<PlanTemplate> = {}): PlanTemplate {
  return {
    _id: 'tpl1',
    name: 'Strength Plan',
    description: null,
    days: [],
    createdBy: 'owner1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupStore(templates: PlanTemplate[], loading = false) {
  const state = {
    items: templates,
    loading,
    error: null,
    fetchTemplates: mockFetchTemplates,
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    createAndAdd: jest.fn(),
    updateAndSync: jest.fn(),
    removeAndDelete: jest.fn(),
  };

  mockUseTemplatesStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchTemplates.mockResolvedValue(undefined);
  mockAssignPlanApi.mockResolvedValue({ _id: 'plan1', name: 'Strength Plan', templateId: 'tpl1', assignedAt: '2026-06-01T00:00:00.000Z', days: [] });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssignPlanSheet', () => {
  it('renders a template-result-{name} row per template and calls assignPlan on tap', async () => {
    const templates = [
      makeTemplate({ _id: 'tpl1', name: 'Strength Plan' }),
      makeTemplate({ _id: 'tpl2', name: 'Cardio Plan' }),
    ];
    setupStore(templates);

    const onAssigned = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <AssignPlanSheet
        testID="assign-plan-sheet"
        memberId="mem1"
        onAssigned={onAssigned}
        onClose={onClose}
      />,
    );

    expect(getByTestId('assign-plan-sheet')).toBeTruthy();
    expect(getByTestId('template-result-Strength Plan')).toBeTruthy();
    expect(getByTestId('template-result-Cardio Plan')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('template-result-Strength Plan'));
    });

    expect(mockAssignPlanApi).toHaveBeenCalledWith('mem1', 'tpl1');
    expect(onAssigned).toHaveBeenCalledWith(expect.objectContaining({ _id: 'plan1' }));
    expect(onClose).toHaveBeenCalled();
  });
});
