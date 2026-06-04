import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SeedTrainingDto {
  @IsString()
  @IsNotEmpty()
  memberEmail: string;

  @IsString()
  @IsNotEmpty()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  templateId: string;

  @IsOptional()
  seedCompletedSession?: boolean;
}
