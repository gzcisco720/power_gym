import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  connection: { readyState: 0 },
}));

describe('connectDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.connection as { readyState: number }).readyState = 0;
  });

  it('calls mongoose.connect with MONGODB_URI when not connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    (mongoose.connection as { readyState: number }).readyState = 0;

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
  });

  it('does not call mongoose.connect when already connected', async () => {
    (mongoose.connection as { readyState: number }).readyState = 1;

    await connectDB();

    expect(mongoose.connect).not.toHaveBeenCalled();
  });
});
