/** @jest-environment node */
import mongoose from 'mongoose';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

describe('ScheduledSession model schema', () => {
  it('exports ScheduledSessionModel', () => {
    expect(ScheduledSessionModel).toBeDefined();
  });

  it('status defaults to scheduled', () => {
    const doc = new ScheduledSessionModel({
      trainerId: new mongoose.Types.ObjectId(),
      memberIds: [],
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(doc.status).toBe('scheduled');
  });

  it('seriesId defaults to null', () => {
    const doc = new ScheduledSessionModel({
      trainerId: new mongoose.Types.ObjectId(),
      memberIds: [],
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(doc.seriesId).toBeNull();
  });

  it('reminderSentAt defaults to null', () => {
    const doc = new ScheduledSessionModel({
      trainerId: new mongoose.Types.ObjectId(),
      memberIds: [],
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(doc.reminderSentAt).toBeNull();
  });

  it('memberIds defaults to empty array', () => {
    const doc = new ScheduledSessionModel({
      trainerId: new mongoose.Types.ObjectId(),
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(doc.memberIds).toEqual([]);
  });

  it('validates required fields', () => {
    const doc = new ScheduledSessionModel({});
    const err = doc.validateSync();
    expect(err?.errors.trainerId).toBeDefined();
    expect(err?.errors.date).toBeDefined();
    expect(err?.errors.startTime).toBeDefined();
    expect(err?.errors.endTime).toBeDefined();
  });
});
