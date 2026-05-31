import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GymService } from './gym.service';
import { User } from '../../common/models/user.model';
import { UserProfile } from '../../common/models/user-profile.model';

describe('GymService', () => {
  let service: GymService;

  const mockUserModel = {
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
        GymService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(UserProfile.name),
          useValue: mockUserProfileModel,
        },
      ],
    }).compile();

    service = module.get<GymService>(GymService);
  });

  // ─── getBranding ─────────────────────────────────────────────────────────────

  describe('getBranding', () => {
    it('returns owner gymInfo name and logoUrl as gymName/logoUrl', async () => {
      const ownerDoc = { _id: 'owner-id' };
      const profileDoc = {
        gymInfo: {
          name: 'Iron Gym',
          logoUrl: '/uploads/logo.png',
          loginLogoUrl: null,
        },
      };

      mockUserModel.findOne.mockReturnValue({
        lean: () => Promise.resolve(ownerDoc),
      });
      mockUserProfileModel.findOne.mockReturnValue({
        lean: () => Promise.resolve(profileDoc),
      });

      const result = await service.getBranding();

      expect(result).toEqual({
        gymName: 'Iron Gym',
        logoUrl: '/uploads/logo.png',
      });
    });

    it('returns { gymName: null, logoUrl: null } when no owner exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        lean: () => Promise.resolve(null),
      });

      const result = await service.getBranding();

      expect(result).toEqual({ gymName: null, logoUrl: null });
    });
  });

  // ─── updateInfo ──────────────────────────────────────────────────────────────

  describe('updateInfo', () => {
    it('upserts provided gymInfo fields onto the owner UserProfile and returns them', async () => {
      const ownerUserId = new Types.ObjectId().toString();
      const dto = { name: 'Power Gym', phone: '555-1234' };
      const updatedProfile = {
        gymInfo: {
          name: 'Power Gym',
          phone: '555-1234',
          address: null,
          email: null,
          website: null,
          hours: null,
          description: null,
          logoUrl: null,
          loginLogoUrl: null,
        },
      };

      mockUserProfileModel.findOneAndUpdate.mockReturnValue({
        lean: () => Promise.resolve(updatedProfile),
      });

      const result = await service.updateInfo(ownerUserId, dto);

      expect(mockUserProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: new Types.ObjectId(ownerUserId) },
        {
          $set: {
            'gymInfo.name': 'Power Gym',
            'gymInfo.phone': '555-1234',
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      expect(result).toMatchObject({ name: 'Power Gym', phone: '555-1234' });
    });
  });

  // ─── setLogo ─────────────────────────────────────────────────────────────────

  describe('setLogo', () => {
    it('with kind "login" sets loginLogoUrl and leaves logoUrl unchanged', async () => {
      const ownerUserId = new Types.ObjectId().toString();
      const relativeUrl = '/uploads/login-logo.png';

      mockUserProfileModel.findOneAndUpdate.mockReturnValue({
        lean: () =>
          Promise.resolve({
            gymInfo: { loginLogoUrl: relativeUrl, logoUrl: '/uploads/old.png' },
          }),
      });

      const result = await service.setLogo(ownerUserId, 'login', relativeUrl);

      expect(mockUserProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: new Types.ObjectId(ownerUserId) },
        { $set: { 'gymInfo.loginLogoUrl': relativeUrl } },
        { upsert: true, returnDocument: 'after' },
      );
      expect(result).toEqual({ logoUrl: relativeUrl });
    });
  });
});
