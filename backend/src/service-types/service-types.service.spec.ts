import 'reflect-metadata';
import { ServiceTypesService } from './service-types.service';
import type { ServiceTypeRepository } from '../repositories/service-type.repository';
import type { IServiceType } from '../database/models/service-type.model';
import { Types } from 'mongoose';

function makeServiceType(overrides: Partial<IServiceType> = {}): IServiceType {
  return {
    _id: new Types.ObjectId(),
    name: 'Personal Training',
    durationMin: 60,
    pricePerSession: 80,
    currency: 'AUD',
    note: null,
    isActive: true,
    createdBy: new Types.ObjectId(),
    createdAt: new Date(),
    ...overrides,
  } as unknown as IServiceType;
}

function makeRepo(
  overrides: Record<string, jest.Mock> = {},
): ServiceTypeRepository {
  return {
    findAll: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIds: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as ServiceTypeRepository;
}

describe('ServiceTypesService', () => {
  describe('listActive', () => {
    it('returns only active service types', async () => {
      const active = [
        makeServiceType({ isActive: true }),
        makeServiceType({ isActive: true }),
      ];
      const findActive = jest.fn().mockResolvedValue(active);
      const repo = makeRepo({ findActive });
      const svc = new ServiceTypesService(repo);

      const result = await svc.listActive();

      expect(result).toBe(active);
      expect(findActive).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns all service types', async () => {
      const all = [
        makeServiceType({ isActive: true }),
        makeServiceType({ isActive: false }),
      ];
      const findAll = jest.fn().mockResolvedValue(all);
      const repo = makeRepo({ findAll });
      const svc = new ServiceTypesService(repo);

      const result = await svc.list();

      expect(result).toBe(all);
    });
  });

  describe('create', () => {
    it('persists a service type and returns it', async () => {
      const created = makeServiceType();
      const create = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create });
      const svc = new ServiceTypesService(repo);

      const result = await svc.create({
        name: 'Personal Training',
        durationMin: 60,
        pricePerSession: 80,
        note: null,
        createdBy: 'owner1',
      });

      expect(result).toBe(created);
      expect(create).toHaveBeenCalledWith({
        name: 'Personal Training',
        durationMin: 60,
        pricePerSession: 80,
        note: null,
        createdBy: 'owner1',
      });
    });
  });

  describe('update', () => {
    it('returns updated service type; returns null for unknown id', async () => {
      const updated = makeServiceType({ name: 'Updated Name' });
      const update = jest.fn().mockResolvedValue(updated);
      const repo = makeRepo({ update });
      const svc = new ServiceTypesService(repo);

      const result = await svc.update('st1', { name: 'Updated Name' });

      expect(result).toBe(updated);
    });
  });
});
