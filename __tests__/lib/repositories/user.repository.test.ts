import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { UserModel } from '@/lib/db/models/user.model';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockUserModel = jest.mocked(UserModel);

describe('MongoUserRepository', () => {
  let repo: MongoUserRepository;

  beforeEach(() => {
    repo = new MongoUserRepository();
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const mockUser = { _id: 'id1', email: 'test@test.com', role: 'owner' };
      mockUserModel.findOne.mockResolvedValue(mockUser as never);

      const result = await repo.findByEmail('test@test.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null as never);

      const result = await repo.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('returns number of users', async () => {
      mockUserModel.countDocuments.mockResolvedValue(3 as never);

      const result = await repo.count();

      expect(result).toBe(3);
    });
  });

  describe('create', () => {
    it('saves and returns a new user', async () => {
      const saveMock = jest.fn().mockResolvedValue({ _id: 'new', email: 'new@test.com' });
      (UserModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      await repo.create({
        name: 'New',
        email: 'new@test.com',
        passwordHash: 'hash',
        role: 'owner',
        trainerId: null,
      });

      expect(saveMock).toHaveBeenCalled();
    });
  });
});
