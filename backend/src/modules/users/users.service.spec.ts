import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from '../../common/models/user.model';
import { UserProfile } from '../../common/models/user-profile.model';

const makeObjectId = () => new Types.ObjectId();

describe('UsersService', () => {
  let service: UsersService;

  const userId = makeObjectId();

  const mockUserModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserProfileModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(UserProfile.name),
          useValue: mockUserProfileModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── getProfile ──────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns merged User name/email and UserProfile fields with non-applicable fields as null', async () => {
      const userDoc = {
        _id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'member',
      };
      const profileDoc = {
        userId,
        mobile: '555-1234',
        address: null,
        dateOfBirth: null,
        avatarUrl: null,
        sex: 'male',
        height: null,
        fitnessGoal: 'lose_fat',
        fitnessLevel: 'beginner',
        certifications: [],
        bio: null,
        specializations: [],
        gymInfo: null,
      };

      mockUserModel.findById.mockReturnValue({
        lean: () => Promise.resolve(userDoc),
      });
      mockUserProfileModel.findOne.mockReturnValue({
        lean: () => Promise.resolve(profileDoc),
      });

      const result = await service.getProfile(userId.toString());

      expect(result).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        mobile: '555-1234',
        fitnessGoal: 'lose_fat',
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      await expect(service.getProfile(userId.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('writes firstName/lastName to User and remaining fields to upserted UserProfile', async () => {
      const updatedUser = {
        _id: userId,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'member',
      };
      const updatedProfile = {
        userId,
        mobile: '123',
        address: null,
        dateOfBirth: null,
        avatarUrl: null,
        sex: null,
        height: null,
        fitnessGoal: null,
        fitnessLevel: null,
        certifications: [],
        bio: null,
        specializations: [],
        gymInfo: null,
      };

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: () => Promise.resolve(updatedUser),
      });
      mockUserProfileModel.findOneAndUpdate.mockReturnValue({
        lean: () => Promise.resolve(updatedProfile),
      });
      mockUserModel.findById.mockReturnValue({
        lean: () => Promise.resolve(updatedUser),
      });
      mockUserProfileModel.findOne.mockReturnValue({
        lean: () => Promise.resolve(updatedProfile),
      });

      const result = await service.updateProfile(userId.toString(), {
        firstName: 'Jane',
        lastName: 'Smith',
        mobile: '123',
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId.toString(),
        { $set: { firstName: 'Jane', lastName: 'Smith' } },
        { returnDocument: 'after' },
      );
      expect(mockUserProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: userId.toString() },
        { $set: expect.objectContaining({ mobile: '123' }) as object },
        { upsert: true, returnDocument: 'after' },
      );
      expect(result).toMatchObject({ firstName: 'Jane', mobile: '123' });
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('throws BadRequestException when currentPassword does not match the stored hash', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockUserModel.findById.mockResolvedValue({
        _id: userId,
        passwordHash: hash,
        save: jest.fn(),
      });

      await expect(
        service.changePassword(userId.toString(), 'wrong-password', 'NewPass1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores a new bcrypt hash that verifies against the new password', async () => {
      const currentPassword = 'OldPass1';
      const newPassword = 'NewPass2';
      const hash = await bcrypt.hash(currentPassword, 10);
      const mockSave = jest.fn();
      const mockUser = {
        _id: userId,
        passwordHash: hash,
        save: mockSave,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.changePassword(
        userId.toString(),
        currentPassword,
        newPassword,
      );

      expect(mockSave).toHaveBeenCalled();
      const newHash = mockUser.passwordHash;
      const isValid = await bcrypt.compare(newPassword, newHash);
      expect(isValid).toBe(true);
    });
  });

  // ─── changeEmail ─────────────────────────────────────────────────────────────

  describe('changeEmail', () => {
    it('throws BadRequestException when currentPassword does not match', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockUserModel.findById.mockResolvedValue({ _id: userId, email: 'old@example.com', passwordHash: hash, save: jest.fn() });

      await expect(service.changeEmail(userId.toString(), 'new@example.com', 'wrong')).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when email is already in use by another user', async () => {
      const hash = await bcrypt.hash('pass', 10);
      mockUserModel.findById.mockResolvedValue({ _id: userId, email: 'old@example.com', passwordHash: hash, save: jest.fn() });
      mockUserModel.findOne.mockReturnValue({ lean: () => Promise.resolve({ _id: 'other-id' }) });

      await expect(service.changeEmail(userId.toString(), 'taken@example.com', 'pass')).rejects.toThrow(ConflictException);
    });

    it('saves the new email when password matches and email is free', async () => {
      const hash = await bcrypt.hash('pass', 10);
      const mockSave = jest.fn();
      const mockUser = { _id: userId, email: 'old@example.com', passwordHash: hash, save: mockSave };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      await service.changeEmail(userId.toString(), 'new@example.com', 'pass');

      expect(mockUser.email).toBe('new@example.com');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ─── setAvatar ────────────────────────────────────────────────────────────────

  describe('setAvatar', () => {
    it('upserts avatarUrl on the UserProfile and returns { avatarUrl }', async () => {
      mockUserProfileModel.findOneAndUpdate.mockReturnValue({
        lean: () => Promise.resolve({ avatarUrl: '/uploads/abc.png' }),
      });

      const result = await service.setAvatar(
        userId.toString(),
        '/uploads/abc.png',
      );

      expect(mockUserProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: userId.toString() },
        { $set: { avatarUrl: '/uploads/abc.png' } },
        { upsert: true, returnDocument: 'after' },
      );
      expect(result).toEqual({ avatarUrl: '/uploads/abc.png' });
    });
  });
});
