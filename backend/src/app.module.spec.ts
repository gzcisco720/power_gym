import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from './app.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from './common/email/email.module';
import { RefreshToken } from './modules/auth/models/refresh-token.model';

interface MockMongooseModule {
  forRoot: jest.Mock;
  forFeature: jest.Mock;
}

jest.mock('@nestjs/mongoose', () => {
  const actual = jest.requireActual<{ MongooseModule: MockMongooseModule }>(
    '@nestjs/mongoose',
  );
  return {
    ...actual,
    MongooseModule: {
      ...actual.MongooseModule,
      forRoot: jest.fn().mockReturnValue({ module: class {} }),
      forFeature: jest
        .fn()
        .mockImplementation((features: Array<{ name: string }>) => ({
          module: class {},
          providers: features.map((f) => ({
            provide: `${f.name}Model`,
            useValue: { find: jest.fn(), create: jest.fn() },
          })),
          exports: features.map((f) => `${f.name}Model`),
        })),
    },
  };
});

describe('AppModule', () => {
  it('should compile', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('has AuthModule, JwtModule, and EmailModule registered', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module.get(AuthModule, { strict: false })).toBeDefined();
    expect(module.get(JwtModule, { strict: false })).toBeDefined();
    expect(module.get(EmailModule, { strict: false })).toBeDefined();
  });

  it('RefreshTokenModel is injectable in AuthModule', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const refreshTokenModel: unknown = module.get(
      getModelToken(RefreshToken.name),
      {
        strict: false,
      },
    );
    expect(refreshTokenModel).toBeDefined();
  });
});
