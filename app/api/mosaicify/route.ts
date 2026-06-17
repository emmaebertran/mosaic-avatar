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

    // Step 1: just beautify the face — NO tile effect, we do that in the browser
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: `Beautifully retouch and idealize this portrait photo. Make the person look their most gorgeous, flattering version of themselves: perfectly smooth glowing skin with zero imperfections, soft elegant facial features, bright beautiful eyes, lustrous hair. Keep the same hair color, eye color, skin tone, and general likeness. Replace the background with soft abstract wavy shapes in muted complementary tones — sage green, dusty blue, warm cream, sandy beige — like a beautiful painted backdrop. The result should look like a stunning, flattering, idealized portrait painting. Do NOT add any tile or mosaic effect — just make it beautiful.`,
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
