import { NextResponse } from "next/server";

/**
 * Speech-to-Text via Sarvam AI.
 * Uses /speech-to-text (saarika:v2.5) which transcribes audio in the SAME
 * language that was spoken — driven by `language_code` (BCP-47) sent from the
 * client based on the selected chat language. "unknown" lets Sarvam auto-detect.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const languageCode = (formData.get("language_code") as string) || "unknown";

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

    if (!SARVAM_API_KEY) {
      console.warn("SARVAM_API_KEY is not set. Using mock STT response.");
      return NextResponse.json({
        transcript: "Hello, this is a mock transcription because the Sarvam API key is not set.",
        languageCode,
      });
    }

    const sarvamFormData = new FormData();
    sarvamFormData.append("file", file, "recording.wav");
    sarvamFormData.append("model", "saarika:v2.5");
    // Transcribe in the spoken/selected language (not translated to English).
    sarvamFormData.append("language_code", languageCode);

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": SARVAM_API_KEY },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam STT error:", errorText);
      return NextResponse.json(
        { error: "Failed to transcribe audio from Sarvam AI" },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      transcript: data.transcript || data.text || "",
      languageCode: data.language_code || languageCode,
    });
  } catch (error) {
    console.error("STT Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
