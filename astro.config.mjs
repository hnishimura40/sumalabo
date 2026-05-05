import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  // TODO: 本番公開URL確定後に site を設定する。
  // sitemap 導入時もこのURLを基準にする。
  integrations: [mdx()],
});
