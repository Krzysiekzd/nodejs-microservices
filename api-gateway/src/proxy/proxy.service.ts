import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(method: string, url: string, data: any, headers: any) {
    const config = { headers };
    const observable = this.httpService.request({ method, url, data, ...config });
    const response = await lastValueFrom(observable);
    return response.data;
  }
}