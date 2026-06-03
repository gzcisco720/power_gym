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

export interface TrainerDetail {
  id: string;
  name: string;
  email: string;
  memberCount: number;
  joinDate: string;
  members: TrainerMember[];
}
