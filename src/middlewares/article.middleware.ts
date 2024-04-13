import { JwtService } from '@nestjs/jwt'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { NestMiddleware } from '@nestjs/common'
import { PrismaService } from 'lib/prisma.service'
import { NextFunction, Request, Response } from 'express'

export class ArticleMiddlware implements NestMiddleware {
    constructor(
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    private async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch {
            return null
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const article = await this.prisma.article.findUnique({
            where: { id: req.params?.articleId }
        })

        if (!article) {
            return this.response.sendError(res, StatusCodes.NotFound, "Article not found")
        }

        let sub: string | null = null
        let role: string | null = null

        const authHeader = req.headers.authorization
        if (authHeader) {
            const token = authHeader.split(' ')[1]
            if (token) {
                const decodedToken = await this.validateAndDecodeToken(token)
                if (decodedToken) {
                    sub = decodedToken.sub
                    role = decodedToken.role
                }
            }
        }

        if (role !== 'admin' && article.authorId !== sub) {
            await this.prisma.article.update({
                where: { id: req.params.articleId },
                data: { views: { increment: 1 } }
            })
        }

        if (sub) {
            req.user = { sub, role }
        }

        next()
    }
}