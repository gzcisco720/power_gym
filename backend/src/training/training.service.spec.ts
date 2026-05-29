import 'reflect-metadata';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrainingService } from './training.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

// ── Helpers ──────────────────────────────────────────────────────────────────

const owner: AuthUser = {
  userId: 'owner1',
  email: 'owner@x.com',
  role: 'owner',
};
const trainer: AuthUser = {
  userId: 'trainer1',
  email: 'trainer@x.com',
  role: 'trainer',
};
const member: AuthUser = {
  userId: 'member1',
  email: 'member@x.com',
  role: 'member',
};

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'tmpl1' },
    name: 'Plan A',
    createdBy: { toString: () => 'trainer1' },
    days: [],
    toObject: () => ({ days: [] }),
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'sess1' },
    memberId: { toString: () => 'member1' },
    dayNumber: 1,
    dayName: 'Day 1',
    completedAt: null,
    sets: [],
    startedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'member1' },
    role: 'member',
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  };
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'plan1' },
    memberId: { toString: () => 'member1' },
    days: [
      {
        dayNumber: 1,
        name: 'Day 1',
        exercises: [],
      },
    ],
    ...overrides,
  };
}

function makeService(overrides: Partial<Record<string, object>> = {}) {
  const defaults = {
    planTemplateRepo: {
      findByCreator: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
    },
    memberPlanRepo: {
      findActive: jest.fn(),
      deactivateAll: jest.fn(),
      create: jest.fn(),
    },
    sessionRepo: {
      findActive: jest.fn(),
      findById: jest.fn(),
      findByMember: jest.fn(),
      findCompletedToday: jest.fn(),
      create: jest.fn(),
      updateSet: jest.fn(),
      complete: jest.fn(),
      seal: jest.fn(),
      delete: jest.fn(),
    },
    exerciseRepo: { findAll: jest.fn() },
    exerciseNoteRepo: {
      appendEntry: jest.fn(),
      findByMemberAndExercise: jest.fn(),
    },
    pbRepo: { findByMember: jest.fn(), upsertIfBetter: jest.fn() },
    selfLogRepo: {},
    selfPbRepo: {},
    userRepo: { findById: jest.fn() },
  };
  const merged = { ...defaults, ...overrides };
  return {
    service: new TrainingService(
      merged.planTemplateRepo as never,
      merged.memberPlanRepo as never,
      merged.sessionRepo as never,
      merged.exerciseRepo as never,
      merged.exerciseNoteRepo as never,
      merged.pbRepo as never,
      merged.selfLogRepo as never,
      merged.selfPbRepo as never,
      merged.userRepo as never,
    ),
    planTemplateRepo: merged.planTemplateRepo,
    memberPlanRepo: merged.memberPlanRepo,
    sessionRepo: merged.sessionRepo,
    pbRepo: merged.pbRepo,
    exerciseNoteRepo: merged.exerciseNoteRepo,
    userRepo: merged.userRepo,
  };
}

// ── Conflict error assertion helper ──────────────────────────────────────────

async function expectConflictCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ConflictException);
  expect((err as ConflictException).getResponse()).toMatchObject({
    error: code,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── listPlanTemplates ─────────────────────────────────────────────────────────

describe('TrainingService > listPlanTemplates', () => {
  it('delegates to planTemplateRepo.findByCreator(caller.userId)', async () => {
    const templates = [makeTemplate()];
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.findByCreator.mockResolvedValue(templates);

    const result = await service.listPlanTemplates(trainer);

    expect(planTemplateRepo.findByCreator).toHaveBeenCalledWith('trainer1');
    expect(result).toBe(templates);
  });
});

// ── createPlanTemplate ────────────────────────────────────────────────────────

describe('TrainingService > createPlanTemplate', () => {
  it('calls repo.create with createdBy=caller.userId', async () => {
    const created = makeTemplate();
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.create.mockResolvedValue(created);

    await service.createPlanTemplate(trainer, { name: 'Plan A', days: [] });

    expect(planTemplateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'trainer1' }),
    );
  });
});

// ── getPlanTemplate ───────────────────────────────────────────────────────────

describe('TrainingService > getPlanTemplate', () => {
  it('throws NotFoundException when template missing', async () => {
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.findById.mockResolvedValue(null);

    await expect(service.getPlanTemplate(trainer, 'tmpl1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when non-owner caller is not the creator', async () => {
    const tmpl = makeTemplate({
      createdBy: { toString: () => 'other-trainer' },
    });
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.findById.mockResolvedValue(tmpl);

    await expect(service.getPlanTemplate(trainer, 'tmpl1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns the template for the owner regardless of creator', async () => {
    const tmpl = makeTemplate({
      createdBy: { toString: () => 'some-trainer' },
    });
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.findById.mockResolvedValue(tmpl);

    const result = await service.getPlanTemplate(owner, 'tmpl1');

    expect(result).toBe(tmpl);
  });
});

// ── updatePlanTemplate ────────────────────────────────────────────────────────

describe('TrainingService > updatePlanTemplate', () => {
  it('applies only provided fields to the update payload', async () => {
    const tmpl = makeTemplate();
    const updated = makeTemplate({ name: 'New Name' });
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.findById.mockResolvedValue(tmpl);
    planTemplateRepo.update.mockResolvedValue(updated);

    // Only name provided — description and days should NOT be in the update payload
    await service.updatePlanTemplate(trainer, 'tmpl1', { name: 'New Name' });

    expect(planTemplateRepo.update).toHaveBeenCalledWith(
      'tmpl1',
      expect.not.objectContaining({
        description: expect.anything() as jest.AsymmetricMatcher,
        days: expect.anything() as jest.AsymmetricMatcher,
      }),
    );
    expect(planTemplateRepo.update).toHaveBeenCalledWith(
      'tmpl1',
      expect.objectContaining({ name: 'New Name' }),
    );
  });
});

// ── deletePlanTemplate ────────────────────────────────────────────────────────

describe('TrainingService > deletePlanTemplate', () => {
  it('throws NotFoundException when repo.deleteById returns false', async () => {
    const { service, planTemplateRepo } = makeService();
    planTemplateRepo.deleteById.mockResolvedValue(false);

    await expect(service.deletePlanTemplate(trainer, 'tmpl1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── getMemberPlan ─────────────────────────────────────────────────────────────

describe('TrainingService > getMemberPlan', () => {
  it("throws ForbiddenException when a member requests another member's plan", async () => {
    const { service } = makeService();

    await expect(service.getMemberPlan(member, 'other-member')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ── assignMemberPlan ──────────────────────────────────────────────────────────

describe('TrainingService > assignMemberPlan', () => {
  it('throws NotFoundException for a non-member target', async () => {
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(makeMember({ role: 'trainer' }));

    await expect(
      service.assignMemberPlan(owner, 'member1', 'tmpl1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when a trainer assigns a template they do not own', async () => {
    const memberDoc = makeMember();
    const tmpl = makeTemplate({
      createdBy: { toString: () => 'other-trainer' },
    });
    const { service, userRepo, planTemplateRepo } = makeService();
    userRepo.findById.mockResolvedValue(memberDoc);
    planTemplateRepo.findById.mockResolvedValue(tmpl);

    await expect(
      service.assignMemberPlan(trainer, 'member1', 'tmpl1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deactivates existing plans then creates the new plan', async () => {
    const memberDoc = makeMember();
    const tmpl = makeTemplate();
    const newPlan = { _id: { toString: () => 'plan2' } };
    const { service, userRepo, planTemplateRepo, memberPlanRepo } =
      makeService();
    userRepo.findById.mockResolvedValue(memberDoc);
    planTemplateRepo.findById.mockResolvedValue(tmpl);
    memberPlanRepo.deactivateAll.mockResolvedValue(undefined);
    memberPlanRepo.create.mockResolvedValue(newPlan);

    const result = await service.assignMemberPlan(trainer, 'member1', 'tmpl1');

    expect(memberPlanRepo.deactivateAll).toHaveBeenCalledWith('member1');
    expect(memberPlanRepo.create).toHaveBeenCalled();
    expect(result).toBe(newPlan);
  });
});

// ── startSession ──────────────────────────────────────────────────────────────

describe('TrainingService > startSession', () => {
  it('throws NotFoundException when there is no active plan', async () => {
    const { service, memberPlanRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(null);

    await expect(
      service.startSession(member, { dayNumber: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the requested dayNumber is not in the plan', async () => {
    const plan = makePlan(); // has dayNumber 1 only
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(null);

    await expect(
      service.startSession(member, { dayNumber: 99 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the existing active session when its dayNumber matches the request', async () => {
    const plan = makePlan();
    const active = makeSession({ dayNumber: 1 });
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(active);

    const result = await service.startSession(member, { dayNumber: 1 });

    expect(result).toBe(active);
    expect(sessionRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException ACTIVE_SESSION_EXISTS when a different day is active and deleteActive is false', async () => {
    const plan = makePlan();
    const active = makeSession({ dayNumber: 2 }); // different day
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(active);

    await expectConflictCode(
      service.startSession(member, { dayNumber: 1, deleteActive: false }),
      'ACTIVE_SESSION_EXISTS',
    );
  });

  it('deletes the active session when deleteActive is true, then proceeds', async () => {
    const plan = makePlan();
    const active = makeSession({ dayNumber: 2 });
    const newSession = makeSession();
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(active);
    sessionRepo.findCompletedToday.mockResolvedValue(null);
    sessionRepo.create.mockResolvedValue(newSession);

    await service.startSession(member, { dayNumber: 1, deleteActive: true });

    expect(sessionRepo.delete).toHaveBeenCalledWith('sess1');
    expect(sessionRepo.create).toHaveBeenCalled();
  });

  it('throws ConflictException DAY_ALREADY_LOGGED when a session was completed today', async () => {
    const plan = makePlan();
    const completed = makeSession({ completedAt: new Date() });
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(null);
    sessionRepo.findCompletedToday.mockResolvedValue(completed);

    await expectConflictCode(
      service.startSession(member, { dayNumber: 1 }),
      'DAY_ALREADY_LOGGED',
    );
  });

  it('creates one set entry per prescribed set across all exercises', async () => {
    const plan = makePlan({
      days: [
        {
          dayNumber: 1,
          name: 'Day 1',
          exercises: [
            {
              groupId: 'g1',
              isSuperset: false,
              exerciseId: { toString: () => 'ex1' },
              exerciseName: 'Squat',
              imageUrl: null,
              isBodyweight: false,
              sets: 3,
              repsMin: 5,
              repsMax: 8,
              restSeconds: null,
            },
          ],
        },
      ],
    });
    const { service, memberPlanRepo, sessionRepo } = makeService();
    memberPlanRepo.findActive.mockResolvedValue(plan);
    sessionRepo.findActive.mockResolvedValue(null);
    sessionRepo.findCompletedToday.mockResolvedValue(null);
    sessionRepo.create.mockResolvedValue(makeSession());

    await service.startSession(member, { dayNumber: 1 });

    const [firstArgs] = sessionRepo.create.mock.calls as [
      { sets: unknown[] }[],
    ];
    const createCall = firstArgs[0];
    expect(createCall.sets).toHaveLength(3);
  });
});

// ── updateSet ─────────────────────────────────────────────────────────────────

describe('TrainingService > updateSet', () => {
  it('throws ConflictException when the session is already completed', async () => {
    const session = makeSession({ completedAt: new Date() });
    const { service, sessionRepo } = makeService();
    sessionRepo.findById.mockResolvedValue(session);

    await expect(
      service.updateSet(member, 'sess1', 0, {
        actualWeight: 100,
        actualReps: 5,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('calls pbRepo.upsertIfBetter only when weight and reps are non-null and the set is not bodyweight', async () => {
    const session = makeSession({
      memberId: { toString: () => 'member1' },
      sets: [
        {
          exerciseId: { toString: () => 'ex1' },
          exerciseName: 'Squat',
          isBodyweight: false,
          completedAt: null,
        },
      ],
    });
    const updatedSession = makeSession();
    const { service, sessionRepo, pbRepo } = makeService();
    sessionRepo.findById.mockResolvedValue(session);
    sessionRepo.updateSet.mockResolvedValue(updatedSession);

    await service.updateSet(member, 'sess1', 0, {
      actualWeight: 100,
      actualReps: 5,
    });

    expect(pbRepo.upsertIfBetter).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'member1', exerciseId: 'ex1' }),
    );
  });

  it('does NOT call pbRepo.upsertIfBetter for a bodyweight set', async () => {
    const session = makeSession({
      memberId: { toString: () => 'member1' },
      sets: [
        {
          exerciseId: { toString: () => 'ex1' },
          exerciseName: 'Pull-up',
          isBodyweight: true,
          completedAt: null,
        },
      ],
    });
    const updatedSession = makeSession();
    const { service, sessionRepo, pbRepo } = makeService();
    sessionRepo.findById.mockResolvedValue(session);
    sessionRepo.updateSet.mockResolvedValue(updatedSession);

    await service.updateSet(member, 'sess1', 0, {
      actualWeight: null,
      actualReps: 10,
    });

    expect(pbRepo.upsertIfBetter).not.toHaveBeenCalled();
  });
});

// ── completeSession ───────────────────────────────────────────────────────────

describe('TrainingService > completeSession', () => {
  it('throws ConflictException when session already completed', async () => {
    const session = makeSession({ completedAt: new Date() });
    const { service, sessionRepo } = makeService();
    sessionRepo.findById.mockResolvedValue(session);

    await expect(service.completeSession(member, 'sess1')).rejects.toThrow(
      ConflictException,
    );
  });
});

// ── sealSession ───────────────────────────────────────────────────────────────

describe('TrainingService > sealSession', () => {
  it('throws NotFoundException when session missing', async () => {
    const { service, sessionRepo } = makeService();
    sessionRepo.findById.mockResolvedValue(null);

    await expect(service.sealSession(owner, 'sess1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── getMemberPbs ──────────────────────────────────────────────────────────────

describe('TrainingService > getMemberPbs', () => {
  it("throws ForbiddenException when a member requests another member's PBs", async () => {
    const { service } = makeService();

    await expect(service.getMemberPbs(member, 'other-member')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ── createExerciseNote ────────────────────────────────────────────────────────

describe('TrainingService > createExerciseNote', () => {
  it('throws ForbiddenException when a trainer notes a member they do not own', async () => {
    const nonOwnedMember = makeMember({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(nonOwnedMember);

    await expect(
      service.createExerciseNote(trainer, {
        memberId: 'member1',
        exerciseId: 'ex1',
        exerciseName: 'Squat',
        content: 'Good form',
        sessionId: null,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── exportSessionsCsv ─────────────────────────────────────────────────────────

describe('TrainingService > exportSessionsCsv', () => {
  it('emits a header row plus only completed sets, and prefixes injection cells with a single quote', async () => {
    const injectionSession = {
      _id: { toString: () => 'sess2' },
      startedAt: new Date('2026-03-01'),
      dayName: 'Day 1',
      sets: [
        {
          // completedAt non-null — should appear in export
          completedAt: new Date('2026-03-01T10:00:00Z'),
          exerciseName: '=INJECTION',
          setNumber: 1,
          actualWeight: 100,
          actualReps: 5,
        },
        {
          // completedAt null — should NOT appear in export
          completedAt: null,
          exerciseName: 'Squat',
          setNumber: 2,
          actualWeight: null,
          actualReps: null,
        },
      ],
    };
    const { service, sessionRepo } = makeService();
    sessionRepo.findByMember.mockResolvedValue([injectionSession]);

    const csv = await service.exportSessionsCsv(owner, 'member1');
    const lines = csv.split('\n');

    // First line is header
    expect(lines[0]).toBe(
      'date,dayName,exerciseName,setNumber,actualWeight,actualReps',
    );
    // Only the completed set appears
    expect(lines).toHaveLength(2);
    // Injection char prefixed with single quote inside quotes
    expect(lines[1]).toContain('"\'=INJECTION"');
  });
});
