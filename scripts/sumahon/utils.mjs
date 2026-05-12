import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export function assertSumahonUrl(rawUrl, commandName = "article:from-sumahon") {
  if (!rawUrl) {
    throw new Error(`Usage: npm run ${commandName} -- --url "https://smhn.info/..."`);
  }

  const url = new URL(rawUrl);
  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname !== "smhn.info") {
    throw new Error(`Only smhn.info URLs are supported. Received: ${url.hostname}`);
  }

  return url.toString();
}

export function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function stripTags(value = "") {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function cleanTitle(title = "") {
  return title
    .replace(/\s*[|-]\s*すまほん!!?$/i, "")
    .replace(/\s*[|-]\s*すまほん!!?.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toIsoJst(date = new Date()) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.toISOString().slice(0, 19)}+09:00`;
}

export function todayJst(date = new Date()) {
  return toIsoJst(date).slice(0, 10);
}

export function slugifyFromUrl(sourceUrl, fallback = "sumahon-topic") {
  const url = new URL(sourceUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1) || fallback;
  const slug = last
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || `${fallback}-${todayJst().replaceAll("-", "")}`;
}

export async function uniqueSlug(baseSlug) {
  let slug = baseSlug;
  let count = 2;

  while (existsSync(path.join("content", "articles", `${slug}.mdx`))) {
    slug = `${baseSlug}-${count}`;
    count += 1;
  }

  return slug;
}

export async function ensureDir(fileOrDir, isDir = false) {
  await mkdir(isDir ? fileOrDir : path.dirname(fileOrDir), { recursive: true });
}

export async function writeJson(filePath, data) {
  await ensureDir(filePath);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function writeText(filePath, data) {
  await ensureDir(filePath);
  await writeFile(filePath, data.endsWith("\n") ? data : `${data}\n`, "utf-8");
}

export async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // Windows では npm.cmd など .cmd ファイルを spawn するために shell: true が必要
    // (Node 24+ は shell: false の .cmd 起動を EINVAL で拒否する CVE-2024-27980 対策)
    // DEP0190 deprecation warning は親プロセス側で NODE_OPTIONS=--no-deprecation
    // を設定して抑制する (Windows タスクの runner スクリプトで設定済み)。
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

export function compactText(value = "", maxLength = 220) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function pickInternalLinks(topicCategory) {
  const base = [
    {
      label: "ニュースをかみくだくカテゴリを見る",
      href: "/categories/news/",
      description: "スマホ・AI・ガジェットのニュースを普通の人向けに整理しています。",
    },
  ];

  if (topicCategory === "AI") {
    return [
      {
        label: "AIスマホの基本を見る",
        href: "/articles/what-is-ai-smartphone/",
        description: "AIスマホで何が便利になり、何に注意したいかを整理しています。",
      },
      {
        label: "AIスマートグラスの記事を見る",
        href: "/articles/moonix-ai-smart-glasses/",
        description: "スマホの外へ広がるAIデバイスの流れを確認できます。",
      },
      ...base,
    ];
  }

  if (topicCategory === "iPhone" || topicCategory === "Android") {
    return [
      {
        label: "iPhoneとAndroidの違いを見る",
        href: "/articles/iphone-vs-android/",
        description: "スマホ選びの基本軸を整理できます。",
      },
      {
        label: "3万円台スマホの選び方を見る",
        href: "/articles/smartphone-under-30000-guide/",
        description: "価格を抑えて選ぶときの注意点を確認できます。",
      },
      ...base,
    ];
  }

  if (topicCategory === "通信") {
    return [
      {
        label: "eSIMの基本を見る",
        href: "/articles/what-is-esim/",
        description: "スマホ回線を見直す前に知っておきたい仕組みを整理しています。",
      },
      {
        label: "格安SIMの基本を見る",
        href: "/articles/what-is-cheap-sim/",
        description: "通信費を下げるときの考え方を確認できます。",
      },
      ...base,
    ];
  }

  if (topicCategory === "ガジェット") {
    return [
      {
        label: "USB-C充電器の選び方を見る",
        href: "/articles/usb-c-charger-guide/",
        description: "周辺機器を選ぶときの基本を確認できます。",
      },
      {
        label: "モバイルバッテリーの選び方を見る",
        href: "/articles/power-bank-guide/",
        description: "容量や安全性の見方を整理しています。",
      },
      ...base,
    ];
  }

  return base;
}
