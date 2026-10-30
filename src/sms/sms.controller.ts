import {
  Controller,
  Post,
  Body,
  SerializeOptions,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { CreateSmsDto } from './dto/create-sms.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard/jwt-auth-guard.guard';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { Request, Response } from 'express';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
// eslint-disable-next-line @typescript-eslint/no-var-requires

@Roles(RoleEnum.admin, RoleEnum.power_plant)
@ApiTags('Sms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({
  path: 'sms',
  version: '1',
})
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @UseGuards(RolesGuard)
  @Post()
  create(@Body() createSmsDto: CreateSmsDto) {
    return this.smsService.create(createSmsDto);
  }

  @SkipAll()
  @Post('recSms')
  async recSms(@Req() req: Request, @Res() res: Response) {
    const twimlResponse = new MessagingResponse();
    try {
      const resp: any = await this.smsService.parseSms(req.body);
      twimlResponse.message(resp.message);
      res.type('text/xml').send(twimlResponse.toString());
    } catch (exceptions) {
      twimlResponse.message(
        'Error: Incorrect request:please follow the instructions.',
      );
      res.type('text/xml').send(twimlResponse.toString());
    }
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.smsService.findOne(id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateSmDto: UpdateSmsDto) {
  //   return this.smsService.update(+id, updateSmDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.smsService.remove(+id);
  // }
}
