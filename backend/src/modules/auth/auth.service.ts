import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, UserDocument } from '../../common/models/user.model';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './models/refresh-token.model';

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_DAYS = 30;
const BCRYPT_ROUNDS = 10;

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    trainerId: string | null;
  };
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = user._id.toString();
    const trainerId = user.trainerId ? user.trainerId.toString() : null;

    const accessToken = this.jwtService.sign({
      sub: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      trainerId,
    });

    const rawRefreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: userId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        trainerId,
      },
    };
  }

  async refresh(
    userId: string,
    rawRefreshToken: string,
  ): Promise<RefreshResult> {
    const userObjectId = new Types.ObjectId(userId);
    const tokenDocs = await this.refreshTokenModel
      .find({ userId: userObjectId })
      .lean();

    let matchedDoc: RefreshTokenDocument | null = null;
    for (const doc of tokenDocs) {
      const match = await bcrypt.compare(rawRefreshToken, doc.tokenHash);
      if (match) {
        matchedDoc = doc;
        break;
      }
    }

    if (!matchedDoc) {
      // Replay attack — revoke all tokens for this user
      await this.refreshTokenModel.deleteMany({ userId: userObjectId });
      throw new UnauthorizedException('Invalid or replayed refresh token');
    }

    // Delete the matched (now consumed) token
    await this.refreshTokenModel.deleteOne({ _id: matchedDoc._id });

    const user = await this.userModel.findById(userObjectId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const trainerId = user.trainerId ? user.trainerId.toString() : null;

    const accessToken = this.jwtService.sign({
      sub: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      trainerId,
    });

    const newRawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const newTokenHash = await bcrypt.hash(newRawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenModel.create({
      userId: userObjectId,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken: newRawToken };
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const tokenDocs = await this.refreshTokenModel
      .find({ userId: userObjectId })
      .lean();

    for (const doc of tokenDocs) {
      const match = await bcrypt.compare(rawRefreshToken, doc.tokenHash);
      if (match) {
        await this.refreshTokenModel.deleteOne({ _id: doc._id });
        return;
      }
    }
  }
}
