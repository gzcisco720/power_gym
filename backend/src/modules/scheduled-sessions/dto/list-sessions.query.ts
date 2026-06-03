import { IsIn, IsOptional } from 'class-validator';

export class ListSessionsQuery {
  @IsOptional()
  @IsIn(['upcoming', 'past'])
  range?: 'upcoming' | 'past';
}
