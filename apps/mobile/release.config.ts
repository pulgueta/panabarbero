import type { GlobalConfig } from "semantic-release";

export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
  repositoryUrl: "https://github.com/pulgueta/panabarbero",
  tagFormat: "v${version}",
} satisfies GlobalConfig;
