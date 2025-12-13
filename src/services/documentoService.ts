import path from "path";
import { DomainError } from "../interfaces/errors";
import { insertDocumento } from "../repositories/documentoRepository";
import { ensurePacientePropietario } from "../utils/vinculoUtils";
import { CrearDocumentosPayload } from "../interfaces/documento";
import { UserContext } from "../interfaces/context";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const crearDocumentosService = async (
  files: Express.Multer.File[] | undefined,
  payload: CrearDocumentosPayload,
  context: UserContext
) => {
  if (!files?.length) {
    throw new DomainError("No se recibieron archivos", 400);
  }

  const invalido = files.find(
    (file) =>
      !ALLOWED_MIME_TYPES.has(file.mimetype) || file.size > MAX_FILE_SIZE
  );

  if (invalido) {
    throw new DomainError(
      "Archivo inválido. Permitidos: PDF, JPG, PNG hasta 5MB",
      422
    );
  }

  let pacienteId = payload.pacienteId;

  if (context.rol === "paciente") {
    pacienteId = await ensurePacientePropietario(
      context.userId,
      payload.pacienteId
    );
  } else if (context.rol !== "admin") {
    throw new DomainError("No autorizado", 403);
  }

  if (!pacienteId) {
    throw new DomainError(
      "Debe indicar el pacienteId para adjuntar documentos",
      400
    );
  }

  const registros: any[] = [];
  const fecha = new Date().toISOString().slice(0, 10);

  for (const file of files) {
    const rutaRelativa = path.relative(process.cwd(), file.path);

    await insertDocumento(undefined, {
      pacienteId,
      consultaId: null,
      descripcion: payload.descripcion ?? file.originalname,
      rutaArchivo: rutaRelativa,
      fecha,
    });

    registros.push({
      nombre: file.originalname,
      ruta: rutaRelativa,
      size: file.size,
    });
  }

  return registros;
};
