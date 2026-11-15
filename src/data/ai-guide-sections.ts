import {entries, type Entry} from './ai-comparison';

type Axis={label:string; key:'distinction'|'purpose'|'openness'|'automation'|'research'|'files'|'code'|'image'|'video'|'music'|'voice';};
export type GuideSection={slug:string; title:string; shortTitle:string; group:'choose'|'create'|'build'; description:string; question:string; note:string; ids:string[]; axes:Axis[];};
export const guideSections:GuideSection[]=[
 {slug:'chat',title:'チャット・文章のAI比較',shortTitle:'相談・文章',group:'choose',description:'質問、文章の推敲、考えの整理。まず日常で使うAIを選ぶ。',question:'普段の相談や文章作りに、どれを使う？',note:'無料枠から同じ文章を試し、追加契約が必要かを判断しましょう。作業を継続する秘書や開発専用ツールは別の分類で比べます。',ids:['chatgpt','gemini','claude','grok','copilot'],axes:[{label:'特徴・選ぶ理由',key:'distinction'},{label:'資料・ファイル',key:'files'}]},
 {slug:'research',title:'検索・資料調査のAI比較',shortTitle:'検索・資料調査',group:'choose',description:'Webの出典をたどる、自分の資料を読む、根拠をまとめる。',question:'Webを調べたい？ 手元の資料を読みたい？',note:'検索結果に出典があることと、回答の各主張がその出典に支えられることは別です。資料の動画要約と、動画の生成も区別します。',ids:['perplexity','notebook','chatgpt','gemini','claude','grok'],axes:[{label:'調査のしかた',key:'research'},{label:'資料の扱い',key:'files'}]},
 {slug:'agents',title:'作業エージェントのAI比較',shortTitle:'仕事を任せる',group:'choose',description:'調査から資料・Webの制作まで、複数の手順を進めてもらう。',question:'回答の先まで、どんな作業を任せたい？',note:'この分類は依頼した仕事を実行するサービスです。会話を閉じた後も日々の用事を続ける秘書は、次の分類で比べます。',ids:['chatgpt-work','manus','perplexity-computer'],axes:[{label:'進められる仕事',key:'distinction'},{label:'作業の実行',key:'automation'}]},
 {slug:'companions',title:'常時動くAI秘書の比較',shortTitle:'常時動くAI秘書',group:'choose',description:'Dots・Muse・Duetなど。継続、記憶、権限、日本で使える条件。',question:'会話していない間も、仕事を続けてほしい？',note:'クラウドで動く秘書と、自分で運用するOpenClawを区別します。地域・段階提供・端末の起動条件・連携権限・利用枠を確認してください。',ids:['dots','muse','duet','openclaw'],axes:[{label:'動く場所・仕事の続け方',key:'distinction'},{label:'実行・連携',key:'automation'}]},
 {slug:'coding',title:'開発エージェントのAI比較',shortTitle:'コード・開発',group:'choose',description:'コード変更、テスト、確認。開発の作業環境から選ぶ。',question:'開発のどの作業を、一緒に進めたい？',note:'コードの提案だけでなく、変更・テスト・確認までの仕組みを比べます。ローカルでコマンドを実行しても、モデルの推論はクラウドの場合があります。',ids:['codex','claude-code','cursor'],axes:[{label:'開発環境・特徴',key:'distinction'},{label:'コード・実行',key:'code'}]},
 {slug:'images',title:'画像生成AIの比較',shortTitle:'画像を作る',group:'create',description:'画像の生成・編集、参照画像、文字やキャラクターの扱い。',question:'一枚の画像を、どう作り込みたい？',note:'ここは画像を生成・編集する機能の比較です。画像を読み取れるだけのモデルを画像生成AIとして数えません。自分のGPUで組む場合はローカル実行の分類へ。',ids:['gemini','grok','midjourney','runway','elevenlabs'],axes:[{label:'画像の機能',key:'image'},{label:'制作サービスの特徴',key:'distinction'}]},
 {slug:'video',title:'動画生成AIの比較',shortTitle:'動画を作る',group:'create',description:'動画の生成・編集、参照素材、音声、尺・画質の条件。',question:'素材を動かす？ 編集する？ 音声も作る？',note:'同じ「動画対応」でも、尺・画質・音声・参照入力・クレジット消費が異なります。Gemini Notebookの資料の動画要約は、この映像生成の分類に含めません。',ids:['gemini','runway','midjourney','elevenlabs'],axes:[{label:'動画の機能',key:'video'},{label:'制作サービスの特徴',key:'distinction'}]},
 {slug:'music',title:'音楽生成AIの比較',shortTitle:'曲・BGMを作る',group:'create',description:'歌入りの曲、インスト、編集、ダウンロードと商用条件。',question:'歌を作る？ BGMを作る？ 公開して使う？',note:'音声で会話できることと、曲を生成できることは別です。無料時と有料時の商用条件、制作時点の契約、ダウンロード枠を確認しましょう。',ids:['suno','gemini','elevenlabs','runway'],axes:[{label:'楽曲の生成',key:'music'},{label:'制作サービスの特徴',key:'distinction'}]},
 {slug:'voice',title:'音声・会話AIの比較',shortTitle:'音声・ナレーション',group:'create',description:'声で話す、読み上げる、吹き替える。使い道の違いを見る。',question:'会話がしたい？ 公開する音声を作りたい？',note:'ChatGPTやGeminiの音声会話と、ElevenLabsの読み上げ・吹き替え等は目的が違います。音声複製は本人の権利・同意を確認してください。',ids:['elevenlabs','chatgpt','gemini'],axes:[{label:'音声の用途',key:'voice'},{label:'サービスの特徴',key:'distinction'}]},
 {slug:'local',title:'ローカルAI実行ツールの比較',shortTitle:'自分のPCで動かす',group:'build',description:'Ollama・LM Studio・ComfyUI。動かす道具とモデルを分けて選ぶ。',question:'モデルを動かす道具は、どれが合う？',note:'この分類は実行ツールの比較です。選ぶモデルの重み・ライセンス・必要メモリーは「公開モデル」で別に確認します。クラウドや外部APIを使う機能もあります。',ids:['ollama','lmstudio','comfyui'],axes:[{label:'道具の使い方',key:'distinction'},{label:'公開・運用条件',key:'openness'}]},
 {slug:'workflow',title:'AI業務自動化ツールの比較',shortTitle:'業務をつなぐ',group:'build',description:'n8n・Dify。社内資料、外部アプリ、モデルを手順につなぐ。',question:'複数のアプリや社内資料を、どうつなぐ？',note:'クラウド契約の料金と、自己ホストの運用費・モデルAPI料金を分けます。ソースが公開されていても、再提供や商用利用の条件は製品ごとに違います。',ids:['n8n','dify'],axes:[{label:'組める仕組み',key:'distinction'},{label:'公開・運用条件',key:'openness'}]},
 {slug:'models',title:'公開モデル・開発国の比較',shortTitle:'公開モデルを選ぶ',group:'build',description:'正式モデル、規模、文脈長、開発国、ライセンスを見比べる。',question:'使う頭脳を、具体的なモデルから選ぶ。',note:'サービスの契約と、モデルの公開条件は別です。モデルの国・地域は、APIの処理先やデータ保存先を保証しません。',ids:entries.filter(e=>e.kind==='モデル群').map(e=>e.id),axes:[]},
];
export const sectionGroups=[{id:'choose',title:'話す・調べる・仕事を進める',description:'普段の相談から、作業を任せるAIまで。'},{id:'create',title:'画像・動画・音楽を作る',description:'作りたいものから、生成機能を比べる。'},{id:'build',title:'自分の環境に組み込む',description:'動かす道具と、選ぶモデルを分けて考える。'}] as const;
export const priceEntrances:Record<string,string>={
 'grok':'無料／Plus $8/月（税別）','chatgpt':'無料／Plus $20/月','gemini':'無料／AI Plus ¥725/月','claude':'無料／Pro $20/月','copilot':'無料／Premium ¥3,200/月（税込）','perplexity':'無料／Pro $20/月','notebook':'無料枠／Google AIプランに枠を包含','chatgpt-work':'ChatGPTの利用枠と共有','manus':'無料／Pro $20/月〜','perplexity-computer':'Pro $20/月〜／クレジット制','dots':'対象Pro $100/月〜／段階提供','muse':'無料上限／Power $20/月','duet':'米国Pro $20/月〜／日本対象外','openclaw':'本体料$0／機材・API等は別','codex':'無料から枠あり／ChatGPTと共有','claude-code':'Pro $20/月〜／Claudeと枠共有','cursor':'無料／Plus $8/月（Grokのみ）','suno':'無料／Pro $10/月','runway':'無料／Standard $15/月','midjourney':'Basic $10/月〜','elevenlabs':'無料／Starter通常$6/月','ollama':'ローカル本体料$0／Cloud別','lmstudio':'無料／Bionic+ $20/月','comfyui':'本体料$0／Cloud $20/月〜','n8n':'自己ホスト条件内$0／Cloud年払月相当€20〜','dify':'Cloud無料枠／Pro年額$590・workspace',
};
export function sectionEntries(section:GuideSection):Entry[]{return section.ids.map(id=>{const e=entries.find(e=>e.id===id);if(!e)throw Error(`Unknown AI entry: ${id}`);return e;});}
const featureNotes:Record<string,Record<string,string>>={
 images:{gemini:'Nano Banana 2は無料枠、2.1は有料AIプラン。参照画像の合成・編集・文字・キャラクター一貫性・2Kを公式案内。'},
 video:{gemini:'アプリ案内はOmni 1.1 Flash。10秒・音声同時生成・写真最大5枚・動画編集と延長。有料AIプラン・18歳以上・地域条件。'},
 music:{gemini:'Lyria 3.5。文章・写真から歌入り／インストを選び最大3分。18歳以上、アプリ提供国。商用条件は別確認。'},
};
export function axisText(e:Entry,axis:Axis,sectionSlug?:string):string {
 const note=sectionSlug&&featureNotes[sectionSlug]?.[e.id];
 if(note&&['image','video','music'].includes(axis.key))return note;
 return axis.key in e.features?e.features[axis.key as keyof Entry['features']]||'未確認':String(e[axis.key as keyof Entry]||'未確認');
}
export const japanLabels:Record<string,string>={available:'日本提供の根拠あり',conditional:'機能・契約条件あり',unavailable:'日本は対象外の案内',local:'自己運用・構成次第'};
const aliases:Record<string,string>={chatgpt:'チャットGPT チャットジーピーティー',gemini:'ジェミニ',claude:'クロード',grok:'グロック グローク',copilot:'コパイロット 子パイロット',dots:'ドッツ',muse:'ミューズ',manus:'マナス',codex:'コーデックス',ollama:'オラマ',suno:'スノ スーノ'};
export const entrySearchTerms=(e:Entry)=>[e.name,e.provider,aliases[e.id]||''];
