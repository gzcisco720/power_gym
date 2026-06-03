export interface TrainerListItem {
  id: string;
  name: string;
  email: string;
  memberCount: number;
}

export interface TrainerMember {
  id: string;
  name: string;
  email: string;
}

export interface TrainerDetailResponse {
  id: string;
  name: string;
  email: string;
  memberCount: number;
  joinDate: string; // ISO string from createdAt
  members: TrainerMember[];
}
