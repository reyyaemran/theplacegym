/**
 * AI provider using OpenAI.
 * Get your API key at https://platform.openai.com/api-keys
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type AIProvider = "openai";

export function getActiveProvider(): AIProvider | null {
  if (OPENAI_API_KEY) return "openai";
  return null;
}

export function getConfigError(): string | null {
  if (OPENAI_API_KEY) return null;
  return "No AI API key configured. Add OPENAI_API_KEY to .env.local and restart the server.";
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { responseFormat?: "json_object" }
): Promise<string> {
  const error = getConfigError();
  if (error) throw new Error(error);

  return generateWithOpenAI(systemPrompt, userPrompt, options);
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options?: { responseFormat?: "json_object" }
): Promise<string> {
  const key = OPENAI_API_KEY!;

  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  };
  if (options?.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
