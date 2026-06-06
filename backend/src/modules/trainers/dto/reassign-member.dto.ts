import { IsMongoId } from 'class-validator';

export class ReassignMemberDto {
  @IsMongoId()
  trainerId: string;
}
