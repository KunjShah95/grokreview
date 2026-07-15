export type TestFramework = "vitest" | "jest" | "pytest" | "go-test" | "junit" | "rspec";

export type GeneratedTestInput = {
  filePath: string;
  testFilePath: string;
  framework: TestFramework;
  content: string;
};
