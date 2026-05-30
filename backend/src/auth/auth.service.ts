import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UserRole } from '../common/interfaces/auth-user.interface';
import { IUser } from '../database/models/user.model';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RESET_TOKEN_TTL_MS } from '../common/constants';

type JwtExpiry = JwtSignOptions['expiresIn'];

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const logger = new Logger('AuthService');

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: UserRole; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly inviteRepo: InviteRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly resetTokenRepo: PasswordResetTokenRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<IUser> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.issueTokens(user);
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    if (!dto.token) {
      // No token: only allowed when bootstrapping the first owner.
      const userCount = await this.userRepo.count();
      if (userCount > 0) {
        throw new ForbiddenException('Registration requires an invite token');
      }
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      try {
        const owner = await this.userRepo.create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          passwordHash,
          role: 'owner',
          trainerId: null,
        });
        return this.issueTokens(owner);
      } catch (err: unknown) {
        // Unique index on role=owner prevents concurrent bootstrap race.
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          err.code === 11000
        ) {
          throw new ForbiddenException('Registration requires an invite token');
        }
        throw err;
      }
    }

    // Token path: validate invite and email match.
    const invite = await this.inviteRepo.findByToken(dto.token);
    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }
    if (invite.usedAt) {
      throw new BadRequestException('Invite token already used');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite token expired');
    }
    if (
      invite.recipientEmail.toLowerCase() !== dto.email.toLowerCase().trim()
    ) {
      throw new BadRequestException('Email does not match invite');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const trainerId =
      invite.role === 'member'
        ? (invite.trainerId?.toString() ?? invite.invitedBy.toString())
        : null;
    const user = await this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      role: invite.role,
      trainerId,
    });
    await this.inviteRepo.markUsed(invite.token);

    return this.issueTokens(user);
  }

  async refresh(userId: string, oldRefreshToken: string): Promise<AuthResult> {
    // Token validity was already confirmed by RefreshTokenStrategy — no second DB lookup needed.
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Rotate: revoke the consumed token and issue fresh tokens.
    await this.refreshTokenRepo.revokeByToken(oldRefreshToken);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.refreshTokenRepo.revokeByToken(refreshToken);
    return { success: true };
  }

  async forgotPassword(email: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findByEmail(email);
    // Always return success to avoid leaking which emails exist.
    if (user) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await this.resetTokenRepo.create(user._id.toString(), token, expiresAt);

      const appUrl =
        this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      this.emailService
        .sendPasswordReset({ to: user.email, resetUrl })
        .catch((err) => {
          logger.warn(
            `Failed to send password reset email to ${user.email}: ${String(err)}`,
          );
        });

      const response: Record<string, unknown> = { success: true };
      if (
        this.config.get<string>('NODE_ENV') !== 'production' &&
        this.config.get<string>('AUTH_EXPOSE_RESET_TOKEN') === '1'
      ) {
        response.resetToken = token;
      }
      return response;
    }
    return { success: true };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const record = await this.resetTokenRepo.findValidByToken(token);
    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.userRepo.updatePassword(record.userId.toString(), passwordHash);
    await this.resetTokenRepo.markUsed(record._id.toString());
    return { success: true };
  }

  private async issueTokens(user: IUser): Promise<AuthResult> {
    const access_token = this.signAccessToken(user);
    const refresh_token = this.signRefreshToken(user);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.refreshTokenRepo.create(
      user._id.toString(),
      refresh_token,
      expiresAt,
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  private signAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const options: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRY') ?? '15m') as JwtExpiry,
    };
    return this.jwtService.sign(payload, options);
  }

  private signRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const options: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRY') ??
        '7d') as JwtExpiry,
      jwtid: randomUUID(),
    };
    return this.jwtService.sign(payload, options);
  }
}

export type { AuthResult };
