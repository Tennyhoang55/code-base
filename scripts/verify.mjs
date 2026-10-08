import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { z } from "zod";

const mode = z
  .enum(["migrate", "seed", "test", "e2e", "dev", "serve"])
  .parse(process.argv[2] ?? "test");
const testEnv = z
  .object({ DATABASE_URL: z.url(), DATABASE_URL_UNPOOLED: z.url() })
  .parse(parse(readFileSync(".local/test.env", "utf8")));
const live = parse(readFileSync(".env.local", "utf8"));
if (
  new URL(testEnv.DATABASE_URL).hostname === new URL(live.DATABASE_URL).hostname
)
  throw new Error("Không chạy kiểm tra trên database production.");
const commands = {
  migrate: ["db:deploy"],
  seed: ["db:seed"],
  test: ["test"],
  e2e: ["test:e2e"],
  dev: ["dev", "--port", "3100"],
  serve: ["start", "--port", "3100"],
};
const result = spawnSync("corepack", ["pnpm@10.34.6", ...commands[mode]], {
  shell: process.platform === "win32",
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testEnv.DATABASE_URL,
    DIRECT_URL: testEnv.DATABASE_URL_UNPOOLED,
  },
});
process.exitCode = result.status ?? 1;
