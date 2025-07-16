import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('users')
export class UsersController {
  constructor(private proxy: ProxyService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.proxy.forwardPost(`${process.env.USER_SERVICE_URL}/auth/login`, body);
  }

  @Post('register')
  register(@Body() body: any) {
    return this.proxy.forwardPost(`${process.env.USER_SERVICE_URL}/users`, body);
  }

  @Get('/me')
  getUser() {
    return this.proxy.forwardGet(`${process.env.USER_SERVICE_URL}/users/me`);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.proxy.forwardGet(`${process.env.USER_SERVICE_URL}/users/${id}`);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.proxy.forwardPatch(`${process.env.USER_SERVICE_URL}/users/${id}`, body);
  }
}