import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../../common/models/user.model';
import { RefreshToken } from './models/refresh-token.model';

const mockUserId = new Types.ObjectId();
const mockTrainerId = new Types.ObjectId();

const mockUser: Partial<UserDocument> = {
  _id: mockUserId,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  passwordHash: '',
  role: 'member',
  trainerId: mockTrainerId,
};

function makeUserModel(user: Partial<UserDocument> | null) {
  return {
    findOne: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
  };
}

function makeRefreshTokenModel() {
  return {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let userModel: ReturnType<typeof makeUserModel>;
  let refreshTokenModel: ReturnType<typeof makeRefreshTokenModel>;
  let jwtService: JwtService;

  beforeEach(async () => {
    userModel = makeUserModel(null);
    refreshTokenModel = makeRefreshTokenModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: refreshTokenModel,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('returns access + refresh tokens and user payload when email and password are valid', async () => {
      const rawPassword = 'password123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const user = { ...mockUser, passwordHash };
      userModel.findOne.mockResolvedValue(user);
      refreshTokenModel.create.mockResolvedValue({});

      const result = await service.login('test@example.com', rawPassword);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: expect.any(String) as string,
        user: {
          id: mockUserId.toString(),
          firstName: 'Test',
          lastName: 'User',
          role: 'member',
          trainerId: mockTrainerId.toString(),
        },
      });
      const signSpy = jwtService.sign as jest.Mock;
      expect(signSpy).toHaveBeenCalledWith({
        sub: mockUserId.toString(),
        firstName: 'Test',
        lastName: 'User',
        role: 'member',
        trainerId: mockTrainerId.toString(),
      });
    });

    it('throws UnauthorizedException when password does not match passwordHash', async () => {
      const user = {
        ...mockUser,
        passwordHash: await bcrypt.hash('other', 10),
      };
      userModel.findOne.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email is unknown', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('deletes the old refresh token and issues a new access+refresh pair when the presented token hash matches a stored token', async () => {
      const rawToken = 'raw-refresh-token';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const user = { ...mockUser, passwordHash: 'hash' };
      const tokenDoc = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
      };

      refreshTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([tokenDoc]),
      });
      userModel.findById.mockResolvedValue(user);
      refreshTokenModel.deleteOne.mockResolvedValue({});
      refreshTokenModel.create.mockResolvedValue({});

      const result = await service.refresh(mockUserId.toString(), rawToken);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: expect.any(String) as string,
      });
      expect(refreshTokenModel.deleteOne).toHaveBeenCalled();
      expect(refreshTokenModel.create).toHaveBeenCalled();
    });

    it("revokes all of the user's refresh tokens and throws Unauthorized when a replayed (already-deleted) token is presented", async () => {
      refreshTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      refreshTokenModel.deleteMany.mockResolvedValue({});

      await expect(
        service.refresh(mockUserId.toString(), 'replayed-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(refreshTokenModel.deleteMany).toHaveBeenCalledWith({
        userId: expect.anything() as unknown,
      });
    });
  });

  describe('logout', () => {
    it('deletes the matching refresh token document for the user', async () => {
      const rawToken = 'raw-token';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const tokenDoc = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
      };
      refreshTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([tokenDoc]),
      });
      refreshTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.logout(mockUserId.toString(), rawToken);

      expect(refreshTokenModel.deleteOne).toHaveBeenCalled();
    });
  });
});
