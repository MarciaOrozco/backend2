import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

/**
 * Template Method para exportar PDFs.
 * Define el ciclo de vida del PDF y delega el contenido en métodos hook.
 */
export abstract class BasePdfExporter<
  TPayload,
  TResult = { filePath: string; fileName: string }
> {
  async export(payload: TPayload): Promise<TResult> {
    const { doc, filePath, fileName, writeStream } = this.createDocument();

    try {
      await this.render(doc, payload);
      doc.end();
      await this.waitForStream(writeStream);
      return this.afterRender(filePath, fileName);
    } catch (error) {
      doc.end();
      await this.safeCleanup(filePath);
      throw error;
    }
  }
  /**
   * Hook principal: escribir el contenido del PDF.
   */
  protected abstract render(
    doc: PDFKit.PDFDocument,
    payload: TPayload
  ): Promise<void> | void;

  /**
   * Hook opcional: transformar el resultado antes de devolverlo.
   */
  protected afterRender(filePath: string, fileName: string): TResult {
    return { filePath, fileName } as unknown as TResult;
  }

  private createDocument() {
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = this.buildFileName();
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    return { doc, filePath, fileName, writeStream };
  }

  protected buildFileName(): string {
    return `export-${Date.now()}.pdf`;
  }

  private waitForStream(stream: fs.WriteStream): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    });
  }

  private async safeCleanup(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      /* ignore */
    }
  }
}
