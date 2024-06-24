import { Role } from 'src/role.decorator'
import { JobService } from './job.service'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { SortUserDto } from 'src/modmin/dto/user.dto'
import { ApplyJobDTO, PostJobDto } from './dto/job.dto'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import {
  UseGuards, Query, UploadedFiles, UseInterceptors, ParseFilePipe,
  Body, Controller, Put, Delete, Get, Param, Patch, Post, Req, Res,
} from '@nestjs/common'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'

@ApiTags("Job")
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post('/post')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  async postJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: PostJobDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    await this.jobService.postJob(res, req.user, files || [], body)
  }

  @Delete('/remove/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  async removeJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('jobId') jobId: string,
  ) {
    await this.jobService.removeJob(res, jobId, req.user)
  }

  @Patch('/approve-job/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin)
  async approveJob(
    @Res() res: Response,
    @Param('jobId') jobId: string,
  ) {
    await this.jobService.approveJob(res, jobId)
  }

  @Put('/apply-job/:jobId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiConsumes('multipart/form-data')
  @Role(Roles.creative, Roles.talent)
  @UseInterceptors(AnyFilesInterceptor())
  async applyJob(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: ApplyJobDTO,
    @Param('jobId') jobId: string,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false
      })
    ) attachments: Array<Express.Multer.File>,
  ) {
    await this.jobService.applyJob(res, jobId, req.user, body, attachments || [])
  }

  @Get('/fetch')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Role(Roles.admin, Roles.client)
  async fetchJobs(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: SortUserDto
  ) {
    await this.jobService.fetchJobs(res, req.user, query)
  }

  @Get('/job-list')
  async jobList(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: InfiniteScrollDto,
  ) {
    await this.jobService.jobList(req, res, query)
  }

  @Get('/job-list/:jobId')
  async getJob(@Res() res: Response, @Param('jobId') jobId: string) {
    await this.jobService.getJob(res, jobId)
  }

  @ApiBearerAuth()
  @Get('/job-applicants/:jobId')
  @Role(Roles.admin, Roles.client)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchJobApplicants(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('jobId') jobId: string
  ) {
    await this.jobService.fetchJobApplicants(res, jobId, req.user)
  }

  @ApiBearerAuth()
  @Role(Roles.admin)
  @Get('/all-job-applicants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchAllJobApplicants(@Res() res: Response, @Query() query: InfiniteScrollDto,) {
    await this.jobService.fetchAllJobApplicants(res, query)
  }
}
