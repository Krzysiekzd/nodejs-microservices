import { HttpService } from '@nestjs/axios';
import { Injectable, HttpException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import type { AxiosRequestHeaders } from 'axios';
import { Request } from 'express';

@Injectable()
export class ProxyService {
  constructor(private http: HttpService) {}

  // Select a safe subset of headers to forward downstream (including Authorization).
  private pickHeaders(req?: Request): AxiosRequestHeaders {
    if (!req) return {} as any;
    const allow = new Set([
      'authorization',
      'content-type',
      'accept',
      'accept-encoding',
      'x-request-id',
      'x-correlation-id',
    ]);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue;
      const key = k.toLowerCase();
      if (!allow.has(key)) continue;
      out[key] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    if (!out['content-type']) out['content-type'] = 'application/json';
    return out as any;
  }

  // Unified executor: do not throw on 4xx/5xx; return exact status/body to the client.
  private async exec<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    req?: Request,
  ): Promise<T> {
    const res = await firstValueFrom(
      this.http.request<T>({
        method,
        url,
        data,
        headers: this.pickHeaders(req),
        validateStatus: () => true,
        timeout: 10000,
      }),
    );

    if (res.status >= 400) {
      throw new HttpException(res.data as any, res.status);
    }
    return res.data as T;
  }

  async forwardGet<T = any>(url: string, req?: Request) {
    return this.exec<T>('GET', url, undefined, req);
  }

  async forwardPost<T = any>(url: string, data: any, req?: Request) {
    return this.exec<T>('POST', url, data, req);
  }

  async forwardPatch<T = any>(url: string, data: any, req?: Request) {
    return this.exec<T>('PATCH', url, data, req);
  }

  async forwardDelete<T = any>(url: string, req?: Request) {
    return this.exec<T>('DELETE', url, undefined, req);
  }
}
