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
        "Transform this photo into a beautiful, vibrant mosaic portrait artwork made of small colorful ceramic tiles with thin white grout lines. Style it like a modern artistic mosaic illustration — slightly painterly and stylized, warm and flattering, with smooth graceful tile patterns that follow the contours of the face and hair. The person should look charming and beautiful, like a mosaic mural you'd find in a fancy hotel lobby. Preserve their hair color, skin tone, eye color, and clothing. Make the background a complementary solid or softly patterned mosaic color that contrasts nicely with the subject. The overall feel should be vibrant, artistic, and gorgeous — not photorealistic or uncanny.",
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
