import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { throwError } from 'rxjs';

@Injectable()
export class ProxyService {
  constructor(private http: HttpService) {}

  async forwardGet(url: string) {
    try {
      const res = await firstValueFrom(
        this.http.get(url).pipe(
          catchError((error: AxiosError) => throwError(() => error))
        )
      );
      return res.data;
    } catch (error) {
      throw error; // Let the global filter handle it
    }
  }

  async forwardPost(url: string, data: any) {
    try {
      const res = await firstValueFrom(
        this.http.post(url, data).pipe(
          catchError((error: AxiosError) => throwError(() => error))
        )
      );
      return res.data;
    } catch (error) {
      throw error; // Let the global filter handle it
    }
  }

  async forwardPatch(url: string, data: any) {
    try {
      const res = await firstValueFrom(
        this.http.patch(url, data).pipe(
          catchError((error: AxiosError) => throwError(() => error))
        )
      );
      return res.data;
    } catch (error) {
      throw error; // Let the global filter handle it
    }
  }
}
