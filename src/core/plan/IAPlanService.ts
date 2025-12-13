import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generarPlanIA(parametros: any) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Falta GEMINI_API_KEY en .env");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Genera un plan alimentario semanal en JSON para un paciente en ESPAÑOL DE ARGENTINA (ingredientes habituales argentinos).
Datos:
- Edad: ${parametros.edad}
- Sexo: ${parametros.sexo}
- Peso: ${parametros.peso} kg
- Altura: ${parametros.altura} cm
- Nivel de actividad: ${parametros.actividad}
- Objetivo: ${parametros.objetivo}

Formato OBLIGATORIO: responde solo JSON plano, sin texto extra, sin markdown.
{
  "dias": [
    {
      "dia": "Lunes",
      "comidas": [
        { "nombre": "Desayuno", "descripcion": "Avena con fruta", "calorias": 320 },
        { "nombre": "Almuerzo", "descripcion": "Pollo con arroz integral", "calorias": 550 },
        { "nombre": "Cena", "descripcion": "Sopa de verduras y pan integral", "calorias": 400 }
      ]
    }
  ]
}

Genera los 7 días completos, con 3-5 comidas por día. Usa ingredientes argentinos (ej: zapallo, pan lactal integral, queso crema, dulce de leche light, palta).`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Limpiar la respuesta de markdown y bloques de código
    text = text.trim();

    // Remover bloques de código markdown (```json ... ``` o ``` ... ```)
    text = text.replace(/```json\n?/g, "");
    text = text.replace(/```\n?/g, "");
    text = text.trim();

    console.log("[PlanIA] Respuesta limpia:", text.substring(0, 200) + "...");

    try {
      let parsed = JSON.parse(text);

      // Aceptar respuesta como array raíz
      if (Array.isArray(parsed)) {
        parsed = { dias: parsed };
      }

      if (
        !parsed ||
        !parsed.dias ||
        !Array.isArray(parsed.dias) ||
        !parsed.dias.length
      ) {
        throw new Error("Respuesta sin días válidos");
      }

      console.log(
        "[PlanIA] Plan generado exitosamente con",
        parsed.dias.length,
        "días"
      );
      return parsed;
    } catch (parseError) {
      console.error("[PlanIA] Error al parsear JSON:", parseError);
      console.error("[PlanIA] Texto recibido:", text.substring(0, 500));
      console.log("[PlanIA] Respuesta RAW completa:", text);
      return { dias: [] };
    }
  } catch (error) {
    console.error("[PlanIA] Error con Gemini:", error);
    return { dias: [] };
  }
}
