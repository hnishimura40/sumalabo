import {featuredPricing} from './ai-featured-pricing';
import {capabilityFacts} from './ai-featured-guide';
import {entries} from './ai-comparison';
import {priceEntrances} from './ai-guide-sections';

// Editorial starting points, not measured rankings. Full conditions stay in entries.
const profiles=[
 {id:'gemini',name:'Gemini',theme:'blue',lead:'画像も、動画も、音楽も。',fit:'相談から作品づくりまで、Googleの機能をまとめて使いたい。',tags:['画像・動画・音楽','Google連携'],tradeoff:'生成の種類ごとに、年齢・プラン・回数の条件が違います。',website:'https://gemini.google.com/',related:[['画像','/ai/images/'],['動画','/ai/video/'],['音楽','/ai/music/']]},
 {id:'chatgpt',name:'ChatGPT',theme:'green',lead:'相談から、仕事の成果物へ。',fit:'文章、調べもの、ファイルを扱う仕事を一つの入口から始めたい。',tags:['相談・調査・画像','Work・Codex'],tradeoff:'Work・Dots・Codexは入口や利用枠が異なり、APIも別料金です。',website:'https://chatgpt.com/',related:[['調査','/ai/research/'],['仕事','/ai/agents/'],['開発','/ai/coding/']]},
 {id:'claude',name:'Claude',theme:'clay',lead:'文章と資料を、形にする。',fit:'文章を推敲し、資料やコードの成果物へつなげたい。',tags:['文章・資料','Artifacts・Code'],tradeoff:'Claude CodeやDuetの条件は別。Duetは日本向け提供の案内がありません。',website:'https://claude.ai/',related:[['文章','/ai/chat/'],['資料調査','/ai/research/'],['開発','/ai/coding/']]},
 {id:'grok',name:'Grok',theme:'ink',lead:'Xの話題を、検索から創作へ。',fit:'XとWebを調べ、画像や短い動画づくりにも使いたい。',tags:['Web・X検索','Imagine'],tradeoff:'投稿の内容は根拠を確認。新規契約と既存SuperGrokで料金体系が違います。',website:'https://grok.com/',related:[['調査','/ai/research/'],['画像','/ai/images/'],['動画','/ai/video/']]},
 {id:'copilot',name:'Copilot',theme:'violet',lead:'いつものOfficeに、AIを。',fit:'Word・Excelなど、Microsoftのアプリを使う仕事を助けてほしい。',tags:['Microsoft 365','仕事の連携'],tradeoff:'個人と法人の契約は別。PremiumのAI機能は契約者本人だけが利用できます。',website:'https://copilot.microsoft.com/',related:[['文章','/ai/chat/'],['仕事の自動化','/ai/workflow/']]},
 {id:'muse',name:'Muse',theme:'rose',lead:'無料で始める、常時AI秘書。',fit:'調べものや予定など、日々の用事を継続して進めてほしい。',tags:['無料でタスク実行','閉じた後も継続'],tradeoff:'無料は使用量上限あり。上限後は枠の回復を待つか、有料プランへ。',website:'https://muse.ai/',related:[['ほかのAI秘書','/ai/companions/']]},
] as const;
export const featured=profiles.map(p=>{
 const entry=entries.find(e=>e.id===p.id);
 if(!entry)throw Error('Missing featured entry: '+p.id);
 return {...p,entry,capabilities:capabilityFacts[p.id],pricing:featuredPricing[p.id],price:priceEntrances[p.id]};
});
