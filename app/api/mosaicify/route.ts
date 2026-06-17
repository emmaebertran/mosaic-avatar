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
        "Convert this photo into a mosaic tile portrait using the exact same colors as the original photo — same hair color, skin tone, background colors, and clothing. Keep all the original colors faithful. But render the person's face in a smooth, idealized, beautified way — like a flattering illustration or Disney/Pixar character. Soften and simplify the facial features into clean elegant shapes, make the skin smooth and glowing with no imperfections, make the eyes slightly larger and more expressive, and make the hair flow in beautiful simplified strands. The result should feel like a gorgeous idealized mosaic portrait — same colors as real life, but the person looks their most beautiful and stylized version of themselves. Cover everything in small uniform square mosaic tiles with thin grout lines.",
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
