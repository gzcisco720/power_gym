/**
 * Stage 5 unit tests — MemberNutritionTab
 *
 * Tests:
 * 1. Day-type cards render kcal + protein/carbs/fat targets from the active plan
 * 2. Day-type macro target = sum of meals[].items[] macros
 * 3. Log row shows actual kcal/macros (summed from log meals) beside dimmed target values
 * 4. "Logged" emerald indicator shown only when the log has ≥1 meal item
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetchMemberNutritionHistory = jest.fn();
const mockFetchMemberNutritionPlan = jest.fn();

jest.mock('../../../lib/api/nutrition.api', () => ({
  fetchMemberNutritionHistory: (...args: unknown[]) =>
    mockFetchMemberNutritionHistory(...args),
  fetchMemberNutritionPlan: (...args: unknown[]) =>
    mockFetchMemberNutritionPlan(...args),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { MemberNutritionTab } from './MemberNutritionTab';
import { ActiveNutritionPlan, NutritionDailyLog, DayType, DailyLogMeal } from '../../../types/nutrition';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDayType(overrides: Partial<DayType> = {}): DayType {
  return {
    name: 'Training Day',
    meals: [
      {
        name: 'Breakfast',
        order: 1,
        items: [
          { foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 },
          { foodName: 'Protein', quantityG: 30, kcal: 120, protein: 24, carbs: 2, fat: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActiveNutritionPlan> = {}): ActiveNutritionPlan {
  return {
    _id: 'plan1',
    name: 'Cut Plan',
    templateId: 'tpl1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    dayTypes: [makeDayType()],
    todayDayTypeName: 'Training Day',
    ...overrides,
  };
}

function makeLogMeal(overrides: Partial<DailyLogMeal> = {}): DailyLogMeal {
  return {
    name: 'Breakfast',
    order: 1,
    items: [
      { foodName: 'Oats', quantityG: 60, kcal: 225, protein: 7, carbs: 40, fat: 4 },
    ],
    ...overrides,
  };
}

function makeLog(overrides: Partial<NutritionDailyLog> = {}): NutritionDailyLog {
  return {
    _id: 'log1',
    memberId: 'mem1',
    planId: 'plan1',
    date: '2026-06-06',
    dayTypeName: 'Training Day',
    meals: [makeLogMeal()],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchMemberNutritionHistory.mockResolvedValue([]);
  mockFetchMemberNutritionPlan.mockResolvedValue(null);
});

describe('MemberNutritionTab', () => {
  describe('day type cards', () => {
    it('renders kcal target and protein/carbs/fat target badges per day type from the active plan', async () => {
      const plan = makePlan();
      // kcal = 300 + 120 = 420, protein = 10 + 24 = 34, carbs = 54 + 2 = 56, fat = 6 + 1 = 7
      let resolved: () => void;
      const waitForPlan = new Promise<void>((r) => { resolved = r; });
      mockFetchMemberNutritionPlan.mockImplementation(async () => {
        resolved();
        return plan;
      });

      const { getByTestId } = render(
        <MemberNutritionTab
          memberId="mem1"
          activePlan={null}
          onAssignPress={jest.fn()}
        />,
      );

      await act(async () => { await waitForPlan; });

      expect(getByTestId('day-type-card-Training Day')).toBeTruthy();
      expect(getByTestId('day-type-kcal-Training Day')).toBeTruthy();
      expect(getByTestId('day-type-protein-Training Day')).toBeTruthy();
      expect(getByTestId('day-type-carbs-Training Day')).toBeTruthy();
      expect(getByTestId('day-type-fat-Training Day')).toBeTruthy();
    });

    it('computes day type macro target as the sum of its meals[].items[] macros', async () => {
      const plan = makePlan();
      let resolved: () => void;
      const waitForPlan = new Promise<void>((r) => { resolved = r; });
      mockFetchMemberNutritionPlan.mockImplementation(async () => {
        resolved();
        return plan;
      });

      const { getByTestId } = render(
        <MemberNutritionTab
          memberId="mem1"
          activePlan={null}
          onAssignPress={jest.fn()}
        />,
      );

      await act(async () => { await waitForPlan; });

      // kcal = 300 + 120 = 420
      expect(String(getByTestId('day-type-kcal-Training Day').props.children)).toContain('420');
      // protein = 34g
      expect(String(getByTestId('day-type-protein-Training Day').props.children)).toContain('34');
      // carbs = 56g
      expect(String(getByTestId('day-type-carbs-Training Day').props.children)).toContain('56');
      // fat = 7g
      expect(String(getByTestId('day-type-fat-Training Day').props.children)).toContain('7');
    });
  });

  describe('log row', () => {
    it('shows actual kcal/macros (summed from log meals) beside dimmed target values', async () => {
      const plan = makePlan();
      // Actual log has 1 meal item: kcal=225, protein=7, carbs=40, fat=4
      const log = makeLog({ _id: 'log1' });

      let resolved: () => void;
      const waitForData = new Promise<void>((r) => { resolved = r; });
      mockFetchMemberNutritionPlan.mockImplementation(async () => {
        resolved();
        return plan;
      });
      mockFetchMemberNutritionHistory.mockResolvedValue([log]);

      const { getByTestId } = render(
        <MemberNutritionTab
          memberId="mem1"
          activePlan={null}
          onAssignPress={jest.fn()}
        />,
      );

      await act(async () => { await waitForData; });

      expect(getByTestId('log-actual-kcal-log1')).toBeTruthy();
      expect(getByTestId('log-target-kcal-log1')).toBeTruthy();
    });

    it('shows "Logged" emerald indicator only when the log has ≥1 meal item', async () => {
      // Log with items — should show Logged
      const logWithItems = makeLog({ _id: 'log-with' });
      // Log with no items — should NOT show Logged
      const logWithout = makeLog({
        _id: 'log-without',
        meals: [{ name: 'Breakfast', order: 1, items: [] }],
      });

      let resolved: () => void;
      const waitForData = new Promise<void>((r) => { resolved = r; });
      mockFetchMemberNutritionHistory.mockImplementation(async () => {
        resolved();
        return [logWithItems, logWithout];
      });

      const { getByTestId, queryByTestId } = render(
        <MemberNutritionTab
          memberId="mem1"
          activePlan={null}
          onAssignPress={jest.fn()}
        />,
      );

      await act(async () => { await waitForData; });

      expect(getByTestId('log-logged-indicator-log-with')).toBeTruthy();
      expect(queryByTestId('log-logged-indicator-log-without')).toBeNull();
    });
  });
});
