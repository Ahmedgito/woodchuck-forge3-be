import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { InfinityPaginationResultType } from '../utils/types/infinity-pagination-result.type';
import { NullableType } from '../utils/types/nullable.type';
import { QueryUserDto } from './dto/query-user.dto';
import { User } from './domain/user';
import { UsersService } from './users.service';
import { AuthResetPasswordDto } from 'src/auth/dto/auth-reset-password.dto';
import { RefreshAccountCodeDto } from './dto/refresh-account-code.dto';
import { CreateSubUserDto } from './dto/create-sub-user.dto';
import { UserPhotoFileInterceptor } from './utils/client-profile-image-interceptor';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiKeyService } from 'src/api-key/api-key.service';
import { SkipAll } from 'src/auth/skip-all.decorator';
import { StatusEnum } from 'src/statuses/statuses.enum';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(UserPhotoFileInterceptor())
  @ApiConsumes('multipart/form-data')
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createProfileDto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(createProfileDto, file);
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.manufacturer, RoleEnum.general_contractor, RoleEnum.wood_processing)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me/api-key')
  async getMyApiKey(@Request() req) {
    return this.apiKeyService.getUserKey(Number(req.user.id));
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.manufacturer, RoleEnum.general_contractor, RoleEnum.wood_processing)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('me/refresh-api-key')
  async refreshMyApiKey(@Request() req) {
    return this.apiKeyService.refreshApiKey(Number(req.user.id));
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('cms')
  @HttpCode(HttpStatus.OK)
  async getCmsUsers(@Request() req): Promise<User[]> {
    return this.usersService.find({ role: { id: RoleEnum.cms }, status: { id: StatusEnum.active } });
  }

  // Admin-only backfill for existing Construction Company and Manufacturer users
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/backfill-api-keys')
  async backfillApiKeys() {
    return this.usersService.backfillApiKeysForCompanyAndManufacturer();
  }

  @SkipAll()
  // Admin-only: generate (or regenerate) and return the raw API key for any user by ID
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin/:id/generate-api-key')
  @HttpCode(HttpStatus.OK)
  async adminGenerateApiKey(@Param('id', ParseIntPipe) id: number) {
    const apiKey = await this.apiKeyService.generateAndStoreKey(id);
    return { userId: id, apiKey };
  }

  // Admin-only: retrieve decrypted API key for CO2True integration user
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/co2true/api-key')
  @HttpCode(HttpStatus.OK)
  async adminGetCo2TrueApiKey() {
    const result = await this.apiKeyService.getCo2TrueUserKey();
    if (!result) {
      throw new NotFoundException('CO2True user or API key not found');
    }
    return result;
  }

  // Admin-only: retrieve the current (decrypted) raw API key for any user by ID
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin/:id/api-key')
  @HttpCode(HttpStatus.OK)
  async adminGetApiKey(@Param('id', ParseIntPipe) id: number) {
    return this.apiKeyService.getUserKey(id);
  }
  @SkipAll()
  @Post('verifyAccount')
  verifyAccount(@Body() resetPasswordDto: AuthResetPasswordDto) {
    return this.usersService.verifyAccount(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @SkipAll()
  @Get('confirmVerifyToken')
  @HttpCode(HttpStatus.OK)
  confirmEmailVerify(@Query('hash') hashString: string): Promise<void> {
    return this.usersService.confirmEmailVerify(hashString);
  }

  @SkipAll()
  @Post('refreshAccountCode')
  refreshVerifyCode(@Body() refreshAccountCodeDto: RefreshAccountCodeDto) {
    return this.usersService.refreshCode(refreshAccountCodeDto);
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.admin,
    RoleEnum.cms,
    RoleEnum.power_plant,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.general_contractor,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['admin', 'manufacturer', 'wood_processing', 'end_client', 'general_contractor'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryUserDto,
    @Request() req, // Get authenticated user
  ): Promise<InfinityPaginationResultType<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    if (
      req.user.role.id === RoleEnum.end_client &&
      process.env.IS_DEMO !== 'true'
    ) {
      query.filters = {
        ...query.filters,
        endClientId: req.user.parentUserId || req.user.id,
      };
    } else if (process.env.IS_DEMO === 'true') {
      limit = 1;
      query = { ...query, sort: [{ orderBy: 'id', order: 'ASC' }] };
    }

    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.general_contractor,
    RoleEnum.end_client,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['manufacturer', 'wood_processing', 'general_contractor', 'end_client'],
  })
  @Get('subUsers')
  @HttpCode(HttpStatus.OK)
  async findAllSubUsers(
    @Query() query: QueryUserDto,
    @Request() req, // Get authenticated user
  ): Promise<InfinityPaginationResultType<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    query.filters = {
      ...query.filters,
      subUser: true,
      parentUserId: req.user.id, // Filter by the authenticated user's ID
    };

    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.admin,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.general_contractor,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['admin', 'manufacturer', 'wood_processing', 'end_client', 'general_contractor'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findOne({ id });
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.admin,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
    RoleEnum.general_contractor,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['admin', 'manufacturer', 'wood_processing', 'end_client', 'general_contractor'],
  })
  @UseInterceptors(UserPhotoFileInterceptor())
  @ApiConsumes('multipart/form-data')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: User['id'],
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProfileDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.usersService.update(id, updateProfileDto, true, file);
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: User['id']): Promise<void> {
    return this.usersService.softDelete(id);
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.general_contractor,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SerializeOptions({
    groups: ['general_contractor', 'manufacturer', 'wood_processing'],
  })
  @Post('subUser')
  @HttpCode(HttpStatus.CREATED)
  createSubUser(
    @Body() createProfileDto: CreateSubUserDto,
    @Request() req,
  ): Promise<User> {
    return this.usersService.createSubUser(createProfileDto, req.user);
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.general_contractor,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('subUser/:id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  removeSubUser(@Param('id') id: User['id'], @Request() req): Promise<void> {
    return this.usersService.deleteSubUser(id, req.user.id);
  }

  @ApiBearerAuth()
  @Roles(
    RoleEnum.general_contractor,
    RoleEnum.manufacturer,
    RoleEnum.wood_processing,
    RoleEnum.end_client,
  )
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('subUser/:id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  async updateSubUser(
    @Param('id') id: User['id'],
    @Body() body: UpdateUserDto,
    @Request() req,
  ): Promise<User | null> {
    return this.usersService.updateSubUser(id, req.user.id, body);
  }
}
