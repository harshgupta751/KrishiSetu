/**
 * lib/crop-validator.ts
 * ──────────────────────────────────────────────────────────────
 * Lightweight LOCAL crop-image validator using TensorFlow.js +
 * MobileNet v1 (alpha=0.25) — runs 100% in-browser, no server
 * call, no API key needed.
 *
 * Model weights (~1 MB) are fetched from Google's TF Hub CDN on
 * first use and cached by the browser automatically.
 */

// ─── Plant / crop label whitelist ─────────────────────────────────────────────
const CROP_KEYWORDS: string[] = [
  "plant", "leaf", "leaves", "foliage", "vegetation", "grass", "weed",
  "herb", "fern", "moss", "algae", "seaweed", "cactus", "succulent",
  "flower", "petal", "blossom", "bloom", "pot", "vase",
  "daisy", "dandelion", "sunflower", "rose", "lotus", "orchid", "tulip",
  "lily", "marigold", "jasmine", "hibiscus", "bougainvillea",
  "corn", "maize", "wheat", "rice", "paddy", "barley", "sorghum",
  "cotton", "sugarcane", "jute", "flax",
  "tomato", "potato", "onion", "garlic", "carrot", "radish", "turnip",
  "cabbage", "cauliflower", "broccoli", "spinach", "lettuce", "kale",
  "pepper", "chili", "capsicum", "eggplant", "brinjal", "cucumber",
  "pumpkin", "gourd", "zucchini", "squash", "okra", "beans", "lentil",
  "pea", "chickpea", "soybean", "mustard", "peanut", "groundnut",
  "banana", "mango", "papaya", "guava", "coconut", "citrus", "lemon",
  "orange", "grapes", "strawberry", "apple", "pear", "peach",
  "fig", "pomegranate", "watermelon", "cantaloupe",
  "tree", "palm", "neem", "eucalyptus", "mulberry", "bamboo",
  "trunk", "bark", "branch", "twig",
  "soil", "dirt", "field", "farm", "garden", "greenhouse",
  "plantation", "orchard", "vineyard",
  "mold", "fungus", "blight", "rust", "mildew",
  "rapeseed", "artichoke", "cardoon", "mushroom", "agaric", "ear", "spike",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CropValidationResult {
  isCrop: boolean;
  confidence: number;
  topLabel: string;
  reason: string;
}

// ─── Model singleton ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPromise: Promise<any> | null = null;

async function getModel() {
  if (!modelPromise) {
    // Dynamic imports keep TF.js entirely out of the server bundle.
    const [, mobilenet] = await Promise.all([
      import("@tensorflow/tfjs"),
      import("@tensorflow-models/mobilenet"),
    ]);
    // version 1, alpha 0.25 → smallest/fastest variant (~1 MB weights)
    modelPromise = mobilenet.load({ version: 1, alpha: 0.25 });
  }
  return modelPromise;
}

/**
 * Fire-and-forget pre-warm — call as soon as an image is selected
 * so the model is loaded by the time the user clicks "Run Diagnostic Report".
 */
export function preloadModel(): void {
  if (typeof window === "undefined") return;
  getModel().catch(() => { modelPromise = null; });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isCropLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return CROP_KEYWORDS.some((kw) => lower.includes(kw));
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Validates whether the uploaded image shows a crop / plant.
 * Has a 15s timeout that fails open so the user is never permanently blocked.
 */
export async function validateCropImage(
  imageFile: File,
  topK = 10
): Promise<CropValidationResult> {

  if (typeof window === "undefined") {
    return { isCrop: true, confidence: 0, topLabel: "ssr", reason: "SSR — skipped." };
  }

  const FAIL_OPEN: CropValidationResult = {
    isCrop: true, confidence: 0, topLabel: "timeout",
    reason: "Validation timed out — proceeding with diagnosis.",
  };

  const work = async (): Promise<CropValidationResult> => {
    const [model, img] = await Promise.all([getModel(), loadImageElement(imageFile)]);

    const predictions: Array<{ className: string; probability: number }> =
      await model.classify(img, topK);

    let bestScore = 0;
    let bestLabel = "";
    for (const p of predictions) {
      if (isCropLabel(p.className) && p.probability > bestScore) {
        bestScore = p.probability;
        bestLabel = p.className;
      }
    }

    const top1 = predictions[0] ?? { className: "unknown", probability: 0 };
    const isCrop = bestScore >= 0.015; // 1.5% threshold — intentionally low

    return {
      isCrop,
      confidence: bestScore,
      topLabel: bestLabel || top1.className,
      reason: isCrop
        ? `Crop detected: "${bestLabel}" (${(bestScore * 100).toFixed(1)}%)`
        : `Not a crop — top prediction: "${top1.className}" (${(top1.probability * 100).toFixed(1)}%)`,
    };
  };

  const timeout = new Promise<CropValidationResult>((res) =>
    setTimeout(() => res(FAIL_OPEN), 15_000)
  );

  try {
    return await Promise.race([work(), timeout]);
  } catch (err: unknown) {
    console.error("[crop-validator]", err);
    return { isCrop: true, confidence: 0, topLabel: "error", reason: "Validation error — proceeding." };
  }
}
