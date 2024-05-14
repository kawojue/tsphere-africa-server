import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'
import { MessageBody, SubscribeMessage } from '@nestjs/websockets'

@Injectable()
export class RealtimeService {

    private server: Server

    setServer(server: Server) {
        this.server = server
    }
}
