import type { APIRoute } from "astro";
import { BUILD_ID, BUILT_AT, COMMIT } from "../lib/build-id";

// 新デプロイ検知用のビルドID公開エンドポイント。
// 静的ビルドなので Cache-Control ヘッダは Pages 側の既定になる。
// クライアントは必ず fetch(..., { cache: "no-store" }) で取りに来ること。
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ buildId: BUILD_ID, commit: COMMIT, builtAt: BUILT_AT }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
