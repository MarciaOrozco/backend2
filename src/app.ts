import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db";
import nutricionistaRoutes from "./routes/nutricionistaRoutes";
import authRoutes from "./routes/authRoutes";
import { authenticateJWT, authorizeRole } from "./middlewares/authMiddleware";
import turnoRoutes from "./routes/turnoRoutes";
import pacienteRoutes from "./routes/pacienteRoutes";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Prueba de conexión
app.get("/ping", async (_, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, result: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/nutricionistas", nutricionistaRoutes);
app.use(
  "/api/pacientes",
  authenticateJWT,
  authorizeRole("paciente", "nutricionista", "admin"),
  pacienteRoutes
);
app.use(
  "/api/turnos",
  authenticateJWT,
  authorizeRole("paciente", "admin", "nutricionista"),
  turnoRoutes
);
// app.use(
//   "/api/documentos",
//   authenticateJWT,
//   authorizeRole("paciente", "admin"),
//   documentoRoutes
// );
// app.use(
//   "/api/consultas",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   consultaRoutes
// );
// app.use(
//   "/api/planes",
//   authenticateJWT,
//   authorizeRole("nutricionista", "paciente", "admin"),
//   planRoutes
// );

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
