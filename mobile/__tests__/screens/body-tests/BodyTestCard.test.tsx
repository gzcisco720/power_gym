import React from 'react';
import { render } from '@testing-library/react-native';
import { BodyTest } from '../../../src/types/body-tests';
import { BodyTestCard } from '../../../src/screens/body-test-shared/components/BodyTestCard';

const mockOnPress = jest.fn();

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
    _id: 'bt-1',
    memberId: 'member-1',
    trainerId: null,
    date: '2026-06-02T00:00:00.000Z',
    age: 30,
    sex: 'male',
    weight: 77,
    protocol: '3site',
    tricep: null,
    chest: 12,
    subscapular: null,
    abdominal: 18,
    suprailiac: null,
    thigh: 20,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 16.2,
    leanMassKg: 64.5,
    fatMassKg: 12.5,
    targetWeight: null,
    targetBodyFatPct: null,
    createdAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BodyTestCard', () => {
  it('renders date, body fat percentage, protocol label, and lean mass subline', () => {
    const test = makeBodyTest();
    const { getByText } = render(
      <BodyTestCard bodyTest={test} onPress={mockOnPress} />,
    );
    // Date formatted en-GB "Tue, 2 Jun 2026"
    expect(getByText(/2 Jun 2026/)).toBeTruthy();
    // Body fat %
    expect(getByText('16.2%')).toBeTruthy();
    // Protocol label
    expect(getByText('3-Site · Jackson-Pollock')).toBeTruthy();
    // Lean mass
    expect(getByText('64.5 kg lean')).toBeTruthy();
  });
});
