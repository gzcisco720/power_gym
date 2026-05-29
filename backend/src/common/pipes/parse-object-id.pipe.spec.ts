import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  describe('transform', () => {
    it('returns a Types.ObjectId for a valid 24-hex id', () => {
      const pipe = new ParseObjectIdPipe();
      const validId = '507f1f77bcf86cd799439011';
      const result = pipe.transform(validId);
      expect(result).toBeInstanceOf(Types.ObjectId);
      expect(result.toString()).toBe(validId);
    });

    it('throws BadRequestException for an invalid id string', () => {
      const pipe = new ParseObjectIdPipe();
      expect(() => pipe.transform('not-an-id')).toThrow(BadRequestException);
    });
  });
});
