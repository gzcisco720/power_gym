import { render, screen } from '@testing-library/react';
import { MyTrainingLanding } from '@/components/self-tracking/my-training-landing';

jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { id: 'u1', role: 'trainer' } }) }));
jest.mock('next/navigation', () => ({ redirect: jest.fn(), useRouter: () => ({ push: jest.fn() }) }));

const findActive = jest.fn();
const findByUserMonth = jest.fn();
const findRecent = jest.fn();
const findLastByTemplate = jest.fn();
const findByUser = jest.fn();
const findById = jest.fn();

jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn().mockImplementation(() => ({
    findActive, findByUserMonth, findRecent, findLastByTemplate,
  })),
}));
jest.mock('@/lib/repositories/self-personal-best.repository', () => ({
  MongoSelfPersonalBestRepository: jest.fn().mockImplementation(() => ({ findByUser })),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn().mockImplementation(() => ({ findById })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  findActive.mockResolvedValue(null);
  findByUserMonth.mockResolvedValue([]);
  findRecent.mockResolvedValue([]);
  findLastByTemplate.mockResolvedValue(null);
  findByUser.mockResolvedValue([]);
  findById.mockResolvedValue(null);
});

describe('MyTrainingLanding', () => {
  it('renders Empty state when user has no logs', async () => {
    const ui = await MyTrainingLanding({ basePath: '/trainer/my-training' });
    render(ui);
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument();
    expect(screen.getByText(/blank session/i)).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('renders Light state when user has 2 freestyle sessions and no template usage', async () => {
    findRecent.mockResolvedValue([
      { _id: 'a', dayName: 'Freestyle', completedAt: new Date(), startedAt: new Date(), sets: [], rpe: 6, sourceTemplateId: null },
      { _id: 'b', dayName: 'Freestyle', completedAt: new Date(), startedAt: new Date(), sets: [], rpe: 7, sourceTemplateId: null },
    ]);
    const ui = await MyTrainingLanding({ basePath: '/trainer/my-training' });
    render(ui);
    expect(screen.getByText(/build a streak/i)).toBeInTheDocument();
    expect(screen.getByText(/newer sessions will land/i)).toBeInTheDocument();
  });
});
