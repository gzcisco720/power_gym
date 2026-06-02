export type FilterTab = 'all' | 'active' | 'inactive';

export interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  note: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateServiceTypeDto {
  name: string;
  durationMin: number;
  pricePerSession: number;
  note?: string;
}

export interface UpdateServiceTypeDto {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  note?: string | null;
  isActive?: boolean;
}
