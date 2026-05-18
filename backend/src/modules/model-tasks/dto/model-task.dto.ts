import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateModelTaskDto {
  @IsString()
  name: string;

  @IsString()
  modelName: string;

  @IsString()
  modelVersion: string;

  @IsOptional()
  @IsString()
  promptVersion?: string;

  @IsOptional()
  @IsString()
  parameters?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @IsString()
  evaluationSetId: string;
}

export class UpdateModelTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class RetrySampleDto {
  @IsOptional()
  @IsString()
  sampleId?: string;
}
