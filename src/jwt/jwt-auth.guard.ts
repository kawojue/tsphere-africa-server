import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private jwtService: JwtService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())
        if (!roles) {
            return true
        }

        const ctx = context.switchToHttp()
        const request = ctx.getRequest()

        const token = request.headers.authorization?.split('Bearer ')[1]
        if (!token) return false

        try {
            const decoded = this.jwtService.verify(token)
            request.user = decoded
            return roles.includes(decoded.role)
        } catch (error) {
            return false
        }
    }
}