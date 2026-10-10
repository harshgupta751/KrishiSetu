import { NextResponse } from "next/server";

function chunkTextToSize(text: string, maxLen: number = 490): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let chunk = text.slice(startIndex, startIndex + maxLen);
    
    // If we're not at the end, try to break at a space or newline
    if (startIndex + maxLen < text.length) {
      let lastSpace = chunk.lastIndexOf(' ');
      let lastNewline = chunk.lastIndexOf('\n');
      let breakIndex = Math.max(lastSpace, lastNewline);
      
      // If we found a space/newline in the last 100 characters, break there
      if (breakIndex > maxLen - 100 && breakIndex > 0) {
        chunk = chunk.slice(0, breakIndex);
        startIndex += breakIndex + 1; // +1 to skip the space/newline
      } else {
        // No good break point found, just hard break
        startIndex += maxLen;
      }
    } else {
      startIndex += maxLen;
    }
    
    chunks.push(chunk.trim());
  }
  
  return chunks.filter(c => c.length > 0);
}

export async function POST(request: Request) {
  try {
    const { text, targetLanguageCode = "hi-IN", speaker = "priya" } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for TTS" },
        { status: 400 }
      );
    }

    const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

    if (!SARVAM_API_KEY) {
      console.warn("SARVAM_API_KEY is not set. Returning a mock audio response is not fully supported, so we return a 501.");
      return NextResponse.json(
        { error: "SARVAM_API_KEY is missing. Cannot generate speech." },
        { status: 501 }
      );
    }

    const inputs = chunkTextToSize(text, 480);

    // Sarvam Text-to-Speech API
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: inputs,
        target_language_code: targetLanguageCode,
        speaker: speaker, // Example: "priya" or "rahul"
        pace: 1.0,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: "bulbul:v3" // Example model from Sarvam docs
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam TTS error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate speech from Sarvam AI" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Sarvam returns a base64 encoded string in `audios[0]`
    const audioBase64 = data.audios?.[0] || data.base64_audio;

    if (!audioBase64) {
       return NextResponse.json({ error: "No audio data received" }, { status: 500 });
    }

    return NextResponse.json({ audioBase64 });

  } catch (error) {
    console.error("TTS Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
