type UserRole = 'owner' | 'trainer' | 'member';

interface ProfileValues {
  firstName: string;
  lastName: string;
}

type ProfileErrors = Partial<Record<'firstName' | 'lastName', string>>;

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type PasswordErrors = Partial<
  Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>
>;

/**
 * Validates profile fields common to all roles.
 * Returns a map of { field: errorMessage } — empty object means valid.
 */
export function validateProfile(
  values: ProfileValues,
  role: UserRole,
): ProfileErrors {
  void role; // role reserved for future per-role rules
  const errors: ProfileErrors = {};

  if (!values.firstName || values.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!values.lastName || values.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  return errors;
}

/**
 * Validates password change fields.
 * Returns a map of { field: errorMessage } — empty object means valid.
 */
export function validatePassword(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!values.currentPassword || values.currentPassword.trim() === '') {
    errors.currentPassword = 'Current password is required';
  }

  if (!values.newPassword || values.newPassword.length < 8) {
    errors.newPassword = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(values.newPassword)) {
    errors.newPassword = 'Password must contain at least one uppercase letter';
  } else if (!/[0-9]/.test(values.newPassword)) {
    errors.newPassword = 'Password must contain at least one number';
  }

  if (!errors.newPassword && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}
