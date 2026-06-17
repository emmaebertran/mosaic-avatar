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
      prompt:
        "Reimagine this photo as a stunning, colorful mosaic portrait in the style of a high-end illustrated mosaic artwork. Use a bright, vibrant color palette — rich jewel tones, warm golds, vivid teals, deep blues — made of small uniform square tiles with clean white grout lines. The face should be beautifully stylized and flattering, like a gorgeous graphic novel or animated film character rendered in mosaic tiles. Smooth out all skin imperfections, make the eyes pop, and give the hair rich flowing color. The background should be a completely different complementary color (like deep teal, cobalt blue, or warm terracotta) with elegant swirling or geometric mosaic patterns — totally unlike the original background. Make this look like premium mosaic wall art that belongs in a luxury hotel. It should look clearly artistic and illustrated, not photorealistic.",
      size: "1024x1024",
      quality: "high",
    });

    const imageData = response.data?.[0];

    if (!imageData) {
      return NextResponse.json({ error: "No image returned from OpenAI" }, { status: 500 });
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
