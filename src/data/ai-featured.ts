import {entries} from './ai-comparison';
import {priceEntrances} from './ai-guide-sections';

// Editorial starting points, not measured rankings. Full conditions stay in entries.
const profiles=[
 {id:'gemini',name:'Gemini',mark:'G',theme:'blue',lead:'画像も、動画も、音楽も。',fit:'相談から作品づくりまで、Googleの機能をまとめて使いたい。',tags:['画像・動画・音楽','Google連携'],tradeoff:'生成の種類ごとに、年齢・プラン・回数の条件が違います。',website:'https://gemini.google.com/',related:[['画像','/ai/images/'],['動画','/ai/video/'],['音楽','/ai/music/']],cells:['相談・資料・Canvas','Deep Research','Nano Banana系','Gemini Omni系','Lyria系・歌／BGM','Live・Google連携、機能別条件']},
 {id:'chatgpt',name:'ChatGPT',mark:'C',theme:'green',lead:'相談から、仕事の成果物へ。',fit:'文章、調べもの、ファイルを扱う仕事を一つの入口から始めたい。',tags:['相談・調査・画像','Work・Codex'],tradeoff:'Work・Dots・Codexは入口や利用枠が異なり、APIも別料金です。',website:'https://chatgpt.com/',related:[['調査','/ai/research/'],['仕事','/ai/agents/'],['開発','/ai/coding/']],cells:['相談・文章・ファイル','Deep Research','画像生成・プラン別条件','このガイドでは未確認','このガイドでは未確認','音声、Work・Dots・Codexは条件別']},
 {id:'claude',name:'Claude',mark:'Cl',theme:'clay',lead:'文章と資料を、形にする。',fit:'文章を推敲し、資料やコードの成果物へつなげたい。',tags:['文章・資料','Artifacts・Code'],tradeoff:'Claude CodeやDuetの条件は別。Duetは日本向け提供の案内がありません。',website:'https://claude.ai/',related:[['文章','/ai/chat/'],['資料調査','/ai/research/'],['開発','/ai/coding/']],cells:['文章・資料・Artifacts','Web検索・連携条件','制作機能ごとに確認','制作機能ごとに確認','このガイドでは未確認','アプリ連携・Code、Duetは米国向け']},
 {id:'grok',name:'Grok',mark:'Gr',theme:'ink',lead:'Xの話題を、検索から創作へ。',fit:'XとWebを調べ、画像や短い動画づくりにも使いたい。',tags:['Web・X検索','Imagine'],tradeoff:'投稿の内容は根拠を確認。新規契約と既存SuperGrokで料金体系が違います。',website:'https://grok.com/',related:[['調査','/ai/research/'],['画像','/ai/images/'],['動画','/ai/video/']],cells:['相談・文書・ファイル分析','Web・Xを検索','Imagine・生成／編集','Imagine・生成／編集','このガイドでは未確認','音声会話、Build・Botは別入口']},
 {id:'copilot',name:'Copilot',mark:'Co',theme:'violet',lead:'いつものOfficeに、AIを。',fit:'Word・Excelなど、Microsoftのアプリを使う仕事を助けてほしい。',tags:['Microsoft 365','仕事の連携'],tradeoff:'個人と法人の契約は別。PremiumのAI機能は契約者本人だけが利用できます。',website:'https://copilot.microsoft.com/',related:[['文章','/ai/chat/'],['仕事の自動化','/ai/workflow/']],cells:['相談・Microsoft 365連携','接続・契約による','AI画像生成・利用枠あり','このガイドでは未確認','このガイドでは未確認','Office連携・Cowork等は契約条件別']},
 {id:'muse',name:'Muse',mark:'M',theme:'rose',lead:'会話の先の用事まで、任せる。',fit:'調べものや予定など、日々の用事を継続して進めてほしい。',tags:['継続するAI秘書','アプリ連携'],tradeoff:'18歳または成年・Metaアカウント。高度音声などは日本での提供が別案内です。',website:'https://muse.ai/',related:[['ほかのAI秘書','/ai/companions/']],cells:['会話・日々の依頼','ブラウザ・連携先を使う','このガイドでは未確認','このガイドでは未確認','このガイドでは未確認','専用VMで継続・許可したアプリと連携']},
] as const;
export const featured=profiles.map(p=>{
 const entry=entries.find(e=>e.id===p.id);
 if(!entry)throw Error('Missing featured entry: '+p.id);
 return {...p,entry,price:priceEntrances[p.id]};
});
export const featuredAxes=['文章・資料','調べもの','画像を作る','動画を作る','曲を作る','音声・仕事・継続'] as const;
