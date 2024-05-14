import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayInit,
  SubscribeMessage, MessageBody,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'

@WebSocketGateway({ transports: ['websocket'] })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server: Server

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) { }

  private clients: Map<Socket, {
    sub: string
    role: Role
  }> = new Map()

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized')
    this.realtimeService.setServer(server)
  }

  handleConnection(client: Socket) {
    // const token = client.handshake.headers.authorization?.split('Bearer ')[1]
    // if (!token) return

    // try {
    //   const { sub, role } = this.jwtService.verify(token)
    //   this.clients.set(client, { sub, role })
    // } catch (err) {
    //   console.error(err)
    //   client.disconnect()
    // }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`)
    this.clients.delete(client)
  }

  @SubscribeMessage("newMessage")
  async messgeMe(@MessageBody() body: any) {
    console.log(body)
  }
}
