import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/auth.decorators';
import { SessionService } from './session.service';

@ApiTags('health')
@Controller('internal')
export class KeepAliveController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('keep-alive')
  @Public()
  @SkipThrottle({ short: true, medium: true, long: true })
  @ApiOperation({ summary: 'Touch every active engine and return liveness summary' })
  @ApiResponse({ status: 200, description: 'Keep-alive summary' })
  async keepAlive(): Promise<{
    ok: boolean;
    total: number;
    alive: number;
    sessions: { id: string; name: string; status: string; phone: string | null; alive: boolean }[];
  }> {
    const result = await this.sessionService.keepAliveAll();
    return { ok: true, ...result };
  }
}
