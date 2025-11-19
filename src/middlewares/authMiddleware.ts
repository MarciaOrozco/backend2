import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "[AuthMiddleware] JWT_SECRET no está definido. Utiliza un valor seguro en el archivo .env"
  );
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const [, token] = authorization.split(" ");

  if (!token) {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET ?? "nutrito-secret") as {
      usuarioId: number;
      rol: string;
    };

    const userData: Request["user"] = {
      usuarioId: decoded.usuarioId,
      rol: decoded.rol,
      pacienteId: null,
      nutricionistaId: null,
    };

    if (decoded.rol === "paciente") {
      const [rows]: any = await pool.query(
        `SELECT paciente_id FROM paciente WHERE usuario_id = ? LIMIT 1`,
        [decoded.usuarioId],
      );

      if (!rows.length) {
        return res.status(403).json({ error: "Paciente no registrado" });
      }

      userData.pacienteId = Number(rows[0].paciente_id);
    } else if (decoded.rol === "nutricionista") {
      const [rows]: any = await pool.query(
        `SELECT nutricionista_id FROM nutricionista WHERE usuario_id = ? LIMIT 1`,
        [decoded.usuarioId],
      );

      if (!rows.length) {
        return res.status(403).json({ error: "Nutricionista no registrado" });
      }

      userData.nutricionistaId = Number(rows[0].nutricionista_id);
    }

    req.user = userData;

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const authorizeRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (!roles.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para realizar esta acción" });
    }

    return next();
  };
