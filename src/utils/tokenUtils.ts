import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET ?? "nutrito-secret";
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION ?? "8h";

export interface TokenPayload {
  usuarioId: number;
  rol: string;
}

export const generateAuthToken = (payload: TokenPayload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION as SignOptions["expiresIn"],
  });

export const generateInvitationToken = (expirationDays: number = 7) => {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

  return {
    token,
    expiresAt,
  };
};
