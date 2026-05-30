import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

jest.mock('@nestjs/mongoose', () => ({
  MongooseModule: {
    forRoot: jest.fn().mockReturnValue({ module: class {}, imports: [] }),
  },
}));

describe('AppModule', () => {
  it('should compile', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
