// import { PartialType } from '@nestjs/swagger';
// import { CreateDumpsterLiveViewDto } from './create-dumpster-live-view.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

// export class UpdateDumpsterLiveViewDto extends PartialType(CreateDumpsterLiveViewDto) {}

export class UpdateDumpsterLiveViewDto {
  @ApiProperty()
  @IsNotEmpty()
  s3ImageUrl?: string;

  @ApiProperty()
  @IsNumber()
  fillPercentage?: number;
}
