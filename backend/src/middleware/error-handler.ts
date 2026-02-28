import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { isProduction } from "../config/env";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    // Keep explicit app-level errors visible in platform logs.
    // eslint-disable-next-line no-console
    console.error("AppError:", error.message, error.details ?? null);
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  // eslint-disable-next-line no-console
  console.error("UnhandledError:", error instanceof Error ? error.stack : error);

  res.status(500).json({
    message: "Internal Server Error",
    details: isProduction ? null : message
  });
};
