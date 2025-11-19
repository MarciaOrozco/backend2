// import { Router } from "express";
// import multer from "multer";
// import path from "path";
// import { crearDocumentos } from "../controllers/documentoController";

// const uploadsDir = path.resolve(process.cwd(), "uploads");

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, uploadsDir);
//   },
//   filename: (_req, file, cb) => {
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     cb(null, `${uniqueSuffix}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// const router = Router();

// router.post("/", upload.array("files", 10), crearDocumentos);

// export default router;
