import { Controller, Get, Post, Body, Param, Patch, Req } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import { Request } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('users')
export class UsersController {
  constructor(private proxy: ProxyService) {}

  @Post('login')
  login(@Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPost(`${process.env.USER_SERVICE_URL}/auth/login`, body, req);
  }

  @Post('register')
  register(@Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPost(`${process.env.USER_SERVICE_URL}/users`, body, req);
  }

  @Get('/me')
  getUser(@Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.USER_SERVICE_URL}/users/me`, req);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    return this.proxy.forwardGet(`${process.env.USER_SERVICE_URL}/users/${id}`, req);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.proxy.forwardPatch(`${process.env.USER_SERVICE_URL}/users/${id}`, body, req);
  }
}
