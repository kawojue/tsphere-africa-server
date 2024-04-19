import { Role } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import {
  Body, Controller, Delete, Param, Patch, UploadedFile,
  Query, Req, Res, UseGuards, UseInterceptors, Post, Get,
} from '@nestjs/common'
import { ArticleService } from './article.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { CommentDto, FetchCommentsDto } from './dto/comment.dto'
import { FetchArticlesDto, PublishArticleDto } from './dto/article.dto'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags("Article")
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) { }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'The formdata key for the cover photo should be cover_photo'
  })
  @Post('/publish')
  @ApiConsumes('multipart/formdata')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @UseInterceptors(FileInterceptor('cover_photo'))
  async publishArticle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: PublishArticleDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.articleService.publishArticle(res, file, req.user, body)
  }

  @Get('/fetch')
  @ApiBearerAuth()
  async fetchArticles(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: FetchArticlesDto
  ) {
    return await this.articleService.fetchArticles(req, res, query)
  }

  @ApiBearerAuth()
  @Get('/fetch/:articleId')
  async getArticle(
    @Req() req: Request,
    @Res() res: Response,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.getArticle(req, res, articleId)
  }

  @ApiBearerAuth()
  @Patch('/approve/:articleId')
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async approveArticle(@Res() res: Response, @Param('articleId') articleId: string) {
    return await this.articleService.approveArticle(res, articleId)
  }

  @ApiBearerAuth()
  @Patch('/toogle-like/:articleId')
  @Role(Roles.client, Roles.creative, Roles.talent)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async toggleLikeOnArticle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.toggleLikeOnArticle(res, articleId, req.user)
  }

  @ApiBearerAuth()
  @Delete('/remove/:articleId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeArticle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.removeArticle(res, articleId, req.user)
  }

  @ApiBearerAuth()
  @Post('/comment/:articleId')
  async addCommentOnArticle(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: CommentDto,
    @Param('articleId') articleId: string
  ) {
    return await this.articleService.addCommentOnArticle(req, res, articleId, body)
  }

  @ApiBearerAuth()
  @Delete('/comment/:articleId/:commentId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeCommentOnArticle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string
  ) {
    return await this.articleService.removeCommentOnArticle(res, articleId, commentId, req.user)
  }

  @Get('/comment/:articleId')
  async fetchComments(
    @Res() res: Response,
    @Query() query: FetchCommentsDto,
    @Param('articleId') articleId: string,
  ) {
    return await this.articleService.fetchComments(res, articleId, query)
  }

  @Get('/share/:articleId')
  async incrementShares(
    @Req() req: Request,
    @Res() res: Response,
    @Param('articleId') articleId: string,
  ) {
    return await this.articleService.incrementShares(req, res, articleId)
  }
}
