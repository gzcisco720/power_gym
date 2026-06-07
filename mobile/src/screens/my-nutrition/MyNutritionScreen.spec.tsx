/**
 * Stage 3 + Stage 5 unit tests — MyNutritionScreen
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockFetchToday = jest.fn();

jest.mock('../../stores/nutrition.store', () => ({
  useNutritionStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useNutritionStore } from '../../stores/nutrition.store';
import { ActiveNutritionPlan, NutritionDailyLog, MacroSummary, DayType } from '../../types/nutrition';
import { MyNutritionScreen } from './MyNutritionScreen';

const mockUseNutritionStore = useNutritionStore as jest.MockedFunction<typeof useNutritionStore>;

function makeDayType(name = 'Training Day'): DayType {
  return {
    name,
    meals: [
      {
        name: 'Breakfast',
        order: 1,
        items: [
          {
            foodName: 'Oats',
            quantityG: 80,
            kcal: 300,
            protein: 10,
            carbs: 50,
            fat: 5,
          },
        ],
      },
      {
        name: 'Lunch',
        order: 2,
        items: [],
      },
    ],
  };
}

function makePlan(overrides: Partial<ActiveNutritionPlan> = {}): ActiveNutritionPlan {
  return {
    _id: 'plan1',
    name: 'Lean Gain Plan',
    templateId: 'tpl1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    dayTypes: [makeDayType('Training Day'), makeDayType('Rest Day')],
    todayDayTypeName: 'Training Day',
    ...overrides,
  };
}

function makeTodayLog(overrides: Partial<NutritionDailyLog> = {}): NutritionDailyLog {
  return {
    _id: 'log1',
    memberId: 'mem1',
    planId: 'plan1',
    date: '2026-06-04',
    dayTypeName: 'Training Day',
    meals: [
      { name: 'Breakfast', order: 1, items: [] },
      { name: 'Lunch', order: 2, items: [] },
    ],
    ...overrides,
  };
}

function makeSummary(loggedKcal = 0): MacroSummary {
  return {
    logged: { kcal: loggedKcal, protein: 0, carbs: 0, fat: 0 },
    target: { kcal: 2000, protein: 150, carbs: 200, fat: 70 },
  };
}

function setupStore(
  plan: ActiveNutritionPlan | null,
  todayLog: NutritionDailyLog | null = null,
  summary: MacroSummary | null = null,
  loading = false,
) {
  const state = {
    plan,
    todayLog,
    summary,
    history: [] as { date: string; logged: boolean; loggedKcal: number }[],
    loading,
    error: null,
    fetchToday: mockFetchToday,
    logFood: jest.fn(),
    loggedItemCount: jest.fn().mockReturnValue(0),
  };

  mockUseNutritionStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchToday.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MyNutritionScreen', () => {
  it('renders nutrition-day-type-{name} and a meal-card per prescribed meal when a plan is loaded', () => {
    const plan = makePlan();
    const log = makeTodayLog();
    setupStore(plan, log, makeSummary());

    const { getByTestId } = render(<MyNutritionScreen />);

    expect(getByTestId('screen-MyNutrition')).toBeTruthy();
    expect(getByTestId('nutrition-day-type-Training Day')).toBeTruthy();
    // Today's log has 2 meals (Breakfast order 1, Lunch order 2)
    expect(getByTestId('meal-card-1')).toBeTruthy();
    expect(getByTestId('meal-card-2')).toBeTruthy();
  });

  it('renders nutrition-empty and no meal cards when the store plan is null', () => {
    setupStore(null);

    const { getByTestId, queryByTestId } = render(<MyNutritionScreen />);

    expect(getByTestId('my-nutrition-empty')).toBeTruthy();
    expect(queryByTestId('meal-card-1')).toBeNull();
  });

  it('renders macro-summary showing logged and target kcal from the store summary', () => {
    const plan = makePlan();
    const log = makeTodayLog();
    const summary = makeSummary(350);
    setupStore(plan, log, summary);

    const { getByTestId, getByText } = render(<MyNutritionScreen />);

    expect(getByTestId('macro-summary')).toBeTruthy();
    expect(getByText('350')).toBeTruthy();
    expect(getByText('2000')).toBeTruthy();
  });

  it('renders a "Log freely" CTA instead of only an empty state when no plan is assigned', () => {
    setupStore(null);

    const { getByTestId } = render(<MyNutritionScreen />);

    expect(getByTestId('log-freely-cta')).toBeTruthy();
  });

  it('tapping "Log freely" CTA navigates to FreeLog when no plan is assigned', () => {
    setupStore(null);

    const { getByTestId } = render(<MyNutritionScreen />);

    fireEvent.press(getByTestId('log-freely-cta'));

    expect(mockNavigate).toHaveBeenCalledWith('FreeLog');
  });

  it('renders a "Log freely" option alongside plan meals when a plan exists', () => {
    const plan = makePlan();
    const log = makeTodayLog();
    setupStore(plan, log, makeSummary());

    const { getByTestId } = render(<MyNutritionScreen />);

    expect(getByTestId('log-freely-option')).toBeTruthy();
  });

  it('tapping "Log freely" option navigates to FreeLog when a plan exists', () => {
    const plan = makePlan();
    const log = makeTodayLog();
    setupStore(plan, log, makeSummary());

    const { getByTestId } = render(<MyNutritionScreen />);

    fireEvent.press(getByTestId('log-freely-option'));

    expect(mockNavigate).toHaveBeenCalledWith('FreeLog');
  });
});
