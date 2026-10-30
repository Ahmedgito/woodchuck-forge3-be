import { IsBoolean, IsNumber } from 'class-validator';

export class ToggleClientConfigDto {
  @IsNumber()
  clientId: number;

  @IsBoolean()
  enabled: boolean;
}
