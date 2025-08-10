import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (this.isAxiosError(exception)) {
      // Handle Axios errors from downstream services
      const response = exception.response as any;
      status = response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      message = response?.data?.message || exception.message || 'Service unavailable';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private isAxiosError(error: any): error is AxiosError {
    return error?.isAxiosError === true;
  }
}
