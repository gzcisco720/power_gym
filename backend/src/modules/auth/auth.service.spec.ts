import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../../common/models/user.model';
import { RefreshToken } from './models/refresh-token.model';
import { PasswordResetToken } from '../../common/models/password-reset-token.model';
import { EMAIL_SERVICE, IEmailService } from '../../common/email/email.service';

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

function makePasswordResetTokenModel() {
  return {
    create: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
  };
}

function makeEmailService(): IEmailService {
  return {
    sendPasswordReset: jest.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let userModel: ReturnType<typeof makeUserModel>;
  let refreshTokenModel: ReturnType<typeof makeRefreshTokenModel>;
  let passwordResetTokenModel: ReturnType<typeof makePasswordResetTokenModel>;
  let emailService: IEmailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    userModel = makeUserModel(null);
    refreshTokenModel = makeRefreshTokenModel();
    passwordResetTokenModel = makePasswordResetTokenModel();
    emailService = makeEmailService();

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
          provide: getModelToken(PasswordResetToken.name),
          useValue: passwordResetTokenModel,
        },
        {
          provide: EMAIL_SERVICE,
          useValue: emailService,
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

  describe('forgotPassword', () => {
    it('creates a PasswordResetToken with a hashed token and calls email.sendPasswordReset with a powergym://reset-password?token= deep link for a known email', async () => {
      const user = { ...mockUser, passwordHash: 'hash' };
      userModel.findOne.mockResolvedValue(user);
      passwordResetTokenModel.create.mockResolvedValue({});

      await service.forgotPassword('test@example.com');

      expect(passwordResetTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          tokenHash: expect.any(String) as string,
          expiresAt: expect.any(Date) as Date,
          usedAt: null,
        }),
      );

      const sendSpy = emailService.sendPasswordReset as jest.Mock;
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const [toArg, tokenArg] = sendSpy.mock.calls[0] as [string, string];
      expect(toArg).toBe('test@example.com');
      expect(tokenArg).toMatch(/^powergym:\/\/reset-password\?token=/);
    });

    it('resolves without creating a token or sending email for an unknown email (no existence leak)', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.forgotPassword('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(passwordResetTokenModel.create).not.toHaveBeenCalled();
      expect(
        emailService.sendPasswordReset as jest.Mock,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it("updates the user's passwordHash, marks the token usedAt, and revokes all of the user's refresh tokens for a valid token", async () => {
      const rawToken = 'valid-raw-uuid-token';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const tokenDoc = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };
      const user = { ...mockUser, passwordHash: 'old-hash', save: jest.fn() };

      passwordResetTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([tokenDoc]),
      });
      userModel.findById.mockResolvedValue(user);
      passwordResetTokenModel.updateOne.mockResolvedValue({});
      refreshTokenModel.deleteMany.mockResolvedValue({});

      await service.resetPassword(rawToken, 'newpassword123');

      expect(user.save).toHaveBeenCalled();
      const newHash = (user as typeof user & { passwordHash: string })
        .passwordHash;
      const isHashed = await bcrypt.compare('newpassword123', newHash);
      expect(isHashed).toBe(true);
      expect(passwordResetTokenModel.updateOne).toHaveBeenCalledWith(
        { _id: tokenDoc._id },
        { $set: { usedAt: expect.any(Date) as Date } },
      );
      expect(refreshTokenModel.deleteMany).toHaveBeenCalledWith({
        userId: mockUserId,
      });
    });

    it('throws BadRequest/Unauthorized for an expired token', async () => {
      const rawToken = 'expired-token';
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiredDoc = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      };

      passwordResetTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([expiredDoc]),
      });

      await expect(
        service.resetPassword(rawToken, 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequest/Unauthorized for an unknown/already-used token', async () => {
      passwordResetTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.resetPassword('unknown-token', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
