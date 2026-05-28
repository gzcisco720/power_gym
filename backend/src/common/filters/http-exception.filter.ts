import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapter: AbstractHttpAdapter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? (() => {
          const res = exception.getResponse();
          if (typeof res === 'string') return res;
          if (typeof res === 'object' && res !== null && 'message' in res) {
            const msg = res.message;
            return Array.isArray(msg) ? msg.join(', ') : String(msg);
          }
          return exception.message;
        })()
      : 'Internal server error';

    response.status(statusCode).json({ statusCode, message });
  }
}
