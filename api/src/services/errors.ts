// Domain error used by services and translated to HTTP status by the error handler.

export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}
