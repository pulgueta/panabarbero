import type { UserConfig } from "@commitlint/types";
import { RuleConfigSeverity } from "@commitlint/types";

export default {
  extends: ["@commitlint/config-conventional"],
  parserPreset: "conventional-changelog-atom",
  formatter: "@commitlint/format",
  rules: {
    "type-enum": [
      RuleConfigSeverity.Warning,
      "always",
      ["feat", "fix", "refactor", "docs", "style", "chore", "ci"],
    ],
    "scope-enum": [
      RuleConfigSeverity.Warning,
      "always",
      ["app", "api", "ci", "docs", "deps", "repo"],
    ],
  },
} satisfies UserConfig;
