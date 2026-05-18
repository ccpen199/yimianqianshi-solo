import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateReportDto {
  @IsString()
  taskId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  stability?: number;

  @IsOptional()
  @IsNumber()
  avgLatencyMs?: number;

  @IsOptional()
  @IsNumber()
  totalTokenCost?: number;

  @IsOptional()
  @IsString()
  reportData?: string;
}

export class PublishReportDto {
  @IsString()
  publishedBy: string;
}

export class CreateConclusionDto {
  @IsString()
  reportId: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  author: string;
}
