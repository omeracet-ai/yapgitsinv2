import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * AppConfig WebSocket Gateway (Voldi-fs)
 *
 * Namespace: `/app-config`
 * Emits `app-config:updated` to all connected clients whenever an admin
 * mutates theme/branding/setting/layout/visibility. Flutter listens and
 * invalidates its cached `appConfigProvider` for instant UI refresh.
 *
 * No auth — public read endpoint mirrored. Best-effort only; never throws.
 */
@Injectable()
@WebSocketGateway({
  namespace: 'app-config',
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  },
})
export class AppConfigGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppConfigGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug?.(`app-config client connected: ${client.id}`);
  }

  /** Broadcast a single update event. Safe — swallows missing server. */
  pushUpdate(payload: { type: string }): void {
    try {
      if (!this.server) return;
      this.server.emit('app-config:updated', {
        type: payload.type,
        at: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(
        `pushUpdate failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
