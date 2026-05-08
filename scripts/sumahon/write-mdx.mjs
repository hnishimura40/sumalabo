import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "./utils.mjs";

export async function writeMdx({ slug, mdx }) {
  const filePath = path.join("content", "articles", `${slug}.mdx`);
  await ensureDir(filePath);
  await writeFile(filePath, mdx, "utf-8");
  return filePath;
}
