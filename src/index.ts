import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "dotenv";

// Load environment variables
config();

interface MenuItem {
  name: string;
  price: number;
  tags: string[];
}

interface Category {
  Items: MenuItem[];
}

interface MenuData {
  [category: string]: Category;
}

interface GenerateImageOptions {
  prompt: string;
  outputPath: string;
  model?: string;
}

const PROMPT_TEMPLATE = `[Subject: {service_name}]
[Composition: clean 1:1 square composition showing the service or treatment visually — realistic, professional, and minimal]
[Environment: studio setup with pure white seamless background, no clutter, no text]
[Lighting: bright soft daylight or diffused softbox light, evenly illuminating the subject with natural soft shadows for realism]
[Elements: realistic representation of the service — specific visual elements that define this item]
[Style: ultra-realistic, natural color tones, smooth lighting gradients, appropriate aesthetic for the category]
[Focus: subject sharp, soft natural drop shadow under props for realism]
[UI/UX Optimization: clean framing, minimal distractions, balanced contrast for eCommerce or app grid layout]
[Mood: appropriate mood for the category and item]
[Format: 1:1 square aspect ratio, high-resolution, white background, optimized for app grid layout]`;

// Prompt cache to avoid regenerating same prompts
const promptCache: Map<string, string> = new Map();

function formatFileName(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/\//g, "-")
    .replace(/&/g, "-")
    .replace(/\(/g, "-")
    .replace(/\)/g, "-")
    .replace(/[^\w\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getCacheKey(itemName: string, category: string): string {
  return `${category}::${itemName}`;
}

async function generatePromptWithGPT(
  item: MenuItem,
  category: string
): Promise<string> {
  const cacheKey = getCacheKey(item.name, category);

  // Return cached prompt if exists
  if (promptCache.has(cacheKey)) {
    console.log(`      📋 Using cached prompt`);
    return promptCache.get(cacheKey)!;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`      🤖 Generating prompt with ChatGPT...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are a professional product photography prompt engineer for image generation AI.

Given:
- Category: "${category}"
- Item Name: "${item.name}"
- Tags: ${item.tags.join(", ")}
- Price: ${item.price}

Generate a detailed image generation prompt using this exact structure and filling in each section:

${PROMPT_TEMPLATE}

Rules:
1. Replace {service_name} with the actual item name
2. Fill each section with specific, actionable details for "${item.name}"
3. Make it realistic and professional
4. Keep sections concise but detailed
5. ONLY output the structured prompt with no additional text

Generate the prompt now:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const generatedPrompt = response.choices[0].message.content || "";

    if (!generatedPrompt) {
      throw new Error("Empty prompt generated from ChatGPT");
    }

    // Cache the prompt
    promptCache.set(cacheKey, generatedPrompt);

    return generatedPrompt;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`      ✗ Error generating prompt with ChatGPT: ${error.message}`);
    } else {
      console.error(`      ✗ Unknown error generating prompt:`, error);
    }
    throw error;
  }
}

async function generateImage(options: GenerateImageOptions): Promise<void> {
  const {
    prompt,
    outputPath,
    model = "gemini-2.5-flash-image",
  } = options;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GOOGLE_API_KEY environment variable is not set. Please create a .env file with your API key."
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log(`      🎨 Generating image with Gemini...`);

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image generated. Please try a different prompt.");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error("Invalid response structure from Gemini API.");
    }

    let imageSaved = false;
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`      ✓ Saved: ${path.basename(outputPath)}`);
        imageSaved = true;
        break;
      }
    }

    if (!imageSaved) {
      throw new Error("No image data found in response");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `      ✗ Error generating image: ${error.message}`
      );
    } else {
      console.error(`      ✗ Unknown error generating image:`, error);
    }
    throw error;
  }
}

async function main() {
  try {
    // Validate API keys
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY environment variable is not set. Please create a .env file with your API key.");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set. Please create a .env file with your API key.");
    }

    const inputDir = path.join(process.cwd(), "input");
    if (!fs.existsSync(inputDir)) {
      throw new Error(`input directory not found at ${inputDir}`);
    }

    // Get all JSON files from input directory
    const files = fs.readdirSync(inputDir).filter((file) => file.endsWith(".json"));

    if (files.length === 0) {
      throw new Error(`No JSON files found in ${inputDir}`);
    }

    console.log("\n🚀 Image Generation Pipeline Started");
    console.log("=".repeat(60));
    console.log("Stage 1: ChatGPT Prompt Generation");
    console.log("Stage 2: Gemini Image Generation");
    console.log("=".repeat(60) + "\n");

    const outputBaseDir = path.join(process.cwd(), "output");
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // Process each segment file
    for (const file of files) {
      const segment = file.replace(/\.json$/, "").toLowerCase();
      const inputPath = path.join(inputDir, file);

      console.log(`\n📂 Segment: ${segment}`);
      console.log(`   File: ${file}\n`);

      const inputData = fs.readFileSync(inputPath, "utf-8");
      const menuData: MenuData = JSON.parse(inputData);

      for (const [categoryName, category] of Object.entries(menuData)) {
        console.log(`\n📁 Category: ${categoryName}`);
        console.log(`   Items: ${category.Items.length}\n`);

        const formattedCategory = formatFileName(categoryName);

        for (const item of category.Items) {
          const fileName = `${formatFileName(item.name)}.png`;
          const categoryDir = path.join(outputBaseDir, segment, formattedCategory);
          const outputPath = path.join(categoryDir, fileName);

          console.log(`   📷 Processing: ${item.name}`);

          if (fs.existsSync(outputPath)) {
            console.log(`      ⏭ Skipping (already exists)`);
            totalSkipped++;
            continue;
          }

          try {
            // Stage 1: Generate prompt with ChatGPT
            const prompt = await generatePromptWithGPT(item, categoryName);

            // Stage 2: Generate image with Gemini
            await generateImage({
              prompt,
              outputPath,
            });

            totalProcessed++;

            // Rate limiting: 1 second between requests
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(
              `      ✗ Failed to process ${item.name}`
            );
            totalFailed++;
            // Continue with next item
          }
        }
      }
    }

    // Save prompt cache for reference
    const cacheOutputPath = path.join(process.cwd(), "prompts-cache.json");
    const cacheData: Record<string, string> = {};
    promptCache.forEach((value, key) => {
      cacheData[key] = value;
    });
    fs.writeFileSync(cacheOutputPath, JSON.stringify(cacheData, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("✅ Batch Complete!");
    console.log(`   Generated: ${totalProcessed}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Total: ${totalProcessed + totalSkipped + totalFailed}`);
    console.log("\n📂 Output directory: output/");
    console.log("📋 Prompt cache saved: prompts-cache.json");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Fatal Error:", error.message);
    } else {
      console.error("❌ An unknown error occurred:", error);
    }
    process.exit(1);
  }
}

main();