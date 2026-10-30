import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraLiveViewEntity } from './entities/camera-live-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CameraLiveViewEntity])],
})
export class RelationalCameraLiveViewPersistenceModule {}
