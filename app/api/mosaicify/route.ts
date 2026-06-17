import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
              detail: "high" as const,
            },
            {
              type: "input_text",
              text: `Transform this photo into a beautiful mosaic portrait artwork. Use fine irregular mosaic tesserae (crackle-style tiles, not chunky squares) with thin white grout lines. The person's face should look idealized, smooth, and flattering — glowing skin, soft elegant features, bright eyes. Replace the background with a beautiful abstract design of soft wavy flowing shapes in muted complementary colors (sage, dusty blue, warm cream, sandy beige). The result should look exactly like a gorgeous high-end mosaic mural portrait.`,
            },
          ],
        },
      ],
      tools: [{ type: "image_generation" as const }],
    });

    const imageBlock = response.output?.find(
      (block: { type: string }) => block.type === "image_generation_call"
    ) as { type: string; result?: string } | undefined;

    if (!imageBlock?.result) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    return NextResponse.json({ b64: imageBlock.result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Mosaicify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
