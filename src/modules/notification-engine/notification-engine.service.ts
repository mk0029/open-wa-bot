import { Injectable } from "@nestjs/common"
import { resolveEventTemplate, SUPPORTED_EVENT_TYPES } from "./templates"
import type { TemplateResult } from "./templates"

@Injectable()
export class NotificationEngineService {
  getSupportedEventTypes(): string[] {
    return SUPPORTED_EVENT_TYPES
  }

  resolveEvent(eventType: string, payload: Record<string, any> = {}): TemplateResult | null {
    return resolveEventTemplate(eventType, payload)
  }
}
