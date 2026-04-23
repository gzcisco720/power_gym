import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';
import type { BodyFatInput } from '@/lib/body-test/formulas';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

interface BodyTestPayload {
  protocol: '3site' | '7site' | '9site' | 'other';
  sex?: 'male' | 'female';
  age?: number;
  weight: number;
  date: string;
  bodyFatPct?: number;
  tricep?: number;
  chest?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
  midaxillary?: number;
  bicep?: number;
  lumbar?: number;
  targetWeight?: number | null;
  targetBodyFatPct?: number | null;
}

function buildBodyFatInput(body: BodyTestPayload): BodyFatInput {
  if (body.protocol === 'other') {
    return { protocol: 'other', bodyFatPct: body.bodyFatPct ?? 0 };
  }

  const sex = body.sex ?? 'male';
  const age = body.age ?? 0;

  if (body.protocol === '3site') {
    if (sex === 'male') {
      return {
        protocol: '3site',
        sex: 'male',
        age,
        chest: body.chest ?? 0,
        abdominal: body.abdominal ?? 0,
        thigh: body.thigh ?? 0,
      };
    }
    return {
      protocol: '3site',
      sex: 'female',
      age,
      tricep: body.tricep ?? 0,
      suprailiac: body.suprailiac ?? 0,
      thigh: body.thigh ?? 0,
    };
  }

  if (body.protocol === '7site') {
    return {
      protocol: '7site',
      sex,
      age,
      chest: body.chest ?? 0,
      midaxillary: body.midaxillary ?? 0,
      tricep: body.tricep ?? 0,
      subscapular: body.subscapular ?? 0,
      abdominal: body.abdominal ?? 0,
      suprailiac: body.suprailiac ?? 0,
      thigh: body.thigh ?? 0,
    };
  }

  return {
    protocol: '9site',
    sex,
    age,
    tricep: body.tricep ?? 0,
    chest: body.chest ?? 0,
    subscapular: body.subscapular ?? 0,
    abdominal: body.abdominal ?? 0,
    suprailiac: body.suprailiac ?? 0,
    thigh: body.thigh ?? 0,
    midaxillary: body.midaxillary ?? 0,
    bicep: body.bicep ?? 0,
    lumbar: body.lumbar ?? 0,
  };
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(memberId);
  return Response.json(tests);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as BodyTestPayload;
  const bodyFatInput = buildBodyFatInput(body);
  const bodyFatPct = calculateBodyFat(bodyFatInput);
  const { fatMassKg, leanMassKg } = calculateComposition(body.weight, bodyFatPct);

  const repo = new MongoBodyTestRepository();
  const test = await repo.create({
    memberId,
    trainerId: session.user.id,
    date: new Date(body.date),
    age: body.age ?? 0,
    sex: body.sex ?? 'male',
    weight: body.weight,
    protocol: body.protocol,
    tricep: body.tricep ?? null,
    chest: body.chest ?? null,
    subscapular: body.subscapular ?? null,
    abdominal: body.abdominal ?? null,
    suprailiac: body.suprailiac ?? null,
    thigh: body.thigh ?? null,
    midaxillary: body.midaxillary ?? null,
    bicep: body.bicep ?? null,
    lumbar: body.lumbar ?? null,
    bodyFatPct,
    leanMassKg,
    fatMassKg,
    targetWeight: body.targetWeight ?? null,
    targetBodyFatPct: body.targetBodyFatPct ?? null,
  });

  return Response.json(test, { status: 201 });
}
