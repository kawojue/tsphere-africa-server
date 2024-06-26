import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import {
    Injectable, CanActivate, ExecutionContext
} from '@nestjs/common'
import { PrismaService } from 'lib/prisma.service'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())
        if (!roles) return true

        const ctx = context.switchToHttp()
        const request = ctx.getRequest()

        const token = request.headers.authorization?.split('Bearer ')[1]
        if (!token) return false

        try {
            const decoded = this.jwtService.verify(token)
            if (
                decoded?.sub && ['client', 'creative', 'talent'].includes(decoded.role)
            ) {
                return this.prisma.user.findUnique({
                    where: { id: decoded.sub }
                }).then(user => {
                    if ((decoded.userStatus !== user.userStatus) || (decoded.userStatus === 'suspended')) return false
                    request.user = decoded
                    return roles.includes(decoded.role)
                }).catch(error => {
                    return false
                })
            }
            request.user = decoded
            return roles.includes(decoded.role)
        } catch (error) {
            return false
        }
    }
}