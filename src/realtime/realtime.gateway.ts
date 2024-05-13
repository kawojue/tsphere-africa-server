import { Server, Socket } from 'socket.io'
import { RealtimeService } from './realtime.service'
import {
  WebSocketGateway, OnGatewayConnection, OnGatewayInit, WebSocketServer
} from '@nestjs/websockets'

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server

  constructor(private readonly realtimeService: RealtimeService) { }

  private clients: Set<Socket> = new Set()

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized')
    this.realtimeService.setServer(server)
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`)
    this.clients.add(client)
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`)
    this.clients.delete(client)
  }
}
