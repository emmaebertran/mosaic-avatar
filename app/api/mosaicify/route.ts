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

    // Step 1: describe the person using vision
    const visionRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: "text",
              text: "Describe this person's appearance in detail for an artist: hair color and length, eye color, skin tone, face shape, approximate age, and what they're wearing. Also describe the background. Be concise and factual.",
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const description = visionRes.choices[0].message.content ?? "";

    // Step 2: generate a mosaic portrait illustration from the description using DALL-E 3
    const imageRes = await openai.images.generate({
      model: "dall-e-3",
      prompt: `A beautiful mosaic tile portrait of a person: ${description}

Style: modern illustrated mosaic artwork. The face is drawn in a smooth, flattering, stylized illustration style — like a gorgeous animated movie character. Soft rounded features, glowing smooth skin, bright expressive eyes, beautiful flowing hair. The entire image is composed of small square ceramic mosaic tiles with thin white grout lines visible throughout. The background is simple warm neutral mosaic tiles. The overall result looks like stunning mosaic wall art — clearly an illustration, warm, beautiful, and flattering. NOT photorealistic.`,
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
    });

    const imageData = imageRes.data?.[0];

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
