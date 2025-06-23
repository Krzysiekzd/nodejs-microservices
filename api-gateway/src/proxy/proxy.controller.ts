import { Controller, All, Req, Res, Next, UseGuards } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const SERVICE_MAP = {
  '/products': 'http://localhost:3000',
  '/orders': 'http://localhost:3009',
  '/users': 'http://localhost:3010',
};

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @UseGuards(JwtAuthGuard)
  @All(['/products/*', '/orders/*', '/users/*'])
  async proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    const path = req.path.split('/')[1];
    const baseUrl = SERVICE_MAP[`/${path}`];
    if (!baseUrl) return res.status(404).json({ message: 'Service not found' });

    const url = `${baseUrl}${req.originalUrl}`;
    try {
      const data = await this.proxyService.proxyRequest(req.method, url, req.body, req.headers);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json(err.response?.data || { message: 'Proxy error' });
    }
  }
}