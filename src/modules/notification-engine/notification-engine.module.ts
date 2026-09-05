import { Module } from "@nestjs/common"
import { NotificationEngineController } from "./notification-engine.controller"
import { NotificationEngineService } from "./notification-engine.service"
import { SessionModule } from "../session/session.module"
import { MessageModule } from "../message/message.module"

@Module({
  imports: [SessionModule, MessageModule],
  controllers: [NotificationEngineController],
  providers: [NotificationEngineService],
  exports: [NotificationEngineService],
})
export class NotificationEngineModule {}
