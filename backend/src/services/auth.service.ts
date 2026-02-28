import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { authRepository } from "../repositories/auth.repository";
import { UnauthorizedError } from "../utils/errors";
import { parseDurationToMs } from "../utils/duration";
import { sha256 } from "../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/tokens";

export const authService = {
  async login(input: { tenantId: string; email: string; password: string }) {
    const user = await authRepository.findUserByTenantAndEmail(input.tenantId, input.email);

    if (!user || !user.is_active) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const authUser = {
      userId: user.id,
      tenantId: user.tenant_id,
      roleKey: user.role_key,
      email: user.email,
      name: user.name
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(user.id, user.tenant_id);

    const refreshTokenHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));

    await authRepository.insertRefreshToken(user.id, user.tenant_id, refreshTokenHash, expiresAt.toISOString());

    return {
      accessToken,
      refreshToken,
      user: authUser
    };
  },

  async refresh(input: { refreshToken: string }) {
    const claims = verifyRefreshToken(input.refreshToken);
    const refreshTokenHash = sha256(input.refreshToken);

    const tokenRecord = await authRepository.validateRefreshToken(refreshTokenHash);
    if (!tokenRecord) {
      throw new UnauthorizedError("Refresh token is invalid or expired");
    }

    if (tokenRecord.userId !== claims.sub || tokenRecord.tenantId !== claims.tenantId) {
      throw new UnauthorizedError("Refresh token does not match user session");
    }

    const user = await authRepository.findUserById(tokenRecord.tenantId, tokenRecord.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedError("User not found or inactive");
    }

    await authRepository.revokeRefreshToken(refreshTokenHash);

    const authUser = {
      userId: user.id,
      tenantId: user.tenant_id,
      roleKey: user.role_key,
      email: user.email,
      name: user.name
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(user.id, user.tenant_id);
    const newHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));

    await authRepository.insertRefreshToken(user.id, user.tenant_id, newHash, expiresAt.toISOString());

    return { accessToken, refreshToken, user: authUser };
  },

  async logout(input: { refreshToken: string }) {
    const refreshTokenHash = sha256(input.refreshToken);
    await authRepository.revokeRefreshToken(refreshTokenHash);
  }
};
