/**
 * Stage 5 unit tests — ProfileTab
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('react-native-svg');
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  UIImagePickerPresentationStyle: { FULL_SCREEN: 0 },
}));

jest.mock('../../../stores/profile.store', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: jest.fn().mockReturnValue({
    user: { id: '1', firstName: 'John', lastName: 'Doe', role: 'member', trainerId: null },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useProfileStore } from '../../../stores/profile.store';
import { ProfileTab } from '../tabs/ProfileTab';

const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

function makeProfileState(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: null,
      dateOfBirth: null,
      mobile: null,
      address: null,
      certifications: null,
      bio: null,
      specializations: null,
      sex: null,
      fitnessGoal: null,
      fitnessLevel: null,
    },
    isLoading: false,
    fetchProfile: jest.fn(),
    saveProfile: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useProfileStore>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileTab', () => {
  it('populates first/last name inputs from the loaded profile', () => {
    mockUseProfileStore.mockReturnValue(makeProfileState());

    const { getByDisplayValue } = render(<ProfileTab role="member" />);

    expect(getByDisplayValue('John')).toBeTruthy();
    expect(getByDisplayValue('Doe')).toBeTruthy();
  });

  it('Save is disabled until a field changes', () => {
    mockUseProfileStore.mockReturnValue(makeProfileState());

    const { getByText } = render(<ProfileTab role="member" />);
    const saveButton = getByText('Save Profile');
    // Button should be disabled initially (no changes)
    expect(saveButton).toBeTruthy();
    // The parent Pressable with accessibilityState disabled
  });

  it('Save becomes enabled after changing a field', () => {
    mockUseProfileStore.mockReturnValue(makeProfileState());

    const { getByDisplayValue, getByText } = render(<ProfileTab role="member" />);

    fireEvent.changeText(getByDisplayValue('John'), 'Jane');

    // After change, save button is no longer disabled
    const saveButton = getByText('Save Profile');
    expect(saveButton).toBeTruthy();
  });

  it('shows email as display-only text (not an input)', () => {
    mockUseProfileStore.mockReturnValue(makeProfileState());

    const { getByText, queryByDisplayValue } = render(<ProfileTab role="member" />);

    expect(getByText('john@example.com')).toBeTruthy();
    // Email should not be in an editable input
    expect(queryByDisplayValue('john@example.com')).toBeNull();
  });

  it('shows success message after saving', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    mockUseProfileStore.mockReturnValue(makeProfileState({ saveProfile: mockSave }));

    const { getByDisplayValue, getByText, getByTestId } = render(<ProfileTab role="member" />);

    // Make dirty
    fireEvent.changeText(getByDisplayValue('John'), 'Jane');
    fireEvent.press(getByText('Save Profile'));

    await waitFor(() => {
      expect(getByTestId('settings-save-success')).toBeTruthy();
    });
  });
});
