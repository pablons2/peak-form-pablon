import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import {
  translateExceptionMessage,
  type TranslatedError,
} from "../exceptions/error-message-registry";

interface ValidationIssue {
  path: string;
  message: string;
}

interface ValidationErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  issues?: ValidationIssue[];
}

interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, response);
    } else if (exception instanceof Error) {
      this.handleUnexpectedError(exception, response);
    } else {
      this.handleUnknownError(response);
    }
  }

  private handleHttpException(
    exception: HttpException,
    response: Response,
  ): void {
    const statusCode = exception.getStatus();
    const responseBody = exception.getResponse();

    // Check if this is a validation error from ZodValidationPipe
    if (
      typeof responseBody === "object" &&
      responseBody !== null &&
      "issues" in responseBody
    ) {
      const validationResponse: ValidationErrorResponse = {
        statusCode,
        code: "VALIDATION_ERROR",
        message: "Dados inválidos. Corrija os campos destacados.",
        issues: (responseBody as any).issues,
      };
      response.status(statusCode).json(validationResponse);
      return;
    }

    // Extract the error message from the response
    let errorMessage = "Unknown error";
    if (typeof responseBody === "string") {
      errorMessage = responseBody;
    } else if (
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody
    ) {
      const msg = (responseBody as any).message;
      errorMessage = typeof msg === "string" ? msg : String(msg);
    }

    // Try to translate the error message
    const translated = translateExceptionMessage(errorMessage);

    const apiResponse: ApiErrorResponse = {
      statusCode,
      code: translated?.code ?? "UNKNOWN_ERROR",
      message:
        translated?.message ??
        "Ocorreu um erro. Tente novamente mais tarde.",
    };

    // Log if we couldn't translate the message
    if (!translated) {
      this.logger.warn(`Unmapped exception message: "${errorMessage}"`);
    }

    response.status(statusCode).json(apiResponse);
  }

  private handleUnexpectedError(
    error: Error,
    response: Response,
  ): void {
    // Log the full error on the server (never expose stack trace)
    this.logger.error(`Unexpected error: ${error.message}`, error.stack);

    const apiResponse: ApiErrorResponse = {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro no servidor. Tente novamente em instantes.",
    };

    response.status(500).json(apiResponse);
  }

  private handleUnknownError(response: Response): void {
    this.logger.error("Unknown error type caught by all-exceptions filter");

    const apiResponse: ApiErrorResponse = {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro no servidor. Tente novamente em instantes.",
    };

    response.status(500).json(apiResponse);
  }
}
