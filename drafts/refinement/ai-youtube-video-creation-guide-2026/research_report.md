# Research Report — AIで動画作成はどこまでできる？

- 調査時点: 2026-07-25
- 方針: 製品名・提供状況・料金・規約は一次情報を優先。プレビュー機能は変更可能性を明記する。

## 一次情報で確認したこと

### VOICEVOX

- 公式利用規約では、VOICEVOXで生成した音声は商用・非商用で利用できる。
- VOICEVOXを利用したことが分かるクレジット表記が必要。
- 各音声ライブラリには別の利用規約があり、キャラクターごとの条件も確認する。
- 出典: https://voicevox.hiroshiba.jp/term/ / https://voicevox.hiroshiba.jp/qa/

### Geminiの音声・動画

- 音声生成の現行名称は Gemini 3.1 Flash TTS Preview。プレビュー提供。
- Gemini APIの標準料金は入力100万テキストトークンあたり1ドル、出力100万音声トークンあたり20ドル。無料枠もある。音声は1秒あたり25トークン換算。
- 短尺動画は Gemini Omni Flash Preview と Veo 系が公式に案内されている。GeminiアプリのOmniはGoogle AIプラン等が必要。API版Omniは有料枠のPreview。
- 「Omni」だけを確定製品名のように書かず、正式名と提供面を併記する。
- 出典: https://ai.google.dev/gemini-api/docs/speech-generation / https://ai.google.dev/gemini-api/docs/video / https://ai.google.dev/gemini-api/docs/pricing / https://support.google.com/gemini/answer/16126339

### YouTubeの開示

- YouTube Studioの「AI use」で、現実的に見える合成・改変コンテンツを開示する。
- 台本案、サムネイル、字幕、アイデア出しなどの制作補助だけなら、原則として開示対象ではない。
- 開示そのものは視聴範囲や収益化を制限しない。開示漏れを繰り返すとラベル付与や措置の対象になり得る。
- 出典: https://support.google.com/youtube/answer/14328491

### ChatGPT画像

- 現行の画像機能は ChatGPT Images 2.0。全プランで提供。
- OpenAIとの関係では、法令で認められる範囲でユーザーが出力を所有する。入力に必要な権利を持つこと、法令・ポリシー・第三者の権利を守ることはユーザーの責任。
- 「商用利用を無条件保証」とは表現しない。
- 出典: https://openai.com/index/introducing-chatgpt-images-2-0/ / https://help.openai.com/en/articles/11084440 / https://openai.com/ja-JP/policies/row-terms-of-use/

## 編集判断

- カテゴリ: やってみた・検証
- hasAffiliate: false
- 実運用節は、媒体名・チャンネル名・内部システム名・自動化基盤を出さず、一般化した工程だけを書く。
- 高性能PCが不要という結論は、クラウド型ツールと一般的な合成作業の範囲に限定する。ローカル動画生成は例外とする。
