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

    if (isHttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        response.status(statusCode).json({ statusCode, message: res });
      } else if (typeof res === 'object' && res !== null) {
        // Pass through the full object — allows rich error payloads (e.g. ACTIVE_SESSION_EXISTS)
        response.status(statusCode).json({ statusCode, ...res });
      } else {
        response
          .status(statusCode)
          .json({ statusCode, message: exception.message });
      }
      return;
    }

    response
      .status(statusCode)
      .json({ statusCode, message: 'Internal server error' });
  }
}
