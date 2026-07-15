"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { AVAILABLE_MODELS, type AIProvider, isOllamaRunning, detectOllamaModels } from "@/features/ai";

const PROVIDER_META: Record<AIProvider, { label: string; docs: string; keyName: string }> = {
  openrouter: { label: "OpenRouter", docs: "openrouter.ai/keys", keyName: "OPENROUTER_API_KEY" },
  groq: { label: "Groq", docs: "console.groq.com/keys", keyName: "GROQ_API_KEY" },
  mistral: { label: "Mistral AI", docs: "console.mistral.ai/api-keys", keyName: "MISTRAL_API_KEY" },
  huggingface: { label: "HuggingFace", docs: "huggingface.co/settings/tokens", keyName: "HUGGINGFACE_API_KEY" },
  gemini: { label: "Gemini", docs: "aistudio.google.com/apikey", keyName: "GEMINI_API_KEY" },
  ollama: { label: "Ollama (Local)", docs: "ollama.com/download", keyName: "" },
};

export function ModelSettings() {
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);

  const checkOllama = async () => {
    setCheckingOllama(true);
    try {
      const [running, models] = await Promise.all([
        isOllamaRunning(),
        detectOllamaModels(),
      ]);
      setOllamaRunning(running);
      setOllamaModels(models);
    } catch {
      setOllamaRunning(false);
      setOllamaModels([]);
    } finally {
      setCheckingOllama(false);
    }
  };

  useEffect(() => {
    checkOllama();
  }, []);

  // Group models by provider
  const providersMap = new Map<AIProvider, Array<{ modelId: string; label: string; isFree: boolean }>>();
  for (const model of AVAILABLE_MODELS) {
    if (!providersMap.has(model.provider)) {
      providersMap.set(model.provider, []);
    }
    providersMap.get(model.provider)!.push({
      modelId: model.modelId,
      label: model.label,
      isFree: model.isFree,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Models</CardTitle>
        <CardDescription>
          Choose your AI provider for code reviews. Set the corresponding API key
          in your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file.
          Free models work great for PR reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Provider Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from(providersMap.entries()).map(([provider, models]) => {
            const meta = PROVIDER_META[provider];
            const isOllamaProvider = provider === "ollama";

            // Ollama dynamic status
            const ollamaStatus = isOllamaProvider
              ? ollamaRunning ? "secondary" as const
                : ollamaRunning === false ? "secondary" as const
                : "outline" as const
              : "secondary" as const;
            const ollamaLabel = isOllamaProvider
              ? ollamaRunning ? "Running" : ollamaRunning === false ? "Not detected" : "Checking..."
              : "Requires API key";

            // Show only detected Ollama models if running
            const displayModels = isOllamaProvider
              ? models.filter(m => ollamaModels.some(o => o.startsWith(m.modelId)))
              : models;

            return (
              <div
                key={provider}
                className="rounded-xl border border-border p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{meta.label}</h3>
                    {isOllamaProvider && (
                      <div className="flex items-center gap-2 mt-1">
                        {checkingOllama ? (
                          <Spinner className="size-3" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={checkOllama}
                          >
                            Refresh
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge variant={isOllamaProvider ? ollamaStatus : "secondary"}>
                    {isOllamaProvider ? ollamaLabel : `Set ${meta.keyName}`}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-1">
                  {displayModels.length > 0 ? displayModels.slice(0, 5).map((model) => (
                    <div key={model.modelId} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[220px]">
                        {model.label}
                      </span>
                      {model.isFree && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-none">
                          FREE
                        </Badge>
                      )}
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">
                      {isOllamaProvider
                        ? (ollamaRunning === false ? "Ollama not running. Install & start Ollama first." : "Pull models with: ollama pull llama3.2")
                        : `Set ${meta.keyName} in .env`}
                    </p>
                  )}
                  {displayModels.length > 5 && (
                    <p className="text-[10px] text-muted-foreground pt-1">
                      +{displayModels.length - 5} more models
                    </p>
                  )}
                </div>

                {/* Provider link */}
                <a
                  href={`https://${meta.docs}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {isOllamaProvider ? "Download Ollama →" : `Get API key →`}
                </a>
              </div>
            );
          })}
        </div>

        {/* Ollama Quick Start */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-2">📍 Ollama Quick Start</h4>
          <pre className="text-xs text-muted-foreground bg-muted p-3 overflow-x-auto">
            {`# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a code review model
ollama pull llama3.2

# Verify it's running
curl http://localhost:11434/api/version

# Start the dev server
npm run dev`}
          </pre>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          The AI system will auto-detect which providers are configured and use the first available one.
          Priority order: Groq → Mistral → HuggingFace → Gemini → OpenRouter → Ollama.
        </p>
      </CardFooter>
    </Card>
  );
}
