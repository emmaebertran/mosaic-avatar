import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageFile = await toFile(buffer, "photo.png", { type: "image/png" });

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: `Transform this photo into a stunning mosaic portrait artwork. Use small fine mosaic tesserae tiles with thin white grout lines. The face must look stylized and illustrated — not photorealistic. Think of it like a beautiful painted portrait made of tiles: soft simplified features, smooth flawless skin, slightly larger expressive eyes, elegant simplified nose and lips. Flattering and idealized, like a gorgeous illustration. Beautiful flowing hair with rich color. Replace the background with soft abstract wavy shapes in muted sage green, dusty blue, and warm cream tones, all in mosaic tiles. The result should look like premium mosaic wall art — artistic and illustrated, not a photograph.`,
      size: "1024x1024",
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    if (imageData.b64_json) {
      return NextResponse.json({ b64: imageData.b64_json });
    }
    return NextResponse.json({ url: imageData.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Mosaicify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
