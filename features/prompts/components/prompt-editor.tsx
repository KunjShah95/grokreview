"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FloppyDisk, ArrowCounterClockwise, MagicWand } from "@phosphor-icons/react";
import { PROMPT_TEMPLATES, PROMPT_TEMPLATE_OPTIONS, type PromptTemplateId } from "@/features/prompts/types";

type PromptEditorProps = {
  repoFullName: string;
  initialPrompt?: string;
  onSave?: (prompt: string) => void;
};

export function PromptEditor({ repoFullName, initialPrompt, onSave }: PromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || PROMPT_TEMPLATES.default);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplateId>("default");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Apply a template
  const applyTemplate = useCallback((templateId: PromptTemplateId) => {
    setSelectedTemplate(templateId);
    setPrompt(PROMPT_TEMPLATES[templateId]);
    setSaved(false);
  }, []);

  // Save the prompt (stored in localStorage for now)
  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`grokreview-prompt-${repoFullName}`, prompt);
      setSaved(true);
      onSave?.(prompt);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  };

  // Load saved prompt on mount
  useEffect(() => {
    if (initialPrompt) return;
    try {
      const saved = localStorage.getItem(`grokreview-prompt-${repoFullName}`);
      if (saved) {
        setPrompt(saved);
      }
    } catch {
      // localStorage not available
    }
  }, [repoFullName, initialPrompt]);

  return (
    <div className="space-y-6">
      {/* Template Quick Select */}
      <div className="flex flex-wrap gap-2">
        {PROMPT_TEMPLATE_OPTIONS.map((template) => (
          <Button
            key={template.id}
            variant={selectedTemplate === template.id ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => applyTemplate(template.id)}
          >
            <MagicWand className="size-3" />
            {template.label}
          </Button>
        ))}
      </div>

      {/* Prompt Editor */}
      <div className="rounded-none border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              System Prompt for <code className="text-xs">{repoFullName}</code>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {prompt.length} characters
            </span>
          </div>
        </div>
        <textarea
          className="w-full min-h-[300px] bg-background p-4 text-xs leading-relaxed font-mono resize-y focus:outline-none"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setSaved(false);
            setSelectedTemplate("default");
          }}
          placeholder="Enter your custom review prompt..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Spinner className="size-3" />
            ) : (
              <FloppyDisk className="size-3" />
            )}
            {saved ? "Saved!" : "Save Prompt"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => applyTemplate("default")}
          >
            <ArrowCounterClockwise className="size-3" />
            Reset to Default
          </Button>
        </div>
        {saved && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Prompt saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
