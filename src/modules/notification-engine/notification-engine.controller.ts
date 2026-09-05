import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger"
import { NotificationEngineService } from "./notification-engine.service"
import { SessionService } from "../session/session.service"
import { MessageService } from "../message/message.service"

@ApiTags("notification-engine")
@Controller("sessions/:sessionId/notification-engine")
export class NotificationEngineController {
  constructor(
    private readonly notificationEngineService: NotificationEngineService,
    private readonly sessionService: SessionService,
    private readonly messageService: MessageService,
  ) {}

  @Get("event-types")
  @ApiOperation({ summary: "List all supported notification event types" })
  @ApiResponse({ status: 200, description: "List of event types" })
  getEventTypes() {
    return { ok: true, eventTypes: this.notificationEngineService.getSupportedEventTypes() }
  }

  @Post("send-event")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Build a notification from an event template and send it" })
  @ApiParam({ name: "sessionId", description: "Session ID" })
  @ApiResponse({ status: 200, description: "Notification rendered and sent" })
  @ApiResponse({ status: 400, description: "Invalid event type or payload" })
  async sendEvent(
    @Param("sessionId") sessionId: string,
    @Body() body: { eventType: string; chatId: string; payload?: Record<string, any> },
  ) {
    const { eventType, chatId, payload } = body
    if (!eventType || typeof eventType !== "string") {
      return { ok: false, error: "eventType is required" }
    }
    if (!chatId || typeof chatId !== "string") {
      return { ok: false, error: "chatId is required" }
    }

    const resolved = this.notificationEngineService.resolveEvent(eventType, payload || {})
    if (!resolved) {
      return { ok: false, error: `No template for event: ${eventType}` }
    }

    const result = await this.messageService.sendText(sessionId, { chatId, text: resolved.message })
    return { ok: true, templateName: resolved.templateName, language: resolved.language, message: resolved.message, sendResult: result }
  }

  @Post("preview-event")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Preview a notification template without sending" })
  @ApiResponse({ status: 200, description: "Template preview" })
  async previewEvent(@Body() body: { eventType: string; payload?: Record<string, any> }) {
    const { eventType, payload } = body
    if (!eventType) {
      return { ok: false, error: "eventType is required" }
    }
    const resolved = this.notificationEngineService.resolveEvent(eventType, payload || {})
    if (!resolved) {
      return { ok: false, error: `No template for event: ${eventType}` }
    }
    return { ok: true, previewOnly: true, templateName: resolved.templateName, language: resolved.language, message: resolved.message }
  }
}
