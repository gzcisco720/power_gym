/**
 * Stage 5 unit tests — Profile + password validation
 */

import { validateProfile, validatePassword } from './profile';

describe('validateProfile', () => {
  it('returns a firstName error when firstName is empty', () => {
    const errors = validateProfile({ firstName: '', lastName: 'Doe' }, 'member');
    expect(errors.firstName).toBeDefined();
  });

  it('returns a lastName error when lastName is empty', () => {
    const errors = validateProfile({ firstName: 'John', lastName: '' }, 'owner');
    expect(errors.lastName).toBeDefined();
  });

  it('returns no errors when firstName and lastName are provided', () => {
    const errors = validateProfile({ firstName: 'John', lastName: 'Doe' }, 'trainer');
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('validatePassword', () => {
  it('returns an error when newPassword has no uppercase letter', () => {
    const errors = validatePassword({
      currentPassword: 'oldpass1',
      newPassword: 'lowercase1',
      confirmPassword: 'lowercase1',
    });
    expect(errors.newPassword).toBeDefined();
  });

  it('returns an error when newPassword has no number', () => {
    const errors = validatePassword({
      currentPassword: 'oldpass1',
      newPassword: 'NoNumber!',
      confirmPassword: 'NoNumber!',
    });
    expect(errors.newPassword).toBeDefined();
  });

  it('returns an error when newPassword is shorter than 8 characters', () => {
    const errors = validatePassword({
      currentPassword: 'oldpass1',
      newPassword: 'Short1',
      confirmPassword: 'Short1',
    });
    expect(errors.newPassword).toBeDefined();
  });

  it('returns an error when confirmPassword does not match newPassword', () => {
    const errors = validatePassword({
      currentPassword: 'oldpass1',
      newPassword: 'GoodPass1',
      confirmPassword: 'Different1',
    });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('returns no errors for "GoodPass1" matching confirm', () => {
    const errors = validatePassword({
      currentPassword: 'oldpass1',
      newPassword: 'GoodPass1',
      confirmPassword: 'GoodPass1',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns currentPassword error when currentPassword is empty', () => {
    const errors = validatePassword({
      currentPassword: '',
      newPassword: 'GoodPass1',
      confirmPassword: 'GoodPass1',
    });
    expect(errors.currentPassword).toBeDefined();
  });
});
