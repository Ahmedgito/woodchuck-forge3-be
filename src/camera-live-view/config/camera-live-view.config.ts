import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { CameraLiveViewConfig } from './camera-live-view.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  CAMERA_ACCESS_USERNAME: string;

  @IsString()
  @IsOptional()
  CAMERA_ACCESS_PASSWORD: string;
}

export default registerAs<CameraLiveViewConfig>('camera', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    username: process.env.CAMERA_ACCESS_USERNAME,
    password: process.env.CAMERA_ACCESS_PASSWORD,
    timezone: process.env.CAMERA_TIMEZONE,
    cameraStartTime: process.env.CAMERA_START_TIME,
    cameraEndTime: process.env.CAMERA_END_TIME,
  };
});
