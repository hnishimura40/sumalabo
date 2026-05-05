from __future__ import annotations

import html
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_DIR = ROOT / "assets" / "characters" / "original"
OUTPUT_DIRS = {
    "full": ROOT / "assets" / "characters" / "full",
    "half": ROOT / "assets" / "characters" / "half",
    "icon": ROOT / "assets" / "characters" / "icon",
}
REPORT_PATH = ROOT / "docs" / "character_image_derivatives_report.md"
PREVIEW_PATH = ROOT / "docs" / "character_image_preview.html"


@dataclass(frozen=True)
class Derivative:
    source: str
    output: str
    kind: str
    width: int
    purpose: str
    crop: tuple[float, float, float, float] | None = None
    square_focus: tuple[float, float, float] | None = None
    make_png: bool = True
    needs_review: str = ""


DERIVATIVES: list[Derivative] = [
    Derivative(
        source="labomaru_normal.png",
        output="labomaru_normal_full",
        kind="full",
        width=900,
        purpose="トップページ、カテゴリ、記事冒頭の汎用案内",
        crop=None,
        needs_review="大きめ表示で余白が多すぎないか確認",
    ),
    Derivative(
        source="labomaru_chart.png",
        output="labomaru_chart_full",
        kind="full",
        width=900,
        purpose="比較記事やカテゴリページの比較・整理ビジュアル",
        crop=None,
        needs_review="チャート要素が十分見えるか確認",
    ),
    Derivative(
        source="labomaru_analytics.png",
        output="labomaru_analytics_full",
        kind="full",
        width=900,
        purpose="料金・性能分析記事の大きめ補助ビジュアル",
        crop=None,
        needs_review="分析・グラフの印象が残っているか確認",
    ),
    Derivative(
        source="labomaru_worried.png",
        output="labomaru_worried_full",
        kind="full",
        width=900,
        purpose="注意点や失敗回避記事の大きめ補助ビジュアル",
        crop=None,
        needs_review="注意喚起として重すぎない見え方か確認",
    ),
    Derivative(
        source="himari_joyful.png",
        output="himari_joyful_full",
        kind="full",
        width=900,
        purpose="初心者向け記事やカテゴリ導入の明るいビジュアル",
        crop=None,
        needs_review="大きめ表示で本文より目立ちすぎないか確認",
    ),
    Derivative(
        source="himari_device.png",
        output="himari_device_full",
        kind="full",
        width=900,
        purpose="スマホ・AI・ガジェット説明記事の大きめビジュアル",
        crop=None,
        needs_review="デバイスが見える構図になっているか確認",
    ),
    Derivative(
        source="himari_question.png",
        output="himari_question_full",
        kind="full",
        width=900,
        purpose="用語解説記事や初心者向け導入の大きめビジュアル",
        crop=None,
        needs_review="疑問を代弁する表情が伝わるか確認",
    ),
    Derivative(
        source="himari_teal.png",
        output="himari_teal_full",
        kind="full",
        width=900,
        purpose="流入記事、SNS、サムネイル向けの華やかなビジュアル",
        crop=None,
        needs_review="記事内で使う場合に華やかさが強すぎないか確認",
    ),
    Derivative(
        source="duo_guide.png",
        output="duo_guide_full",
        kind="full",
        width=1000,
        purpose="トップページ、カテゴリ案内、内部リンク導線の大きめビジュアル",
        crop=None,
        needs_review="2人のバランスと案内感が残っているか確認",
    ),
    Derivative(
        source="duo_talk.png",
        output="duo_talk_full",
        kind="full",
        width=1000,
        purpose="記事冒頭の会話導入や初心者向け補足の大きめビジュアル",
        crop=None,
        needs_review="会話している雰囲気が残っているか確認",
    ),
    Derivative(
        source="labomaru_normal.png",
        output="labomaru_normal_icon",
        kind="icon",
        width=240,
        purpose="要点整理、まとめ前の一言補足",
        square_focus=(0.50, 0.42, 0.78),
        needs_review="アイコン表示時にアンテナと表情が十分見えるか確認",
    ),
    Derivative(
        source="labomaru_worried.png",
        output="labomaru_worried_icon",
        kind="icon",
        width=240,
        purpose="注意点、迷いやすいポイントの補足",
        square_focus=(0.50, 0.42, 0.78),
        needs_review="不安そうな表情が小サイズでも伝わるか確認",
    ),
    Derivative(
        source="labomaru_chart.png",
        output="labomaru_chart_icon",
        kind="icon",
        width=240,
        purpose="比較表の見方、料金やスペックの整理",
        square_focus=(0.50, 0.44, 0.82),
        needs_review="チャート要素が切れすぎていないか確認",
    ),
    Derivative(
        source="labomaru_analytics.png",
        output="labomaru_analytics_half",
        kind="half",
        width=520,
        purpose="分析、数字の意味づけ、料金や性能の整理",
        crop=(0.04, 0.02, 0.96, 0.94),
        needs_review="分析・グラフらしさが残っているか確認",
    ),
    Derivative(
        source="himari_question.png",
        output="himari_question_icon",
        kind="icon",
        width=240,
        purpose="用語解説の入口、「それってどういうこと？」の吹き出し",
        square_focus=(0.50, 0.30, 0.56),
        needs_review="顔と疑問の雰囲気が小サイズでも分かるか確認",
    ),
    Derivative(
        source="himari_joyful.png",
        output="himari_joyful_icon",
        kind="icon",
        width=240,
        purpose="明るい導入、歓迎、初心者向け記事の入口",
        square_focus=(0.50, 0.30, 0.56),
        needs_review="表情が明るく見える範囲で切れているか確認",
    ),
    Derivative(
        source="himari_device.png",
        output="himari_device_half",
        kind="half",
        width=520,
        purpose="スマホ・AI・ガジェットの説明補助",
        crop=(0.07, 0.02, 0.93, 0.78),
        needs_review="デバイスが見える範囲で残っているか確認",
    ),
    Derivative(
        source="himari_teal.png",
        output="himari_teal_half",
        kind="half",
        width=520,
        purpose="華やかな見せ場、SNS、サムネイル、流入記事向け",
        crop=(0.02, 0.02, 0.98, 0.58),
        needs_review="上半身中心で、記事内で派手になりすぎない切り出しになっているか確認",
    ),
    Derivative(
        source="duo_talk.png",
        output="duo_talk_half",
        kind="half",
        width=600,
        purpose="記事冒頭の会話ボックス、初心者向け補足",
        crop=(0.02, 0.03, 0.98, 0.95),
        needs_review="2人の会話感が残っているか確認",
    ),
    Derivative(
        source="duo_guide.png",
        output="duo_guide_half",
        kind="half",
        width=600,
        purpose="内部リンク導線、カテゴリ案内",
        crop=(0.02, 0.03, 0.98, 0.95),
        needs_review="2人が並ぶブランド感と案内感が残っているか確認",
    ),
]


def ensure_dirs() -> None:
    for directory in OUTPUT_DIRS.values():
        directory.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)


def trim_near_white(image: Image.Image, threshold: int = 248, padding_ratio: float = 0.04) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    diff = ImageChops.difference(rgba, background)
    mask = diff.convert("L").point(lambda value: 255 if value > (255 - threshold) else 0)
    bbox = mask.getbbox()
    if not bbox:
        return rgba

    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    pad = max(8, int(max(width, height) * padding_ratio))
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(rgba.width, right + pad)
    bottom = min(rgba.height, bottom + pad)
    return rgba.crop((left, top, right, bottom))


def crop_relative(image: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    left, top, right, bottom = box
    return image.crop(
        (
            int(image.width * left),
            int(image.height * top),
            int(image.width * right),
            int(image.height * bottom),
        )
    )


def crop_square_focus(image: Image.Image, focus: tuple[float, float, float]) -> Image.Image:
    center_x, center_y, scale = focus
    side = int(min(image.width, image.height) * scale)
    cx = int(image.width * center_x)
    cy = int(image.height * center_y)
    left = max(0, min(image.width - side, cx - side // 2))
    top = max(0, min(image.height - side, cy - side // 2))
    return image.crop((left, top, left + side, top + side))


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    if image.width == width:
        return image
    height = round(image.height * (width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def flatten_on_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    background.alpha_composite(rgba)
    return background.convert("RGB")


def process_derivative(spec: Derivative) -> dict[str, object]:
    source_path = ORIGINAL_DIR / spec.source
    if not source_path.exists():
        raise FileNotFoundError(source_path)

    source = Image.open(source_path)
    base = trim_near_white(source)
    if spec.crop:
        base = crop_relative(base, spec.crop)
    if spec.square_focus:
        base = crop_square_focus(base, spec.square_focus)

    output = resize_to_width(base, spec.width)
    output_rgb = flatten_on_white(output)

    output_dir = OUTPUT_DIRS[spec.kind]
    webp_path = output_dir / f"{spec.output}.webp"
    png_path = output_dir / f"{spec.output}.png"

    output_rgb.save(webp_path, "WEBP", quality=88, method=6)
    if spec.make_png:
        output_rgb.save(png_path, "PNG", optimize=True)

    return {
        "source": spec.source,
        "kind": spec.kind,
        "purpose": spec.purpose,
        "webp": webp_path,
        "png": png_path if spec.make_png else None,
        "size": output_rgb.size,
        "needs_review": spec.needs_review,
    }


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_report(results: Iterable[dict[str, object]], failures: Iterable[str]) -> None:
    result_list = list(results)
    failure_list = list(failures)
    lines = [
        "# キャラクター画像 派生作成レポート",
        "",
        f"作成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## 作成した画像一覧",
        "",
        "| 派生画像 | 元画像 | 出力先 | サイズ | 用途 | 目視確認 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]

    for item in result_list:
        webp = item["webp"]
        assert isinstance(webp, Path)
        size = item["size"]
        assert isinstance(size, tuple)
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{webp.name}`",
                    f"`{item['source']}`",
                    f"`{relative(webp)}`",
                    f"{size[0]}x{size[1]}",
                    str(item["purpose"]),
                    str(item["needs_review"]),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## PNG版",
            "",
            "確認や再加工しやすいよう、同名の `.png` も作成しています。Web表示では `.webp` を優先します。",
            "",
            "## 目視確認が必要なもの",
            "",
        ]
    )

    for item in result_list:
        webp = item["webp"]
        assert isinstance(webp, Path)
        lines.append(f"- `{webp.name}`: {item['needs_review']}")

    lines.extend(["", "## 次に修正すべき候補", ""])
    lines.extend(
        [
            "- アイコン画像は、実際の吹き出しサイズで顔や表情が読み取れるか確認する。",
            "- `himari_device_half.webp` は、デバイスが切れすぎていないか確認する。",
            "- `duo_talk_half.webp` と `duo_guide_half.webp` は、スマホ幅で横長すぎないか確認する。",
            "- 必要なら次回、画像ごとの crop 設定を微調整する。",
        ]
    )

    lines.extend(["", "## 失敗した画像", ""])
    if failure_list:
        lines.extend(f"- {failure}" for failure in failure_list)
    else:
        lines.append("- なし")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_preview(results: Iterable[dict[str, object]]) -> None:
    cards = []
    for item in results:
        webp = item["webp"]
        assert isinstance(webp, Path)
        size = item["size"]
        assert isinstance(size, tuple)
        src = "../" + relative(webp)
        cards.append(
            f"""
      <article class="card {html.escape(str(item['kind']))}">
        <div class="image-wrap">
          <img src="{html.escape(src)}" alt="{html.escape(webp.stem)}" loading="lazy">
        </div>
        <h2>{html.escape(webp.name)}</h2>
        <dl>
          <dt>元画像</dt><dd>{html.escape(str(item['source']))}</dd>
          <dt>種別</dt><dd>{html.escape(str(item['kind']))}</dd>
          <dt>サイズ</dt><dd>{size[0]}x{size[1]}</dd>
          <dt>用途</dt><dd>{html.escape(str(item['purpose']))}</dd>
        </dl>
      </article>
"""
        )

    PREVIEW_PATH.write_text(
        f"""<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>すまラボ キャラクター派生画像プレビュー</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7faf9;
      color: #24302f;
    }}
    body {{
      margin: 0;
      padding: 32px;
    }}
    header {{
      max-width: 1040px;
      margin: 0 auto 24px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.3;
    }}
    p {{
      margin: 0;
      color: #5b6967;
      line-height: 1.7;
    }}
    .grid {{
      max-width: 1040px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }}
    .card {{
      background: #ffffff;
      border: 1px solid #dbe7e4;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 8px 20px rgba(29, 64, 59, 0.06);
    }}
    .image-wrap {{
      min-height: 180px;
      display: grid;
      place-items: center;
      background: #f1f6f5;
      border-radius: 6px;
      padding: 12px;
      overflow: hidden;
    }}
    .icon .image-wrap img {{
      width: 160px;
      max-width: 100%;
    }}
    .half .image-wrap img {{
      width: min(100%, 360px);
      max-height: 280px;
      object-fit: contain;
    }}
    img {{
      display: block;
      height: auto;
      max-width: 100%;
    }}
    h2 {{
      margin: 14px 0 10px;
      font-size: 15px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }}
    dl {{
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 6px 10px;
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }}
    dt {{
      color: #61736f;
      font-weight: 700;
    }}
    dd {{
      margin: 0;
    }}
    @media (max-width: 560px) {{
      body {{
        padding: 18px;
      }}
      h1 {{
        font-size: 22px;
      }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>すまラボ キャラクター派生画像プレビュー</h1>
    <p>記事内で使う icon / half 画像の確認用ページです。白背景のまま、表示サイズと切り出し具合を確認します。</p>
  </header>
  <main class="grid">
{''.join(cards)}
  </main>
</body>
</html>
""",
        encoding="utf-8",
    )


def main() -> int:
    ensure_dirs()
    results: list[dict[str, object]] = []
    failures: list[str] = []

    for spec in DERIVATIVES:
        try:
            results.append(process_derivative(spec))
        except Exception as exc:  # noqa: BLE001 - report all image failures clearly.
            failures.append(f"{spec.source} -> {spec.output}: {exc}")

    write_report(results, failures)
    write_preview(results)

    print(f"created: {len(results)} derivatives")
    print(f"failures: {len(failures)}")
    for item in results:
        webp = item["webp"]
        assert isinstance(webp, Path)
        size = item["size"]
        assert isinstance(size, tuple)
        print(f"- {relative(webp)} ({size[0]}x{size[1]})")
    if failures:
        for failure in failures:
            print(f"FAILED: {failure}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
