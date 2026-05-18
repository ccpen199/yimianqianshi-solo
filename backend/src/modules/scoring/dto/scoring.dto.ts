import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateScoreDto {
  @IsString()
  sampleId: string;

  @IsOptional()
  @IsString()
  dimensionId?: string;

  @IsString()
  scoreType: string;

  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CreateReviewDto {
  @IsString()
  sampleId: string;

  @IsOptional()
  @IsString()
  scoreId?: string;

  @IsString()
  reviewerId: string;

  @IsString()
  reviewerName: string;

  @IsNumber()
  originalScore: number;

  @IsNumber()
  newScore: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  status?: string;
}
