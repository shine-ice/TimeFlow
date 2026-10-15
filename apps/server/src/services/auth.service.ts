import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/knex";
import { randomUUID } from "crypto";

export const AuthService = {
  async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  },

  async verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  },

  async issueToken(userId: string, deviceId: string) {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const accessToken = jwt.sign({ deviceId }, secret, {
      subject: userId,
      expiresIn: Number(process.env.JWT_EXPIRES_IN) || 1000 * 60 * 5,
    });

    const refreshTokenRaw = jwt.sign({ deviceId, type: "refresh" }, secret, {
      subject: userId,
      expiresIn: `${Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 30}d`,
    });

    const tokenHash = await bcrypt.hash(refreshTokenRaw, 10);

    const expiresAt = new Date(
      Date.now() +
        Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30) * 86400000,
    ).toISOString();

    await db("refresh_tokens").insert({
      id: randomUUID(),
      user_id: userId,
      device_id: deviceId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
    };
  },

  async verifyRefreshToken(userId: string, deviceId: string, token: string) {
    const rows = await db("refresh_tokens")
      .where({
        user_id: userId,
        device_id: deviceId,
      })
      .orderBy("id", "desc")
      .limit(10);

    for (const row of rows) {
      if (await bcrypt.compare(token, row.token_hash)) return true;
    }

    return false;
  },

  async rotateRefreshToken(refreshToken: string) {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(refreshToken, secret) as {
      sub?: string;
      deviceId?: string;
      type?: string;
    };
    if (!payload.sub || !payload.deviceId || payload.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    const userId = payload.sub;
    const deviceId = payload.deviceId || "unknown";

    const ok = await this.verifyRefreshToken(userId, deviceId, refreshToken);
    if (!ok) throw new Error("Invalid refresh token");

    await this.revokeDeviceTokens(userId, deviceId);
    const tokens = await this.issueToken(userId, deviceId);
    return tokens;
  },

  async revokeDeviceTokens(userId: string, deviceId: string) {
    await db("refresh_tokens")
      .where({
        user_id: userId,
        device_id: deviceId,
      })
      .delete();
  },
};
