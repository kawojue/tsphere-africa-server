import { JwtService } from '@nestjs/jwt'
import StatusCodes from 'enums/StatusCodes'
import { SendRes } from 'lib/sendRes.service'
import { NestMiddleware } from '@nestjs/common'
import { PrismaService } from 'lib/prisma.service'
import { NextFunction, Request, Response } from 'express'

export class ArticleMiddlware implements NestMiddleware {
    private response: SendRes
    private prisma: PrismaService
    private jwtService: JwtService

    constructor() {
        this.response = new SendRes()
        this.prisma = new PrismaService()
        this.jwtService = new JwtService()
    }

    private async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
        } catch {
            return null
        }
    }

    private async retrieveArticle(articleId: string) {
        return await this.prisma.article.findUnique({
            where: { id: articleId }
        })
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const article = await this.retrieveArticle(req.params?.articleId)

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

        const isOwner = (article.adminId || article.authorId) === sub
        if ((!role || !sub) || (role && !isOwner)) {
            const transaction = await this.prisma.$transaction([
                this.prisma.article.update({
                    where: { id: req.params.articleId },
                    data: {
                        views: { increment: 1 }
                    }
                })
            ])

            if (transaction && !Array.isArray(transaction)) {
                return this.response.sendError(res, StatusCodes.InternalServerError, "Error updating view count")
            }
        }

        if (sub) {
            req.user = { sub, role }
        }

        next()
    }
}