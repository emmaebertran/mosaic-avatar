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
        "Transform this photo into a classical Roman/Byzantine mosaic artwork. Cover the entire image — subject and background — in small uniform square ceramic tiles with thin grout lines between them. Preserve the person's exact likeness, facial features, skin tone, hair color, and clothing colors. The tiles should sample the colors from the original photo without inventing new colors or adding decorative elements. Keep the background tiled with the same colors as the original background. No swirling patterns, no added objects — just a faithful tile rendering of the original photo.",
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
