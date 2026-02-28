import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser } from "../models/common";

interface AccessClaims {
  sub: string;
  tenantId: string;
  roleKey: string;
  email: string;
  name: string;
}

interface RefreshClaims {
  sub: string;
  tenantId: string;
}

export const generateAccessToken = (user: AuthUser): string => {
  const payload: AccessClaims = {
    sub: user.userId,
    tenantId: user.tenantId,
    roleKey: user.roleKey,
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
};

export const generateRefreshToken = (userId: string, tenantId: string): string => {
  const payload: RefreshClaims = {
    sub: userId,
    tenantId
  };

  return jwt.sign(payload, env.REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
};

export const verifyAccessToken = (token: string): AccessClaims => {
  return jwt.verify(token, env.JWT_SECRET) as AccessClaims;
};

export const verifyRefreshToken = (token: string): RefreshClaims => {
  return jwt.verify(token, env.REFRESH_SECRET) as RefreshClaims;
};
