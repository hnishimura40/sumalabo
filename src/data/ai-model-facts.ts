// Official model-card facts and published benchmark snapshots, not SumaLabo test results.
// Country identifies the developing organisation's disclosed base, not hosting or data residency.
export const modelFactsCheckedAt = '2026-11-15';
export const modelFacts = [
  {
    id: 'Qwen/Qwen3.8-27B', name: 'Qwen3.8-27B', country: '中国（Alibaba）',
    parameters: '27B・Dense', context: '262,144 tokensが標準。設定変更で最大1Mへ拡張',
    modalities: '文章・画像・動画の理解 → 文章', license: 'Apache-2.0',
    hardware: '精度・量子化と文脈長で必要メモリーが変わる。1Mは既定の実行条件ではない。',
    url: 'https://huggingface.co/Qwen/Qwen3.8-27B',
    extraUrl: 'https://www.alibabagroup.com/en-US/global-location',
  },
  {
    id: 'deepseek-ai/DeepSeek-V4.1-Flash-1017', name: 'DeepSeek-V4.1-Flash-1017', country: '中国（DeepSeek）',
    parameters: 'MoE。配布ページは763B。基底V4.1の公称はbackbone 552B＋Engram 196B、活性8B（入力処理）/16B（出力生成）。集計範囲が異なる',
    context: '1M tokens（configの上限は1,048,576）', modalities: '文章・画像 → 文章', license: 'MIT（コードと重み）',
    hardware: '大型の配布重みとキャッシュの保持が必要。「活性16B」は16B分のメモリーだけで動くという意味ではない。',
    url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017',
    extraUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/raw/main/README.md',
  },
  {
    id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', name: 'Llama 4 Scout Instruct', country: '米国（Meta）',
    parameters: '109B total / 17B active・MoE', context: '10M tokens（モデルカード公称）',
    modalities: '文章・画像 → 文章・コード', license: 'Llama 4 Community License（独自条件）',
    hardware: '全重みと長文のキャッシュが必要。17B activeと総容量を区別。公式12言語の一覧に日本語は含まれない。',
    url: 'https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct',
    extraUrl: 'https://www.sec.gov/Archives/edgar/data/1326801/000119312526431009/d127909ds3asr.htm',
  },
  {
    id: 'google/gemma-4-12B-it', name: 'Gemma 4 12B Unified', country: '米国（Google。開発はGoogle DeepMind等）',
    parameters: '11.95B・Dense', context: '256K tokens',
    modalities: '文章・画像・動画・音声の理解 → 文章', license: 'Apache-2.0',
    hardware: '独立した画像・音声encoderを持たないUnified型。量子化・文脈長で機材条件が変わる。音声入力と音声生成は別。',
    url: 'https://huggingface.co/google/gemma-4-12B-it',
    extraUrl: 'https://policies.google.com/terms?hl=en',
  },
  {
    id: 'mistralai/Mistral-Large-4-1T-A52B', name: 'Mistral Large 4', country: 'フランス（Mistral AI）',
    parameters: '約1T total / 約52B active（embedding等込み）・MoE', context: '1M tokens',
    modalities: '文章・画像 → 文章', license: 'Mistral Ecosystem Open-Weight License。Model-as-a-Service事業は別商用契約',
    hardware: '大規模サーバー向け。NVFP4版はBlackwell GPUを対象に案内。小型Ministralの条件とは別。',
    url: 'https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B',
    extraUrl: 'https://legal.mistral.ai/terms/row-consumer-terms/',
  },
  {
    id: 'mistralai/Ministral-3-8B-Instruct-2512', name: 'Ministral 3 8B Instruct 2512', country: 'フランス（Mistral AI）',
    parameters: '8.4B言語モデル＋0.4B画像encoder', context: '256K tokens',
    modalities: '文章・画像 → 文章。日本語も対応言語として案内', license: 'Apache-2.0',
    hardware: '公式はFP8で12GB VRAMに収まると案内。最大文脈での総メモリー保証ではなく、キャッシュ等も考慮する。',
    url: 'https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512',
    extraUrl: 'https://legal.mistral.ai/terms/row-consumer-terms/',
  },
  {
    id: 'openai/gpt-oss-120b', name: 'gpt-oss-120b', country: '米国（OpenAI）',
    parameters: '117B total / 5.1B active・MoE', context: '131,072 tokens（公式config）',
    modalities: '文章 → 文章。ツール呼び出し対応。画像・音声生成モデルではない', license: 'Apache-2.0',
    hardware: '公式MXFP4で80GB GPU 1基を想定。harmony形式が必須。実行枠・キャッシュと利用する処理系も確認する。',
    url: 'https://huggingface.co/openai/gpt-oss-120b',
    extraUrl: 'https://huggingface.co/openai/gpt-oss-120b/raw/main/config.json',
  },
  {
    id: 'pfnet/plamo-3-translate-8b', name: 'PLaMo 3 Translate 8B', country: '日本（Preferred Networks / NICTとの共同研究が基盤）',
    parameters: '8Bクラス。配布ページのModel size表示は9B', context: '学習時の入出力合計32,768 tokens',
    modalities: '文章 → 翻訳文。日本語・英語を含む53言語、用語集・文脈指定・日本語の文体指定',
    license: 'PLaMo Community License。個人・非商用は無料。商用は直近売上等10億円以下なら登録後無料、超える場合は別契約',
    hardware: '翻訳専用で、汎用チャットの代用とは限らない。BF16と各量子化版で容量・精度・処理系が異なる。',
    url: 'https://huggingface.co/pfnet/plamo-3-translate-8b',
    extraUrl: 'https://www.preferred.jp/ja/company',
  },
  {
    id: 'sbintuitions/sarashina2.2-3b-instruct-v0.1', name: 'Sarashina2.2 3B Instruct v0.1', country: '日本（SB Intuitions）',
    parameters: '3Bクラス・Dense', context: '8,192 tokens（公式config）',
    modalities: '文章 → 文章。日本語向けの指示調整モデル', license: 'MIT',
    hardware: '公式例はBF16。必要メモリーは量子化・処理系・文脈長次第。OCR・音声・Visionの別モデルとは区別する。',
    url: 'https://huggingface.co/sbintuitions/sarashina2.2-3b-instruct-v0.1',
    extraUrl: 'https://huggingface.co/sbintuitions/sarashina2.2-3b-instruct-v0.1/raw/main/config.json',
  },
  {
    id: 'LGAI-EXAONE/EXAONE-4.5-33B', name: 'EXAONE 4.5 33B', country: '韓国（LG AI Research。米国にも研究拠点）',
    parameters: '31.7B言語モデル＋1.29B画像encoder', context: '262,144 tokens',
    modalities: '文章・画像 → 文章。文書理解・韓国語の文脈推論を重視',
    license: 'EXAONE AI Model License Agreement 1.2 - NC（非商用向けの独自条件）',
    hardware: 'BF16配布。量子化・画像・文脈長で必要メモリーが変わる。重みが公開されても商用自由とは限らない。',
    url: 'https://huggingface.co/LGAI-EXAONE/EXAONE-4.5-33B',
    extraUrl: 'https://www.lgresearch.ai/about/mission',
  },
];

// A row's date is its source's snapshot/release date unless the conditions say "確認日".
// Scores from different rows are not one common scale. Do not compute a combined ranking.
export const benchmarkSnapshots = [
  {name:'Terminal-Bench 4.1',date:'2026-11-15',model:'Opus 5.5 (max) / Claude Code',score:'65.8% ±3.1%',conditions:'確認日。公式表でBenchmark 4.1を選択。誤差は95%区間。画面のRelease dateはモデル公開日で測定日ではない。総費用表示$4.7kは1回の作業料金ではない。',url:'https://www.tbench.ai/'},
  {name:'Terminal-Bench 4.1',date:'2026-11-15',model:'Gemini 4 Carbon (high) / Antigravity CLI',score:'64.5% ±3.2%',conditions:'確認日。同一の4.1表。モデルとエージェントの組合せを評価。実行時間・試行回数等は一次表の設定を確認。',url:'https://www.tbench.ai/'},
  {name:'Terminal-Bench 4.1',date:'2026-11-15',model:'GPT-6.1 Sol (max) / Codex',score:'60.9% ±3.0%',conditions:'確認日。同一の4.1表。異なるエージェント・推論設定の結果をモデル単体の優劣へ置き換えない。',url:'https://www.tbench.ai/'},
  {name:'SWE-bench Verified / Bash Only',date:'2026-02-17',model:'Claude 4.5 Opus (high) / mini-SWE-agent 2.0.0',score:'76.80% / 平均$0.75',conditions:'公式表の記録日。人が選別した500題、Bash Onlyを選択した固定実行環境の例。2026年11月の最新モデル順位を意味しない。',url:'https://www.swebench.com/'},
  {name:'SWE-bench Verified / Bash Only',date:'2026-02-17',model:'Gemini 3 Flash (high) / mini-SWE-agent 2.0.0',score:'75.80% / 平均$0.36',conditions:'公式表の記録日。上と同じ固定実行環境の例。SWE-bench ProやFull/Lite/Multilingualとは別。',url:'https://www.swebench.com/'},
  {
    name: 'Artificial Analysis Intelligence Index v5', date: '2026-10-27', model: 'Claude Opus 5.5 (max)', score: '58',
    conditions: 'v5発表時の総合指数。知識労働・開発・科学・一般の4分野各25%。v4.3と数値を直結しない。',
    url: 'https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5/',
  },
  {
    name: 'Artificial Analysis Intelligence Index v5', date: '2026-10-27', model: 'GPT-6 Astra (max)', score: '57',
    conditions: 'v5発表時。同一指数・版でも推論設定を併記。現在の順位を意味しない。',
    url: 'https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5/',
  },
  {
    name: 'Artificial Analysis Intelligence Index v5', date: '2026-10-27', model: 'GPT-6.1 Sol (max)', score: '55',
    conditions: 'v5発表時。モデルのAPI評価であり、ChatGPT等のサービス全体の点数ではない。',
    url: 'https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5/',
  },
  {
    name: 'Arena Text / Overall', date: '2026-11-11', model: 'Gemini 4 Carbon (High)', score: '1526 ±10（暫定）',
    conditions: '公式画面の更新日。4,273票。人の選好による相対評価で、正解率ではない。暫定値と順位幅に注意。',
    url: 'https://arena.ai/leaderboard/chat/text',
  },
  {
    name: 'Arena Text / Overall', date: '2026-11-11', model: 'Gemini 4 Argon (High)', score: '1522 ±5',
    conditions: '公式画面の更新日。20,779票。カテゴリ・補正を変えた表の数値と混ぜない。僅差は不確実性を含む。',
    url: 'https://arena.ai/leaderboard/chat/text',
  },
  {
    name: 'OSWorld 2.0', date: '2026-11-15', model: 'Claude Opus 4.8 / maximum thinking', score: '完全達成20.6% / 部分点54.8%',
    conditions: '確認日。研究ページ掲載の108長期タスク、500 steps、batched tool calls。旧OSWorldやOSWorld-Verifiedの値とは別。',
    url: 'https://osworld-v2.xlang.ai/',
  },
  {
    name: 'SlopCodeBench', date: '2026-10-26', model: 'GPT 6.1 SOL (Medium) / Codex 0.159.2', score: 'Strict 14.80% / Isolated 29.08% / $0.91/CKPT',
    conditions: '公式更新日。Strictは前のcheckpointも含めた成功、Isolatedは当該分のみ。費用はcheckpoint平均USD。',
    url: 'https://www.scbench.ai/leaderboard',
  },
  {
    name: 'SlopCodeBench', date: '2026-10-26', model: 'GPT 6 Astra (XHigh) / Codex 0.153.3', score: 'Strict 16.33% / Isolated 31.63% / $3.87/CKPT',
    conditions: '公式更新日。同じモデル名でもharness版・推論設定で結果が変わる。34 runsは34モデルという意味ではない。',
    url: 'https://www.scbench.ai/leaderboard',
  },
];

// Company-location evidence is kept separate from model/hosting claims.
export const modelCountrySources = [
  { provider: 'Alibaba', country: '中国', url: 'https://www.alibabagroup.com/en-US/global-location' },
  { provider: 'DeepSeek', country: '中国', url: 'https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html' },
  { provider: 'Meta', country: '米国', url: 'https://www.sec.gov/Archives/edgar/data/1326801/000119312526431009/d127909ds3asr.htm' },
  { provider: 'Google', country: '米国', url: 'https://policies.google.com/terms?hl=en' },
  { provider: 'Mistral AI', country: 'フランス', url: 'https://legal.mistral.ai/terms/row-consumer-terms/' },
  { provider: 'OpenAI', country: '米国', url: 'https://openai.com/policies/terms-of-use/' },
  { provider: 'Preferred Networks', country: '日本', url: 'https://www.preferred.jp/ja/company' },
  { provider: 'SB Intuitions', country: '日本', url: 'https://www.sbintuitions.co.jp/company/' },
  { provider: 'LG AI Research', country: '韓国（米国にも研究拠点）', url: 'https://www.lgresearch.ai/about/mission' },
];
