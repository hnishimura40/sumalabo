import {capabilityAxes,capabilityFacts,type Capability,type CapabilityKey} from './ai-featured-guide';

// Individual accounts in Japan. No trials, API credits, external plugins or student offers.
// Shared product negatives retain their scope/evidence in ai-featured-guide.ts.
export const planCapabilitiesCheckedAt='2026-11-18';
export const planCapabilityAxes=capabilityAxes.filter(axis=>axis.key!=='free');
export const comparisonPlans=[
 {id:'free',title:'無料で、どこまでできる？',label:'無料で比べる',intro:'通常の無料枠で使える機能を比較。期間限定の無料体験や、外部サービスの有料機能は含めません。'},
 {id:'paid',title:'有料にすると、何が変わる？',label:'有料で比べる',intro:'利用量の拡大と、有料で使える機能を比較。下の価格は代表例で、すべての○がその価格に含まれるわけではありません。必要なプランは各欄に表示しています。'},
] as const;
type Plan=typeof comparisonPlans[number]['id'];
type PlanFacts=Record<Exclude<CapabilityKey,'free'>,Capability>;
const fact=(status:Capability['status'],text:string,source:string):Capability=>({status,text,source});
const yes=(text:string,source:string)=>fact('yes',text,source);
const no=(text:string,source:string)=>fact('no',text,source);
const limited=(text:string,source:string)=>fact('limited',text,source);
const google='https://support.google.com/gemini/answer/16275805?hl=en';
const googleTasks='https://support.google.com/gemini/answer/17094507?hl=en';
const chat='https://chatgpt.com/pricing/';
const claude='https://claude.com/ja/pricing';
const claudeVoice='https://support.claude.com/en/articles/11101966-use-voice-mode';
const grok='https://x.ai/pricing';
const copilot='https://support.microsoft.com/en-us/microsoft-365-copilot/learning/changes-microsoft-copilot-app';
const copilotVoice='https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-with-voice-features-in-microsoft-365-copilot';
const muse='https://www.meta.com/help/subscriptions/1021145227643680/';
export const planCapabilities:Record<Plan,Record<string,PlanFacts>>={
 free:{
  gemini:{...capabilityFacts.gemini,
   files:yes('文章・資料の読解、Canvas。無料枠内',google),
   research:yes('検索・Deep Research。無料枠内',google),
   image:yes('画像生成・編集。無料枠内',google),
   video:no('Geminiアプリの動画生成はAI Plus以上',google),
   music:yes('Lyriaで音楽生成。無料枠内・18歳以上',google),
   voice:yes('Gemini Live。無料で利用可','https://gemini.google/overview/gemini-live/'),
   automation:yes('日本はTasksに無料枠。18歳以上・個人アカウント',googleTasks),
  },
  chatgpt:{...capabilityFacts.chatgpt,
   files:yes('文章・添付資料・デスクトップWorkに無料枠',chat),
   research:yes('検索・Deep Researchに無料枠',chat),
   image:yes('画像生成に無料枠',chat),
   voice:yes('音声会話に無料枠',chat),
   automation:no('予約TasksはPlus以上。常時秘書Dotsも有料',chat),
  },
  claude:{...capabilityFacts.claude,
   files:yes('ファイル作成・Docs・Slides・Artifacts。無料枠内',claude),
   research:yes('Web検索。ResearchはPro以上',claude),
   voice:yes('音声モード。通常の無料使用量を消費',claudeVoice),
   automation:no('タスクの委託・予約実行はPro以上',claude),
  },
  grok:{...capabilityFacts.grok,
   files:yes('文章・資料分析。無料の会話枠内','https://docs.x.ai/grok/faq'),
   research:yes('Web・X検索。無料の会話枠内','https://x.ai/grok'),
   image:yes('Imagineの画像生成に制限付き無料枠',grok),
   video:no('動画生成は無料プランの対象外',grok),
   voice:yes('音声会話に無料枠','https://docs.x.ai/grok/faq'),
   automation:no('常時動くGrok BotはPremium以上',grok),
  },
  copilot:{...capabilityFacts.copilot,
   files:yes('文章・ファイル添付。無料枠内',copilot),
   research:yes('Web検索。Researcherは対象有料契約',copilot),
   image:yes('画像生成・編集。無料枠内',copilot),
   video:no('生成クリップは対象有料契約・米国Frontier',capabilityFacts.copilot.video.source),
   voice:no('現行の音声機能は対象Microsoft契約が必要',copilotVoice),
   automation:no('個人向けCoworkはPremium・Proのプレビュー',copilot),
  },
  muse:{...capabilityFacts.muse,
   files:yes('文書作成・タスク実行。無料の使用量内',muse),
   research:yes('ブラウザで調査・監視。無料の使用量内',capabilityFacts.muse.research.source),
   image:yes('画像生成。無料の使用量内',capabilityFacts.muse.image.source),
   automation:yes('無料枠から。アプリを閉じてもクラウドで継続',capabilityFacts.muse.automation.source),
  },
 },
 paid:{
  gemini:{...capabilityFacts.gemini,
   files:yes('AI Plus以上：上位モデル・利用量を拡大',google),
   research:yes('AI Plus以上：調査の利用量を拡大',google),
   image:yes('AI Plus以上：画像の利用量・モデルを拡大',google),
   video:yes('AI Plus以上：動画生成。18歳以上',google),
   music:yes('AI Plus以上：音楽生成の利用量を拡大。18歳以上',google),
   voice:yes('Gemini Liveは有料でも利用可',capabilityFacts.gemini.voice.source),
   automation:yes('日本は無料からTasks対応。有料は利用枠を拡大',googleTasks),
  },
  chatgpt:{...capabilityFacts.chatgpt,
   files:yes('Plus以上：WorkにGPT-6.2を順次提供。ファイル等の枠を拡大','https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex'),
   research:yes('Plus以上：Deep Researchの枠を拡大',chat),
   image:yes('Plus以上：画像生成の利用枠を拡大',chat),
   voice:yes('Go・Plus以上：音声会話の枠を拡大',chat),
   automation:yes('TasksはPlus以上。Dotsは対象Pro等・段階提供',chat),
  },
  claude:{...capabilityFacts.claude,
   files:yes('Pro以上：使用量・作成ツールを拡大',claude),
   research:yes('Pro以上：Web検索に加えResearch',claude),
   voice:yes('音声モード。契約プランの使用量を消費',claudeVoice),
   automation:yes('Pro以上：タスク委託・Coworkの予約実行',claude),
  },
  grok:{...capabilityFacts.grok,
   files:yes('Plus以上：会話・ファイル分析の利用枠を拡大',grok),
   research:yes('Plus以上：Web・X検索の利用枠を拡大',grok),
   image:yes('Plus以上：Imagineの利用枠を拡大',grok),
   video:yes('新規Premium $30/月以上：動画生成。Plusは対象外',grok),
   voice:yes('Plus以上：音声の利用枠を拡大',grok),
   automation:yes('Grok Botは新規Premium $30/月以上。Plusは対象外','https://docs.x.ai/x-subscription/grok-bot'),
  },
  copilot:{...capabilityFacts.copilot,
   files:yes('対象Microsoft 365契約：Office連携と利用枠を拡大',copilot),
   research:yes('対象契約：Researcherなど。個人・法人で範囲別',capabilityFacts.copilot.research.source),
   image:yes('対象Microsoft 365契約：画像の利用枠を拡大',copilot),
   video:limited('対象有料契約でも生成クリップは米国Frontier。日本は対象外',capabilityFacts.copilot.video.source),
   voice:limited('対象Microsoft契約・地域・段階提供',copilotVoice),
   automation:limited('個人向けはPremium・ProのCowork。プレビューで順次提供',copilot),
  },
  muse:{...capabilityFacts.muse,
   files:yes('Power・Maximum：文書やタスクの使用量を拡大',muse),
   research:yes('Power・Maximum：調査・監視に使う量を拡大',muse),
   image:yes('Power・Maximum：画像等に使う量を拡大',muse),
   automation:yes('Power・Maximum：継続タスクの使用量を拡大',muse),
  },
 },
};
