import { createHuggingFace } from '@ai-sdk/huggingface';

const huggingface = createHuggingFace({
  apiKey: process.env.HUGGINGFACE_API_KEY!,
});

export function getHuggingFaceModel(modelId: string) {
  return huggingface(modelId);
}
