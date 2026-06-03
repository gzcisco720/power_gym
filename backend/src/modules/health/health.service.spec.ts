import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HealthService } from './health.service';
import { MemberInjury } from '../../common/models/member-injury.model';
import { MemberMedication } from '../../common/models/member-medication.model';
import { MemberMedicalHistory } from '../../common/models/member-medical-history.model';

const MEMBER_ID = new Types.ObjectId().toString();
const INJURY_ID = new Types.ObjectId().toString();
const MEDICATION_ID = new Types.ObjectId().toString();

describe('HealthService', () => {
  let service: HealthService;
  let injuryModel: {
    find: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
    findOne: jest.Mock;
  };
  let medicationModel: {
    find: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
    findOne: jest.Mock;
  };
  let medicalHistoryModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    injuryModel = {
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      findOne: jest.fn(),
    };
    medicationModel = {
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      findOne: jest.fn(),
    };
    medicalHistoryModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getModelToken(MemberInjury.name),
          useValue: injuryModel,
        },
        {
          provide: getModelToken(MemberMedication.name),
          useValue: medicationModel,
        },
        {
          provide: getModelToken(MemberMedicalHistory.name),
          useValue: medicalHistoryModel,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  // ─── Injuries ───────────────────────────────────────────────────────────────

  describe('findInjuries', () => {
    it('returns only injuries whose memberId matches the given user id, sorted by recordedAt desc', async () => {
      const fakeInjuries = [{ _id: 'a' }, { _id: 'b' }];
      const sortMock = jest.fn().mockResolvedValue(fakeInjuries);
      injuryModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findInjuries(MEMBER_ID);

      expect(injuryModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
      });
      expect(sortMock).toHaveBeenCalledWith({ recordedAt: -1 });
      expect(result).toEqual(fakeInjuries);
    });
  });

  describe('createInjury', () => {
    it('persists a new injury with status active and createdByRole member for the given user', async () => {
      const dto = { title: 'Left knee strain' };
      const saved = {
        _id: INJURY_ID,
        status: 'active',
        createdByRole: 'member',
        memberId: MEMBER_ID,
      };
      injuryModel.create.mockResolvedValue(saved);

      const result = await service.createInjury(dto, MEMBER_ID);

      expect(injuryModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Left knee strain',
          memberId: new Types.ObjectId(MEMBER_ID),
          status: 'active',
          createdByRole: 'member',
        }),
      );
      expect(result).toEqual(saved);
    });
  });

  describe('updateInjury', () => {
    it('updates allowed fields and, when status set to resolved, sets resolvedAt to a Date', async () => {
      const dto = { status: 'resolved' as const };
      const updated = {
        _id: INJURY_ID,
        status: 'resolved',
        resolvedAt: new Date(),
      };
      injuryModel.findOneAndUpdate.mockResolvedValue(updated);

      const result = await service.updateInjury(INJURY_ID, dto, MEMBER_ID);

      const [filter, update] = injuryModel.findOneAndUpdate.mock.calls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(filter).toEqual({
        _id: new Types.ObjectId(INJURY_ID),
        memberId: new Types.ObjectId(MEMBER_ID),
      });
      expect(update['resolvedAt']).toBeInstanceOf(Date);
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when no injury with that id belongs to the user', async () => {
      injuryModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateInjury(INJURY_ID, { title: 'new' }, MEMBER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteInjury', () => {
    it('throws ForbiddenException when the target injury has createdByRole trainer', async () => {
      injuryModel.findOne.mockResolvedValue({
        _id: INJURY_ID,
        createdByRole: 'trainer',
      });

      await expect(service.deleteInjury(INJURY_ID, MEMBER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('removes the injury when createdByRole is member', async () => {
      injuryModel.findOne.mockResolvedValue({
        _id: INJURY_ID,
        createdByRole: 'member',
      });
      injuryModel.findOneAndDelete.mockResolvedValue({ _id: INJURY_ID });

      await service.deleteInjury(INJURY_ID, MEMBER_ID);

      expect(injuryModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: new Types.ObjectId(INJURY_ID),
        memberId: new Types.ObjectId(MEMBER_ID),
      });
    });
  });

  // ─── Medications ─────────────────────────────────────────────────────────────

  describe('createMedication', () => {
    it('persists a medication with status active for the given user', async () => {
      const dto = {
        name: 'Ibuprofen',
        purpose: 'Pain relief',
        duration: 'short_term' as const,
        startDate: new Date('2026-01-01'),
      };
      const saved = {
        _id: MEDICATION_ID,
        status: 'active',
        memberId: MEMBER_ID,
      };
      medicationModel.create.mockResolvedValue(saved);

      const result = await service.createMedication(dto, MEMBER_ID);

      expect(medicationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: new Types.ObjectId(MEMBER_ID),
          status: 'active',
          name: 'Ibuprofen',
        }),
      );
      expect(result).toEqual(saved);
    });
  });

  describe('updateMedication', () => {
    it('sets status to ended and persists endDate when provided', async () => {
      const endDate = new Date('2026-06-01');
      const dto = { status: 'ended' as const, endDate };
      const updated = { _id: MEDICATION_ID, status: 'ended', endDate };
      medicationModel.findOneAndUpdate.mockResolvedValue(updated);

      const result = await service.updateMedication(
        MEDICATION_ID,
        dto,
        MEMBER_ID,
      );

      expect(medicationModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(MEDICATION_ID),
          memberId: new Types.ObjectId(MEMBER_ID),
        },
        expect.objectContaining({ status: 'ended', endDate }),
        { new: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteMedication', () => {
    it('throws NotFoundException when no medication with that id belongs to the user', async () => {
      medicationModel.findOneAndDelete.mockResolvedValue(null);

      await expect(
        service.deleteMedication(MEDICATION_ID, MEMBER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Medical History ─────────────────────────────────────────────────────────

  describe('getMedicalHistory', () => {
    it('returns empty-default shape (chronicConditions: []) when no record exists for the user', async () => {
      medicalHistoryModel.findOne.mockResolvedValue(null);

      const result = await service.getMedicalHistory(MEMBER_ID);

      expect(result).toEqual(
        expect.objectContaining({ chronicConditions: [] }),
      );
    });
  });

  describe('saveMedicalHistory', () => {
    it('upserts a single record keyed on memberId and returns the saved values', async () => {
      const dto = {
        chronicConditions: ['Asthma'],
        allergies: 'Penicillin',
      };
      const saved = {
        memberId: MEMBER_ID,
        chronicConditions: ['Asthma'],
        allergies: 'Penicillin',
      };
      medicalHistoryModel.findOneAndUpdate.mockResolvedValue(saved);

      const result = await service.saveMedicalHistory(dto, MEMBER_ID);

      const [filter, update, opts] = medicalHistoryModel.findOneAndUpdate.mock
        .calls[0] as [
        Record<string, unknown>,
        { $set: Record<string, unknown> },
        Record<string, unknown>,
      ];
      expect(filter).toEqual({ memberId: new Types.ObjectId(MEMBER_ID) });
      expect(update.$set).toMatchObject(dto);
      expect(opts).toEqual({ upsert: true, new: true });
      expect(result).toEqual(saved);
    });
  });
});
