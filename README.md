# Spanish Slang Model Comparison

This is a Next.js web application designed to evaluate and compare the capabilities of different Large Language Models (LLMs) in analyzing and explaining Spanish regional slang and variants (Regional Variants). 

Currently, the project compares:
- **Gemini 3.1 Pro**
- **DeepSeek v4 Pro**

## Overview

The application provides a sleek, modern UI where users can input a list of Spanish sentences containing specific local slang, business jargon, or informal expressions. It also allows users to customize the system prompt sent to the LLMs. 

The models are tasked with acting as expert Spanish applied linguists. For each sentence, they must:
1. Identify the specific country where the slang is most commonly used.
2. Provide an accurate explanation of its local meaning.
3. Return the results in a strict JSON format (`{"predicted_country": "...", "explanation": "..."}`).

## Features

- **Side-by-Side Model Evaluation:** Concurrently sends requests to both Gemini and DeepSeek to compare their performance and accuracy in real-time.
- **Customizable Prompts:** Easily tweak the system prompt directly from the UI to test different instructions or constraints (e.g., forbidding over-correction of local dialects).
- **JSON Export:** Download the generated comparison results as a structured JSON file for further analysis.
- **Modern UI:** Built with Tailwind CSS, featuring a responsive, dark-mode-first aesthetic with smooth gradients and animations.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/)
- **UI & Styling:** React 19, Tailwind CSS v4
- **API Integration:** OpenAI Node SDK (used as a unified client for both DeepSeek API and Gemini API via compatible endpoints)

## Getting Started

### Prerequisites

You will need API keys for both Gemini and DeepSeek.

### Environment Setup

Create a `.env.local` file in the root directory and add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### Installation & Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Usage

1. **Customize the Prompt:** Modify the System Prompt on the left side of the screen if needed. The default prompt enforces strict rules on linguistic analysis and JSON formatting.
2. **Enter Sentences:** Type or paste your Spanish sentences in the input box, with one sentence per line.
3. **Generate:** Click "Generate Results" to trigger the API calls.
4. **Download:** Once processing is complete, download the resulting `.json` file to compare how each model analyzed the slang.
