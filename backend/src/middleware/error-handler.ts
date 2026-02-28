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
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";

  res.status(500).json({
    message: "Internal Server Error",
    details: isProduction ? null : message
  });
};
