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

    // Step 2: generate a mosaic portrait illustration from the description
    const imageRes = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `Create a gorgeous mosaic tile portrait illustration of a person with these features: ${description}

Style: beautiful stylized mosaic artwork made of small uniform square ceramic tiles with thin grout lines. The face should look idealized, smooth, and flattering — like a stunning animated film character (think Disney/Pixar quality) rendered in mosaic tiles. Clean elegant facial features, glowing smooth skin, expressive eyes, beautiful flowing hair. Keep the same colors as described. The background should be tiled to match the original background color but rendered as mosaic. The overall image should look like premium mosaic wall art — artistic, beautiful, and clearly illustrated rather than photorealistic.`,
      size: "1024x1024",
      quality: "high",
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
