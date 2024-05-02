import { Response } from 'express'
import { Role } from 'src/role.decorator'
import { AuthGuard } from '@nestjs/passport'
import { Role as Roles } from '@prisma/client'
import { ContactService } from './contact.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ContactDto, ReplyContactDto } from './dto/contact.dto'
import {
  Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards
} from '@nestjs/common'
import { InfiniteScrollDto } from 'src/user/dto/infinite-scroll.dto'

@ApiTags("Contact")
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) { }

  @Post('/contact-us')
  async contactUs(@Res() res: Response, @Body() body: ContactDto) {
    return await this.contactService.contactUs(res, body)
  }

  @Get('/fetch')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async fetchContacts(@Res() res: Response, @Query() query: InfiniteScrollDto) {
    return await this.contactService.fetchContacts(res, query)
  }

  @Get('/fetch/:contactId')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getContact(@Res() res: Response, @Param('contactId') contactId: string) {
    return await this.contactService.getContact(res, contactId)
  }

  @Delete('/remove/:contactId')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeContact(@Res() res: Response, @Param('contactId') contactId: string) {
    return await this.contactService.removeContact(res, contactId)
  }

  @Get('/reply/:contactId')
  @ApiBearerAuth()
  @Role(Roles.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async replyContact(
    @Res() res: Response,
    @Body() body: ReplyContactDto,
    @Param('contactId') contactId: string,
  ) {
    return await this.contactService.replyContact(res, contactId, body)
  }
}
