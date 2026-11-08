import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const map: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con esos datos' },
      P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referencia inválida a otro registro' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro no encontrado' },
      P2034: { status: HttpStatus.CONFLICT, message: 'Conflicto de concurrencia, intentá de nuevo' },
    };

    const { status, message } = map[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno de base de datos',
    };

    response.status(status).json({ statusCode: status, message });
  }
}