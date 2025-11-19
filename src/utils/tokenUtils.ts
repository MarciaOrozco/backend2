import jwt, { type SignOptions } from "jsonwebtoken";

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
