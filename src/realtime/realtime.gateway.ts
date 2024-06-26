import {
  ConnectedSocket,
  SubscribeMessage, MessageBody,
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayInit,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import StatusCodes from 'enums/StatusCodes'
import {
  FetchMessagesDTO, MessageDTO, FetchInboxDTO
} from './dto/index.dto'
import { Message, Role } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { RealtimeService } from './realtime.service'

@WebSocketGateway({
  transports: ['polling', 'websocket'],
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://talentsphereafrica.co',
      'https://talentsphereafrica.com',
      'https://tsphere-admin.vercel.app',
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
    try {
      const clientData = this.clients.get(client)
      if (!clientData) return

      const { sub: senderId, role: senderRole } = clientData
      const { file, content, receiverId } = body

      if (!file && !content) {
        client.emit('validation_error', {
          status: StatusCodes.BadRequest,
          message: "Content or File is required",
        })
        return
      }

      const isSenderAdmin = senderRole === 'admin'
      const [sender, receiver] = await Promise.all([
        isSenderAdmin
          ? this.prisma.admin.findUnique({ where: { id: senderId } })
          : this.prisma.user.findUnique({ where: { id: senderId } }),
        isSenderAdmin
          ? this.prisma.user.findUnique({ where: { id: receiverId } })
          : this.prisma.admin.findUnique({ where: { id: receiverId } })
      ])

      if (!sender || !receiver) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: "Sender or Receiver not found"
        })
        return
      }

      const inbox = await this.prisma.inbox.findFirst({
        where: {
          OR: [
            { userId: isSenderAdmin ? receiverId : senderId, adminId: isSenderAdmin ? senderId : receiverId },
            { userId: isSenderAdmin ? senderId : receiverId, adminId: isSenderAdmin ? receiverId : senderId },
          ],
        },
      })

      const inboxId = inbox ? inbox.id : await this.realtimeService.createInbox(senderId, receiverId, senderRole)

      let serializedFile = null
      if (file) {
        const validationResult = this.realtimeService.validateFile(file)
        if (validationResult?.status) {
          client.emit('validation_error', {
            status: validationResult.status,
            message: validationResult.message,
          })
          return
        }
        serializedFile = await this.realtimeService.saveFile(validationResult.file, senderId)
      }

      const message = await this.prisma.message.create({
        data: {
          content: content || null,
          file: serializedFile,
          inbox: { connect: { id: inboxId } },
          adminSender: isSenderAdmin ? { connect: { id: senderId } } : undefined,
          userReceiver: isSenderAdmin ? { connect: { id: receiverId } } : undefined,
          userSender: !isSenderAdmin ? { connect: { id: senderId } } : undefined,
          adminReceiver: !isSenderAdmin ? { connect: { id: receiverId } } : undefined,
        },
      })

      const senderAlign = 'right'
      const receiverAlign = 'left'

      const messageWithSenderAlignment = { ...message, align: senderAlign }
      const messageWithReceiverAlignment = { ...message, align: receiverAlign }

      client.emit('sent_message', messageWithSenderAlignment)
      client.to(receiverId).emit('receive_message', messageWithReceiverAlignment)
    } catch (err) {
      console.error(err)
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: "Something went wrong"
      })
    }
  }

  @SubscribeMessage('fetch_messages')
  async fetchMessages(@ConnectedSocket() client: Socket, @MessageBody() body: FetchMessagesDTO) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: userId, role: userRole } = clientData
    const { inboxId } = body

    const inbox = await this.prisma.inbox.findUnique({
      where: { id: inboxId },
    })

    if (!inbox) {
      client.emit('error', {
        status: StatusCodes.NotFound,
        message: "Inbox not found",
      })
      return
    }

    let messages: Message[]

    if (userRole === 'admin') {
      messages = await this.prisma.message.findMany({
        where: { inboxId },
        orderBy: { createdAt: 'asc' },
      })
    } else {
      if (inbox.userId !== userId) {
        client.emit('authorization_error', {
          status: StatusCodes.Unauthorized,
          message: 'You are not authorized to fetch messages from this inbox',
        })
        return
      }

      messages = await this.prisma.message.findMany({
        where: { inboxId },
        orderBy: { createdAt: 'asc' },
      })
    }

    const messagesWithAlignment = messages.map(message => {
      let isSender = false
      if (userRole === 'admin' && message.adminSenderId === userId) {
        isSender = true
      } else if (userRole !== 'admin' && message.userSenderId === userId) {
        isSender = true
      }

      return {
        ...message,
        align: isSender ? 'right' : 'left',
      }
    })

    await this.realtimeService.markMessagesAsRead(messages)

    client.emit('messages', messagesWithAlignment)
  }

  @SubscribeMessage('fetch_inboxes')
  async fetchInboxes(@ConnectedSocket() client: Socket, @MessageBody() body: FetchInboxDTO) {
    const clientData = this.clients.get(client)
    if (!clientData) return

    const { sub: userId, role } = clientData
    const clientRole = body?.role

    let inboxes
    if (role === 'admin') {
      inboxes = await this.prisma.inbox.findMany({
        where: {
          adminId: userId,
          user: {
            role: clientRole === "user" ? {
              in: ["talent", "creative"]
            } : "client",
          }
        },
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
