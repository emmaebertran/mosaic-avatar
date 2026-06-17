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
      prompt: `Transform this into a stunning mosaic portrait artwork with these specific characteristics:

TILES: Very fine, small, irregular organic tesserae — like crackle glaze or stained glass fragments, not chunky square grid tiles. Thin white grout lines between each piece. The tiles should follow the contours of the face and hair in flowing curved lines.

FACE: Beautifully idealized and flattering. Smooth perfect skin like polished ceramic — no pores, no texture, no imperfections. Soft elegant features. Keep the person's hair color, eye color, lip color and general likeness but make them look their most beautiful, glowing version. Eyes bright and expressive.

BACKGROUND: Completely replace the original background with a beautiful abstract design made of soft wavy flowing shapes in muted complementary tones — think soft sage green, dusty blue, warm cream, and sandy beige flowing together in gentle curves. All rendered in the same fine mosaic tesserae.

OVERALL: Should look exactly like a high-end mosaic portrait mural — artistic, gorgeous, and clearly a work of art. Warm and flattering lighting on the face.`,
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
