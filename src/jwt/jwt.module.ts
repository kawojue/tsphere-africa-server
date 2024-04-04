import { Module } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { PrismaService } from 'lib/prisma.service'
import { JwtModule as NestJwtModule } from '@nestjs/jwt'

@Module({
    imports: [
        NestJwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '90d' },
            global: true,
        }),
    ],
    providers: [JwtStrategy, PrismaService],
    exports: [NestJwtModule],
})
export class JwtModule { }