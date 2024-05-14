import {
  SubscribeMessage, MessageBody,
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayInit,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'

@WebSocketGateway()
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

  afterInit() {
    console.log('WebSocket Gateway initialized')
    this.realtimeService.setServer(this.server)
  }

  async handleConnection(client: Socket) {
    // const token = client.handshake.headers.authorization?.split('Bearer ')[1]
    // if (!token) return

    // try {
    // const { sub, role } = await this.jwtService.verifyAsync(token)
    // this.clients.set(client, { sub: '23232', role: 'admin' })
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
  handleMessage(client: Socket, @MessageBody() body: any) {
    console.log(client.id)
    // const { sub, role } = this.clients.get(client)
    // console.log({ sub, role })
    console.log(body)
  }
}
