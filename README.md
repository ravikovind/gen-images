# Gemini Image Generator

Generate stunning images from text prompts using Google's Gemini AI.

## Features

- Generate images from text descriptions
- Automatic timestamped file naming
- Command-line interface for easy use
- TypeScript for type safety
- Environment-based API key management

## Prerequisites

- Node.js (v18 or higher recommended)
- A Google AI API key

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up API Key

Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
GOOGLE_API_KEY=your_actual_api_key_here
```

### 3. Build the Project

```bash
npm run build
```

## Usage

### Basic Usage

Generate an image with a custom prompt:

```bash
npm run generate -- "Your image prompt here"
```

### Examples

```bash
# Futuristic scene
npm run generate -- "A futuristic city at sunset with flying cars"

# Nature scene
npm run generate -- "A serene mountain lake with autumn colors"

# Abstract art
npm run generate -- "Abstract geometric patterns in vibrant colors"

# Character design
npm run generate -- "A friendly robot character in pixel art style"

# Food photography
npm run generate -- "A gourmet dessert on a marble counter"
```

### Default Prompt

Run without arguments to use the default prompt:

```bash
npm run generate
```

## Output

- Generated images are saved in the `output/` directory
- Files are automatically named with timestamps: `image-YYYY-MM-DDTHH-MM-SS.png`
- Each generation creates a new file, so previous images won't be overwritten

## Project Structure

```
gen-image/
├── src/
│   └── index.ts          # Main application code
├── dist/                 # Compiled JavaScript (generated)
├── output/              # Generated images (created automatically)
├── .env                 # Your API key (not committed to git)
├── .env.example         # Template for .env file
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled application
- `npm run dev` - Build and run in one command
- `npm run generate` - Alias for dev (main command to use)

## Tips for Better Results

1. **Be Specific**: Include details about style, lighting, mood, and composition
2. **Art Styles**: Mention styles like "photorealistic", "watercolor", "digital art", "minimalist"
3. **Lighting**: Specify lighting like "golden hour", "dramatic lighting", "soft ambient light"
4. **Mood**: Include mood descriptors like "peaceful", "energetic", "mysterious"

## Troubleshooting

### "GOOGLE_API_KEY environment variable is not set"

Make sure you've created a `.env` file with your API key.

### "No image generated"

Try rephrasing your prompt or make it more descriptive.

### Dependencies not found

Run `npm install` to install all required packages.

## License

MIT
