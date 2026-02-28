import { NextFunction, Request, Response } from "express";
import { z, ZodTypeAny } from "zod";
import { AppError } from "../utils/errors";

export const validate = (schema: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        schema.query.parse(req.query);
      }
      if (schema.params) {
        schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError("Validation failed", 422, error.flatten()));
        return;
      }
      next(error);
    }
  };
};
