-- Migration: add_model_to_pull_request
-- Description: Add the `model` column to track which AI model was used for each review.
-- This enables model usage analytics on the dashboard and CLI.

ALTER TABLE "pull_request" ADD COLUMN "model" TEXT;
