export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export type FilterTab = 'all' | 'active' | 'maintenance' | 'retired';

export interface EquipmentItem {
  _id: string;
  name: string;
  brand?: string;
  quantity: number;
  status: EquipmentStatus;
  trackCondition: boolean;
  notes?: string;
  imageUrls?: string[];
  nextServiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConditionReport {
  _id: string;
  equipmentId: string;
  note: string;
  reportedAt: string;
}

export interface CreateEquipmentDto {
  name: string;
  brand?: string;
  quantity?: number;
  status?: EquipmentStatus;
  trackCondition?: boolean;
  notes?: string;
  imageUrls?: string[];
  nextServiceDate?: string;
}

export interface UpdateEquipmentDto {
  name?: string;
  brand?: string;
  quantity?: number;
  status?: EquipmentStatus;
  trackCondition?: boolean;
  notes?: string;
  imageUrls?: string[];
  nextServiceDate?: string;
}

export type UploadConfig =
  | {
      provider: 'cloudinary';
      uploadUrl: string;
      apiKey: string;
      signature: string;
      timestamp: number;
      folder: string;
      cloudName: string;
    }
  | {
      provider: 'local';
      uploadUrl: string;
      folder: string;
    };
