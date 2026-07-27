import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Message } from '../message/entities/message.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { KeepAliveController } from './keep-alive.controller';
import { WebhookModule } from '../webhook/webhook.module';
import { StatusStoreModule } from '../status-store/status-store.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Message], 'data'), WebhookModule, StatusStoreModule],
  controllers: [SessionController, KeepAliveController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
