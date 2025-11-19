// import { Router } from "express";
// import multer from "multer";
// import path from "path";
// import {
//   crearConsulta,
//   obtenerConsulta,
//   actualizarConsulta,
//   eliminarConsulta,
//   subirDocumentosConsulta,
//   exportarConsulta,
//   programarProximaCita,
// } from "../controllers/consultaController";

// const uploadsDir = path.resolve(process.cwd(), "uploads");
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, uploadsDir),
//   filename: (_req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, `${unique}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// const router = Router();

// router.post("/", crearConsulta);
// router.get("/:consultaId", obtenerConsulta);
// router.put("/:consultaId", actualizarConsulta);
// router.delete("/:consultaId", eliminarConsulta);
// router.post(
//   "/:consultaId/documentos",
//   upload.array("files", 10),
//   subirDocumentosConsulta,
// );
// router.post("/:consultaId/exportar", exportarConsulta);
// router.post("/:consultaId/proxima-cita", programarProximaCita);

// export default router;
