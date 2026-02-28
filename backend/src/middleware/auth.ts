import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/errors";
import { verifyAccessToken } from "../utils/tokens";
import { RoleKey } from "../models/common";

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing bearer token"));
    return;
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  try {
    const claims = verifyAccessToken(token);

    req.user = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      roleKey: claims.roleKey as RoleKey,
      email: claims.email,
      name: claims.name
    };

    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};
