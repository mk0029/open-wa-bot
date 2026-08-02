import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Machine-readable outbound delivery error.
 *
 * Thrown by MessageService when a WhatsApp send fails, replacing the raw engine
 * error so API callers get a structured contract instead of an opaque 500:
 *
 *   {
 *     statusCode: 422,
 *     errorCode: "NUMBER_NOT_ON_WHATSAPP",
 *     retryable: false,
 *     message: "..."
 *   }
 *
 * `retryable` tells queueing clients whether to schedule an exponential-backoff
 * retry (network blips, reconnect windows, rate limits) or to fail permanently
 * (unregistered number, invalid chat id). The `message` field keeps the original
 * engine text so existing error-message assertions/logs stay unchanged.
 */
export class WhatsAppDeliveryError extends HttpException {
  constructor(input: {
    errorCode: string;
    message: string;
    retryable: boolean;
    status?: number;
  }) {
    super(
      {
        statusCode: input.status ?? HttpStatus.BAD_GATEWAY,
        errorCode: input.errorCode,
        retryable: input.retryable,
        message: input.message,
      },
      input.status ?? HttpStatus.BAD_GATEWAY,
    );
  }
}
