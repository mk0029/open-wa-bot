import { BadRequestException, ConflictException, HttpException, PayloadTooLargeException } from '@nestjs/common';

export interface ClassifiedSendError {
  errorCode: string;
  message: string;
  retryable: boolean;
  status: number;
}

/**
 * Classify an outbound-send failure into a machine-readable contract so queueing
 * clients (the shop reminder queue, cron workers) can decide retry vs permanent
 * failure instead of treating every error identically.
 *
 * Only transient conditions are marked retryable:
 *  - network/socket drops ("reconnect", "disconnected", timeouts)
 *  - engine not ready (session reconnecting / browser restarting)
 *  - rate limiting (WhatsApp backpressure)
 *  - unknown 5xx-class engine errors
 *
 * Permanent (never retried):
 *  - the recipient is not registered on WhatsApp
 *  - invalid / permanently rejected chat ids (400-class from the engine)
 *  - authorization failures
 */
export function classifySendError(error: unknown): ClassifiedSendError {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage || 'Unknown send failure';
  const lower = `${message} ${rawMessage}`.toLowerCase();

  if (error instanceof PayloadTooLargeException) {
    return { errorCode: 'PAYLOAD_TOO_LARGE', message, retryable: false, status: 413 };
  }

  if (error instanceof BadRequestException) {
    return { errorCode: 'INVALID_CHAT_ID', message, retryable: false, status: 400 };
  }

  if (error instanceof ConflictException) {
    return { errorCode: 'ENGINE_NOT_READY', message, retryable: true, status: 409 };
  }

  if (error instanceof HttpException) {
    return { errorCode: 'SEND_REJECTED', message, retryable: error.getStatus() >= 500, status: error.getStatus() };
  }

  // Recipient not on WhatsApp (engine-level probe or protocol rejection).
  if (
    lower.includes('not on whatsapp') ||
    lower.includes('number does not exist') ||
    lower.includes('recipient is not on whatsapp') ||
    lower.includes('number is not registered') ||
    lower.includes('not registered on whatsapp') ||
    lower.includes('recipient not in address book') ||
    lower.includes('person not found')
  ) {
    return { errorCode: 'NUMBER_NOT_ON_WHATSAPP', message, retryable: false, status: 422 };
  }

  // Rate limiting / spam backpressure — transient, retry with backoff.
  if (lower.includes('rate limit') || lower.includes('rate-limit') || lower.includes('too many requests') || lower.includes('429')) {
    return { errorCode: 'RATE_LIMITED', message, retryable: true, status: 429 };
  }

  // Network / client lifecycle conditions — the classic transient class.
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('econnreset') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('socket closed') ||
    lower.includes('connection closed') ||
    lower.includes('reconnect') ||
    lower.includes('disconnected') ||
    lower.includes('not connected') ||
    lower.includes('websocket') ||
    lower.includes('browser disconnected') ||
    lower.includes('session not active')
  ) {
    return { errorCode: 'NETWORK_ERROR', message, retryable: true, status: 503 };
  }

  // Anything else engine-side is treated as transient so the queue gets another
  // chance; a permanently-failing message eventually exhausts retries and lands
  // in `failed` with the last error recorded.
  return { errorCode: 'SEND_FAILED', message, retryable: true, status: 502 };
}
