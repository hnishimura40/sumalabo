import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  scanInternalResidue,
  validatePlainLanguageArticle,
  validatePlannedTermExplanations,
} from "../../scripts/sumahon/plain-language-policy.mjs";

function article({ subject, what, news, relevant, notRelevant, conclusion, detail }) {
  return `
<Summary30>
  <ol>
    <li><strong>これは何？</strong> ${what}</li>
    <li><strong>何があった？</strong> ${news}</li>
    <li><strong>誰に関係ある？</strong> ${relevant}。${notRelevant}は影響が小さいです。</li>
    <li><strong>結局どうなの？</strong> ${conclusion}</li>
  </ol>
</Summary30>

## そもそも${subject}って何？

${what}

## あなたに関係ある？

### 関係がある人
- ${relevant}

### あまり関係がない人
- ${notRelevant}

## 今回何が変わった？
${news}

## 普段の利用では何がうれしい？
${detail}

## 注意点
条件は公式の最新案内で確認します。

## すまラボまとめ
${conclusion}
`;
}

const categoryCases = [
  { name: "Windows", subject: "Windows Update", what: "Windows Updateは、パソコンの不具合や安全上の弱点を直す更新の仕組みです。", news: "再起動の時刻を選びやすくなりました。", relevant: "Windowsパソコンを使う人", notRelevant: "Macだけを使う人", conclusion: "更新は必要ですが、作業前に再起動時刻を確認すれば十分です。", detail: "作業中に急に再起動する困りごとを減らせます。" },
  { name: "iPhone", subject: "eSIM", what: "eSIMは、差し込むカードの代わりにスマホ本体へ通信契約を書き込む仕組みです。", news: "新しいiPhoneで設定手順が短くなりました。", relevant: "iPhoneを乗り換える人", notRelevant: "今の端末を使い続ける人", conclusion: "買い替える人だけ、移行前に通信会社の対応を見れば大丈夫です。", detail: "小さなカードを入れ替えずに回線を移しやすくなります。" },
  { name: "AI", subject: "生成AI", what: "生成AIは、質問に応じて文章や画像のたたき台を作る仕組みです。", news: "回答に使った資料を示す機能が追加されました。", relevant: "仕事や学習でAIを使う人", notRelevant: "AIを使わない人", conclusion: "出典を確認しやすくなりますが、内容の確認は引き続き必要です。", detail: "どの資料を根拠にした回答かをたどりやすくなります。" },
  { name: "家電", subject: "ヒートポンプ", what: "ヒートポンプは、空気中の熱を集めて少ない電気でお湯や暖房に使う仕組みです。", news: "新モデルは低い気温でも効率を保ちやすくなりました。", relevant: "寒い地域で給湯器を買い替える人", notRelevant: "買い替え予定がない人", conclusion: "買い替え時の候補ですが、設置場所と費用を先に確認します。", detail: "冬場の電気使用量を抑えられる可能性があります。" },
  { name: "サブスク", subject: "料金プラン", what: "料金プランは、毎月払う金額と使える機能をまとめた契約の区分です。", news: "来月から一部のプランが値上げされます。", relevant: "対象プランを契約中の人", notRelevant: "無料版だけを使う人", conclusion: "対象者は更新日前に継続するかを確認しましょう。", detail: "使わない機能まで払い続けるのを避けられます。" },
  { name: "行政・制度", subject: "所得控除", what: "所得控除は、税金を計算する前に所得から一定額を差し引ける制度です。", news: "申請できる条件が一部変わりました。", relevant: "今年申告する人", notRelevant: "条件に当てはまらない人", conclusion: "対象かだけ確認し、分からなければ公式窓口へ相談すれば十分です。", detail: "条件に合えば支払う税金が変わる場合があります。" },
];

for (const fixture of categoryCases) {
  test(`${fixture.name}ニュースでも一般読者向け構造が機能する`, () => {
    const result = validatePlainLanguageArticle(article(fixture));
    assert.equal(result.ok, true, result.issues.map((item) => item.message).join("\n"));
  });
}

test("旧Delphi型の専門語だけの30秒欄を不合格にする", () => {
  const old = `<Summary30><ol><li>64-bit IDE、64-bit language server対応</li><li>単一コードベースで4OS</li></ol></Summary30>\n## 無料版が13へ\nIDEが更新されました。`;
  const result = validatePlainLanguageArticle(old);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "summary30_fields_missing"));
  assert.ok(result.issues.some((item) => item.code === "subject_definition_missing"));
});

test("読者翻訳設計の専門語を初出説明へ結び付ける", () => {
  const plan = `## 読者翻訳設計\n- IDE → プログラムを書くための作業ソフト\n- language server → 入力補完やエラーチェックを裏側で助ける仕組み`;
  const good = `プログラムを書くための作業ソフト（IDE）が新しくなりました。入力補完やエラーチェックを裏側で助ける仕組み（language server）も更新されました。`;
  assert.equal(validatePlannedTermExplanations(good, plan).issues.length, 0);
  const bad = `64-bit IDEとlanguage serverが更新されました。`;
  assert.equal(validatePlannedTermExplanations(bad, plan).issues.filter((item) => item.code === "jargon_first_use_unexplained").length, 2);
});

test("内部工程の文脈だけを検出し、正当なsystem/prompt/veto記事は誤検出しない", () => {
  const leaks = `図のポイント（コピー可能）\nスカウト元の見出しではこうです。\nこの記事の自動公開を停止してください。`;
  assert.equal(scanInternalResidue(leaks).length, 3);
  const legitimate = `新しいOSのsystem設定を紹介します。AIへ渡すプロンプトの書き方も変わりました。大統領のveto（拒否権）がニュースになりました。`;
  assert.deepEqual(scanInternalResidue(legitimate), []);
});

test("公開レイアウトは編集用veto部品を無条件表示しない", () => {
  const layout = readFileSync(new URL("../../src/layouts/ArticleLayout.astro", import.meta.url), "utf8");
  const component = readFileSync(new URL("../../src/components/PreviewVetoButton.astro", import.meta.url), "utf8");
  const productionDeploy = readFileSync(new URL("../../scripts/automation/deploy-production-from-main.mjs", import.meta.url), "utf8");
  assert.match(component, /SUMALABO_BUILD_TARGET/);
  assert.match(component, /isPreviewBuild/);
  assert.doesNotMatch(component, /\{!isMainBuild\s*&&/);
  assert.match(layout, /PreviewVetoButton/);
  assert.match(productionDeploy, /SUMALABO_BUILD_TARGET:\s*"production"/);
});
