import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("guarded MCP deployment", () => {
  it("publishes a verified GitHub version without mutating established routes", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const source = readFileSync("scripts/deploy.mjs", "utf8");

    expect(packageJson.scripts.deploy).toBe("node scripts/deploy.mjs");
    expect(source).toContain('run("npm", ["run", "verify:deploy-source"])');
    expect(source).toContain('"upload"');
    expect(source).toContain('"deploy"');
    expect(source).toContain('"--version-tag"');
    expect(source).not.toContain('run("wrangler", ["deploy"');
  });
});
