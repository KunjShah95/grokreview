import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export function getGroqModel(modelId: string) {
  return groq(modelId);
}
