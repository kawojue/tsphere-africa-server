import {
  ConnectedSocket,
  SubscribeMessage, MessageBody,
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayInit,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import StatusCodes from 'enums/StatusCodes'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'
import { InboxDTO, MessageDTO } from './dto/index.dto'
import { Admin, Message, Role, User } from '@prisma/client'

@WebSocketGateway({
  transports: ['polling', 'websocket'],
  cors: {
    origin: [
      'http://localhost:3000',
      'https://talentsphereafrica.co',
      'https://talentsphereafrica.com',
      'https://www.talentsphereafrica.co',
      'https://www.talentsphereafrica.com',
      'https://api.talentsphereafrica.co',
      'https://api.talentsphereafrica.com',
      'https://talentsphere-staging.onrender.com',
    ],
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server: Server

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) { }

  private clients: Map<Socket, { sub: string, role: Role }> = new Map()

  afterInit() {
    this.realtimeService.setServer(this.server)
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers['authorization']?.split('Bearer ')[1]
    if (!token) {
      client.emit('authorization_error', {
        status: StatusCodes.Unauthorized,
        message: 'Token does not exist'
      })
      return
    }

    try {
      const { sub, role } = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      })

      this.clients.set(client, { sub, role })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client)
  }

  @SubscribeMessage('send_message')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: MessageDTO) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: senderId, role: senderRole } = clientData

    const file = body.file
    const content = body.content
    const receiverId = body.receiverId

    if (!file && !content) {
      client.emit('validation_error', {
        status: StatusCodes.BadRequest,
        message: "Content or File is required",
      })
      return
    }

    let sender: User | Admin, receiver: User | Admin

    if (senderRole === 'admin') {
      sender = await this.prisma.admin.findUnique({ where: { id: senderId } })
      receiver = await this.prisma.user.findUnique({ where: { id: receiverId } })
    } else {
      sender = await this.prisma.user.findUnique({ where: { id: senderId } })
      receiver = await this.prisma.admin.findUnique({ where: { id: receiverId } })
    }

    if (!sender || !receiver) return

    const inbox = await this.prisma.inbox.findFirst({
      where: {
        OR: [
          { userId: senderId, adminId: receiverId },
          { userId: receiverId, adminId: senderId },
        ],
      },
    })

    const inboxId = inbox ? inbox.id : await this.realtimeService.createInbox(senderId, receiverId, senderRole)

    const messageData = {
      senderId: senderRole === 'admin' ? null : senderId,
      receiverId: senderRole === 'admin' ? senderId : receiverId,
      inboxId,
    } as {
      senderId: string | null
      receiverId: string | null
      inboxId: string
      content: string | null
      file: IFile
    }

    if (content) {
      messageData.content = content
    }

    if (file) {
      const validationResult = this.realtimeService.validateFile(file)
      if (validationResult?.status) {
        client.emit('validation_error', {
          status: validationResult.status,
          message: validationResult.message,
        })
        return
      }

      const serializedFile = await this.realtimeService.saveFile(validationResult.file, senderId)
      messageData.file = serializedFile
    }

    const message = await this.prisma.message.create({
      data: {
        content: messageData.content,
        inbox: { connect: { id: messageData.inboxId } },
        file: messageData.file ? messageData.file : undefined,
        sender: messageData.senderId ? { connect: { id: messageData.senderId } } : undefined,
        receiver: messageData.receiverId ? { connect: { id: messageData.receiverId } } : undefined
      },
    })

    console.log(message)

    const targetId = senderRole === 'admin' ? receiverId : senderId
    client.to(targetId).emit('receive_message', message)
  }

  @SubscribeMessage('fetch_messages')
  async fetchMessages(@ConnectedSocket() client: Socket, @MessageBody() body: InboxDTO) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: userId, role: userRole } = clientData
    const { inboxId } = body

    let messages: Message[]

    if (userRole === 'admin') {
      messages = await this.prisma.message.findMany({
        where: { inboxId },
        orderBy: { createdAt: 'asc' },
      })
    } else {
      const inbox = await this.prisma.inbox.findUnique({
        where: { id: inboxId },
      })

      if (!inbox || inbox.userId !== userId) {
        client.emit('authorization_error', {
          status: StatusCodes.Unauthorized,
          message: 'You are not authorized to fetch messages from this inbox'
        })
        return
      }

      messages = await this.prisma.message.findMany({
        where: { inboxId },
        orderBy: { createdAt: 'asc' },
      })

      await this.realtimeService.markMessagesAsRead(messages)
    }

    client.emit('messages', messages)
  }

  @SubscribeMessage('fetch_inboxes')
  async fetchInboxes(@ConnectedSocket() client: Socket) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: userId, role } = clientData

    let inboxes
    if (role === 'admin') {
      inboxes = await this.prisma.inbox.findMany({
        where: { adminId: userId },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              email: true,
              avatar: true,
              lastname: true,
              username: true,
              verified: true,
              firstname: true,
              email_verified: true,
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: { isRead: false }
          }
        },
        orderBy: {
          user: { role: 'asc' }
        }
      })
    } else {
      inboxes = await this.prisma.inbox.findMany({
        where: { userId },
        include: {
          admin: {
            select: {
              id: true,
              role: true,
              email: true,
              fullName: true,
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: { isRead: false }
          }
        }
      })
    }

    inboxes.forEach((inbox: any) => {
      inbox.unreadMessagesCount = inbox.messages.length
      delete inbox.messages
    })

    client.emit('inboxes', inboxes)
  }

  @SubscribeMessage('fetch_admins')
  async fetchAdmins(@ConnectedSocket() client: Socket) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    try {
      const admins = await this.prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      })

      client.emit('admins', admins)
    } catch (err) {
      console.error(err)
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: 'Unable to fetch admins'
      })
    }
  }
}
