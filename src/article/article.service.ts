import { Request, Response } from 'express'
import { Injectable } from '@nestjs/common'
import StatusCodes from 'enums/StatusCodes'
import { AwsService } from 'lib/aws.service'
import { SendRes } from 'lib/sendRes.service'
import { MiscService } from 'lib/misc.service'
import { genFileName } from 'helpers/genFilename'
import { Article, Comment } from '@prisma/client'
import { PrismaService } from 'lib/prisma.service'
import { CommentDto, FetchCommentsDto } from './dto/comment.dto'
import { FetchArticlesDto, PublishArticleDto } from './dto/article.dto'

@Injectable()
export class ArticleService {
    constructor(
        private readonly aws: AwsService,
        private readonly misc: MiscService,
        private readonly response: SendRes,
        private readonly prisma: PrismaService,
    ) { }

    async publishArticle(
        res: Response,
        file: Express.Multer.File,
        { sub, role }: ExpressUser,
        { category, content, title }: PublishArticleDto
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Cover photo is required")
            }

            if (file.size > (5 << 20)) {
                return this.response.sendError(res, StatusCodes.PayloadTooLarge, "Cover photo size is too large")
            }

            if (!['png', 'jpg'].includes(file.originalname.split('.').pop())) {
                return this.response.sendError(res, StatusCodes.UnsupportedContent, "Cover photo should be in form of image")
            }

            const path = `${sub}/article/${genFileName()}`
            await this.aws.uploadS3(file, path)
            const cover_photo = {
                path,
                url: this.aws.getS3(path),
                type: file.mimetype
            }

            let article: Article

            if (role === "admin") {
                article = await this.prisma.article.create({
                    data: {
                        pending_approval: false,
                        coverPhoto: cover_photo,
                        title, category, content,
                        admin: { connect: { id: sub } },
                        readingTime: await this.misc.calculateReadingTime(content),
                    }
                })
            } else {
                article = await this.prisma.article.create({
                    data: {
                        pending_approval: true,
                        coverPhoto: cover_photo,
                        title, category, content,
                        author: { connect: { id: sub } },
                        readingTime: await this.misc.calculateReadingTime(content),
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                data: article,
                message: `${role === 'admin' ? 'Blog posted!' : 'Blog is pending approval.'}`
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchArticles(
        req: Request,
        res: Response,
        { search = '', page = 1, limit = 100, q }: FetchArticlesDto
    ) {
        try {
            // @ts-ignore
            const sub = req.user?.sub
            // @ts-ignore
            const role = req.user?.role

            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            let articles = []

            const select = {
                id: true,
                likes: true,
                views: true,
                title: true,
                shares: true,
                category: true,
                approvedAt: true,
                publishedAt: true,
                pending_approval: true,
            }

            if (role === "admin" && sub) {
                if (q === "approved") {
                    articles = await this.prisma.article.findMany({
                        where: {
                            pending_approval: false,
                            OR: [{ title: { contains: search, mode: 'insensitive' } }]
                        },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { approvedAt: 'desc' },
                    })
                } else if (q === "pending") {
                    articles = await this.prisma.article.findMany({
                        where: {
                            pending_approval: true,
                            OR: [{ title: { contains: search, mode: 'insensitive' } }]
                        },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { publishedAt: 'desc' },
                    })
                } else {
                    articles = await this.prisma.article.findMany({
                        where: { OR: [{ title: { contains: search, mode: 'insensitive' } }] },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { publishedAt: 'desc' },
                    })
                }
            } else if (!sub && !role) {
                articles = await this.prisma.article.findMany({
                    where: {
                        pending_approval: false,
                        OR: [{ title: { contains: search, mode: 'insensitive' } }]
                    },
                    select,
                    take: limit,
                    skip: offset,
                    orderBy: { approvedAt: 'desc' },
                })
            } else {
                if (q === "approved") {
                    articles = await this.prisma.article.findMany({
                        where: {
                            authorId: sub,
                            pending_approval: false,
                            OR: [{ title: { contains: search, mode: 'insensitive' } }]
                        },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { approvedAt: 'desc' },
                    })
                } else if (q === "pending") {
                    articles = await this.prisma.article.findMany({
                        where: {
                            authorId: sub,
                            pending_approval: true,
                            OR: [{ title: { contains: search, mode: 'insensitive' } }]
                        },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { publishedAt: 'desc' },
                    })
                } else {
                    articles = await this.prisma.article.findMany({
                        where: {
                            authorId: sub,
                            OR: [{ title: { contains: search, mode: 'insensitive' } }]
                        },
                        select,
                        take: limit,
                        skip: offset,
                        orderBy: { publishedAt: 'desc' },
                    })
                }
            }

            const articlesWithTotalLikes = articles.map((article) => {
                return { ...article, likes: article.likes.length }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: articlesWithTotalLikes })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async approveArticle(res: Response, articleId: string) {
        try {
            const article = await this.prisma.article.findUnique({
                where: {
                    id: articleId,
                    pending_approval: true
                }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, "Article is either already approved or not found")
            }

            await this.prisma.article.update({
                where: { id: articleId },
                data: { pending_approval: false }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { message: "Article has been approved" })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleLikeOnArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser,
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: { id: articleId }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const existingLike = await this.prisma.like.findUnique({
                where: {
                    userId_articleId: {
                        articleId,
                        userId: sub,
                    },
                },
            })

            if (existingLike) {
                await this.prisma.like.delete({
                    where: {
                        id: existingLike.id,
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Like removed successfully',
                    hasLiked: false,
                })
            } else {
                await this.prisma.like.create({
                    data: {
                        user: {
                            connect: { id: sub },
                        },
                        article: {
                            connect: { id: articleId }
                        }
                    },
                })

                this.response.sendSuccess(res, StatusCodes.OK, {
                    message: 'Article liked successfully',
                    hasLiked: true,
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error toggling like on article')
        }
    }

    async removeArticle(
        res: Response,
        articleId: string,
        { sub, role }: ExpressUser
    ) {
        try {
            if (role === "admin") {
                const article = await this.prisma.article.findUnique({
                    where: { id: articleId },
                })

                if (!article) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
                }

                await this.clearArticle(article, articleId)
            } else {
                const article = await this.prisma.article.findUnique({
                    where: {
                        id: articleId,
                        authorId: sub
                    },
                })

                if (!article) {
                    return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
                }

                await this.clearArticle(article, articleId)
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Article has been removed successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error removing article")
        }
    }

    private async clearArticle(article: Article, articleId: string) {
        const cover_photo = article.coverPhoto
        if (cover_photo?.path) {
            await this.aws.deleteS3(cover_photo.path)
        }

        await this.prisma.$transaction([
            this.prisma.comment.deleteMany({
                where: { articleId }
            }),
            this.prisma.like.deleteMany({
                where: { articleId }
            }),
            this.prisma.article.delete({
                where: {
                    id: articleId
                }
            }),
        ])
    }

    async getArticle(
        req: Request,
        res: Response,
        articleId: string
    ) {
        try {
            // @ts-ignore
            const sub = req.user?.sub

            let article: any
            let hasLiked = false

            const inclusive = {
                author: {
                    select: {
                        id: true,
                        role: true,
                        email: true,
                        avatar: true,
                        lastname: true,
                        username: true,
                        firstname: true,
                    }
                },
                admin: {
                    select: { fullName: true, }
                },
                likes: {
                    where: { userId: sub },
                    select: { userId: true }
                }
            }

            if (sub) {
                article = await this.prisma.article.findUnique({
                    where: { id: articleId },
                    include: inclusive,
                })

                hasLiked = article.likes.length > 0
            } else {
                article = await this.prisma.article.findUnique({
                    where: { id: articleId },
                    include: inclusive
                })
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { article, hasLiked }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async addCommentOnArticle(
        res: Response,
        articleId: string,
        { sub }: ExpressUser,
        { content }: CommentDto,
    ) {
        try {
            let comment: Comment

            if (sub) {
                comment = await this.prisma.comment.create({
                    data: {
                        content,
                        article: {
                            connect: {
                                id: articleId
                            }
                        },
                        user: {
                            connect: {
                                id: sub
                            }
                        }
                    }
                })
            } else {
                comment = await this.prisma.comment.create({
                    data: {
                        content,
                        article: {
                            connect: {
                                id: articleId
                            }
                        }
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, { data: comment })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async removeCommentOnArticle(
        res: Response,
        articleId: string,
        commentId: string,
        { sub, role }: ExpressUser
    ) {
        try {
            const article = await this.prisma.article.findUnique({
                where: { id: articleId }
            })

            if (!article) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Article not found')
            }

            const comment = await this.prisma.comment.findUnique({
                where: {
                    articleId,
                    id: commentId,
                }
            })

            if (!comment) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Comment not found')
            }

            if (sub === comment.userId || role === 'admin') {
                await this.prisma.comment.delete({
                    where: {
                        articleId,
                        id: commentId,
                    }
                })
            }

            this.response.sendSuccess(res, StatusCodes.Created, {
                message: "Comment has been removed"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, 'Error removing a comment')
        }
    }

    async fetchComments(
        res: Response,
        articleId: string,
        { limit = 100, page = 1 }: FetchCommentsDto
    ) {
        limit = Number(limit)
        const offset = (Number(page) - 1) * limit

        this.response.sendSuccess(res, StatusCodes.OK, {
            data: await this.prisma.comment.findMany({
                take: limit,
                skip: offset,
                where: { id: articleId },
                orderBy: { commentedAt: 'desc' }
            })
        })
    }
}
