import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  constructor(private http: HttpService) {}

  async forwardGet(url: string) {
    const res = await firstValueFrom(this.http.get(url));
    return res.data;
  }

  async forwardPost(url: string, data: any) {
    const res = await firstValueFrom(this.http.post(url, data));
    return res.data;
  }

  async forwardPatch(url: string, data: any) {
    const res = await firstValueFrom(this.http.patch(url, data));
    return res.data;
  }
}
