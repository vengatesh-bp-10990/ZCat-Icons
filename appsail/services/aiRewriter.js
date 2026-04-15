const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Groq = require("groq-sdk");

const SYSTEM_PROMPT = `You are an SVG icon converter. Convert any SVG icon into a clean stroke-based outline style.

CONVERSION RULES:
1. Convert to stroke-based outlines:
   - Replace filled shapes with their outline strokes
   - For filled paths, keep the same path data but change to stroke rendering
   - Remove fill="currentColor" or fill="<color>" from shapes, set fill="none" instead
   - Add stroke attributes to every visible shape element

2. Output SVG requirements:
   - <svg> root: width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
   - Every shape: stroke="#343C54" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"
   - Remove: classes, IDs, style attributes, data-* attributes, clip-rule, fill-rule
   - Remove: <defs>, <clipPath>, <mask>, <style> elements
   - Keep the SAME path data — do NOT modify coordinates or path commands
   - Keep the SAME visual shape — only change rendering attributes

3. Do NOT rescale coordinates. Do NOT modify path d="" values. Only change attributes.
4. If already stroke-based, just clean up attributes.

OUTPUT: Raw SVG code only. No explanation, no markdown, no backticks, no thinking tags.`;

const USER_PROMPT_TEMPLATE = `Convert this SVG icon to stroke-based outline style. Keep ALL path data exactly the same — only change fill/stroke attributes. Do not modify any coordinates.

INPUT SVG:
{SVG_INPUT}

Output the converted SVG:`;



/**
 * Rewrite an SVG icon using AI (Gemini primary, OpenAI fallback).
 * Returns the rewritten SVG string.
 */
async function rewriteSvgWithAI(svgInput) {
  const userPrompt = USER_PROMPT_TEMPLATE.replace("{SVG_INPUT}", svgInput);

  // Try Groq first (fast, generous free tier)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("[AI Rewriter] Trying Groq...");
      const result = await callGroq(userPrompt);
      if (result && isValidSvg(result)) {
        console.log("[AI Rewriter] Groq succeeded");
        return enforceStyle(result, svgInput);
      }
      console.log("[AI Rewriter] Groq returned invalid SVG, trying fallback...");
    } catch (err) {
      console.log(`[AI Rewriter] Groq failed: ${err.message}, trying fallback...`);
    }
  }

  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log("[AI Rewriter] Trying Gemini...");
      const result = await callGemini(userPrompt);
      if (result && isValidSvg(result)) {
        console.log("[AI Rewriter] Gemini succeeded");
        return enforceStyle(result, svgInput);
      }
      console.log("[AI Rewriter] Gemini returned invalid SVG, trying fallback...");
    } catch (err) {
      console.log(`[AI Rewriter] Gemini failed: ${err.message}, trying fallback...`);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log("[AI Rewriter] Trying OpenAI...");
      const result = await callOpenAI(userPrompt);
      if (result && isValidSvg(result)) {
        console.log("[AI Rewriter] OpenAI succeeded");
        return enforceStyle(result, svgInput);
      }
      console.log("[AI Rewriter] OpenAI returned invalid SVG");
    } catch (err) {
      console.log(`[AI Rewriter] OpenAI failed: ${err.message}`);
    }
  }

  throw new Error("AI rewrite failed: all providers failed or returned invalid SVG");
}

/**
 * Call Groq API (fast inference, generous free tier)
 */
async function callGroq(userPrompt) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content || "";
  return extractSvg(text);
}

/**
 * Call Google Gemini API
 */
async function callGemini(userPrompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  return extractSvg(text);
}

/**
 * Call OpenAI API
 */
async function callOpenAI(userPrompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content || "";
  return extractSvg(text);
}

/**
 * Extract SVG from AI response (may contain markdown/backticks/extra text)
 */
function extractSvg(text) {
  // Strip <think>...</think> blocks (Qwen/reasoning models)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Try to find SVG tag in the response
  const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0].trim();
  }
  // If the whole text looks like SVG
  const trimmed = text.trim();
  if (trimmed.startsWith("<svg") && trimmed.endsWith("</svg>")) {
    return trimmed;
  }
  return null;
}

/**
 * Basic SVG validation
 */
function isValidSvg(svg) {
  if (!svg) return false;
  if (!svg.includes("<svg")) return false;
  if (!svg.includes("</svg>")) return false;
  if (!svg.includes("<path") && !svg.includes("<circle") && !svg.includes("<rect") && !svg.includes("<line") && !svg.includes("<polyline") && !svg.includes("<polygon")) return false;
  if (!svg.includes("viewBox")) return false;
  return true;
}

/**
 * Post-process AI output to enforce our style attributes and scale to 24x24
 */
function enforceStyle(svg, originalSvg) {
  // Extract original viewBox to detect if icon needs rescaling
  const origVB = originalSvg?.match(/viewBox="([^"]*)"/);
  const origParts = origVB ? origVB[1].split(/\s+/).map(Number) : null;

  // Ensure viewBox is 0 0 24 24
  svg = svg.replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
  // Ensure width/height 24
  svg = svg.replace(/ width="[^"]*"/g, "").replace(/ height="[^"]*"/g, "");
  svg = svg.replace(/<svg/, '<svg width="24" height="24"');
  // Ensure fill="none" on root
  if (!/fill="none"/.test(svg.split(">")[0])) {
    svg = svg.replace(/<svg([^>]*)>/, '<svg$1 fill="none">');
  }
  // Ensure xmlns
  if (!svg.includes("xmlns")) {
    svg = svg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // If original viewBox was smaller than 24x24, wrap content in <g transform> to scale up
  if (origParts && origParts.length === 4) {
    const [ox, oy, ow, oh] = origParts;
    const maxDim = Math.max(ow, oh);
    if (maxDim > 0 && maxDim < 22) {
      // Scale to fit 24x24 with 2px padding
      const targetSize = 20; // 24 - 2*2
      const scale = targetSize / maxDim;
      const offsetX = (24 - ow * scale) / 2 - ox * scale;
      const offsetY = (24 - oh * scale) / 2 - oy * scale;
      // Wrap all content inside <svg> in a <g> with transform
      svg = svg.replace(
        /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/,
        `$1<g transform="translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">$2</g>$3`
      );
    }
  }

  return svg;
}

/**
 * Use AI to suggest name, tags, and category for an SVG icon.
 * Returns { name, tags, category }
 */
async function suggestMetadata(svgInput, existingCategories = [], filename = "") {
  const catList = existingCategories.length
    ? `\nExisting categories: ${existingCategories.join(", ")}`
    : "";

  const filenameHint = filename
    ? `\nOriginal filename: "${filename}" (use this as a strong hint for the name)`
    : "";

  const prompt = `Analyze this SVG icon and suggest metadata for it.${catList}${filenameHint}

SVG:
${svgInput}

Respond in STRICT JSON only (no markdown, no backticks, no explanation):
{"name": "kebab-case-name", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"], "category": "Best Category Name"}

Rules:
- name: short kebab-case derived from the filename if provided, otherwise infer from the icon shape
- tags: 4-6 relevant search terms (lowercase)
- category: pick from existing categories if one fits, otherwise suggest a new one
- JSON only, nothing else`;

  async function callForJSON(callFn) {
    const text = await callFn(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.name && parsed.tags && parsed.category) return parsed;
    } catch {}
    return null;
  }

  // Groq wrapper that returns raw text
  async function groqText(p) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const r = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: p }],
      temperature: 0.2,
      max_tokens: 300,
    });
    return r.choices[0]?.message?.content || "";
  }

  async function geminiText(p) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(p);
    return result.response.text();
  }

  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push(["Groq", groqText]);
  if (process.env.GEMINI_API_KEY) providers.push(["Gemini", geminiText]);

  for (const [name, fn] of providers) {
    try {
      console.log(`[AI Metadata] Trying ${name}...`);
      const result = await callForJSON(fn);
      if (result) {
        console.log(`[AI Metadata] ${name} succeeded`);
        return result;
      }
    } catch (err) {
      console.log(`[AI Metadata] ${name} failed: ${err.message}`);
    }
  }

  return null;
}

module.exports = { rewriteSvgWithAI, suggestMetadata };
