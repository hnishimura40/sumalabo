
import Summary30 from "../../src/components/article/Summary30.astro";
import Callout from "../../src/components/article/Callout.astro";
import CharacterBubble from "../../src/components/article/CharacterBubble.astro";
import CharacterDialogue from "../../src/components/characters/CharacterDialogue.astro";
import MobileCarrierCTA from "../../src/components/article/MobileCarrierCTA.astro";
import ComparisonTable from "../../src/components/article/ComparisonTable.astro";

携帯キャンペーンとは、回線の契約や乗り換えなど、決められた条件を満たすとポイントや料金割引を受けられる仕組みです。今使っている会社や契約方法によって対象が変わるので、早見表で候補を探し、気になる特典の条件を確認してください。

<Summary30>
  <ol>
    <li><strong>これは何？</strong>携帯会社の特典を、対象者・申込期限・必要な手続きで比べるガイドです。</li>
    <li><strong>何があった？</strong>キャンペーンは各項目の公式確認日を見てください。通常料金の比較表は8月4日時点の情報です。</li>
    <li><strong>誰に関係ある？</strong>容量が余る人、毎月の回線料金が気になる人、乗り換え時の特典と条件を比べたい人です。</li>
    <li><strong>結局どうなの？</strong>先に実使用量・通話・サポートで候補を決め、その中で自分が受け取れる特典を比べましょう。</li>
  </ol>
</Summary30>

**関係がある人**：毎月の容量が余る人、料金に不満がある人、特典を含めて乗り換え先を選びたい人。

**あまり関係がない人**：今の料金・容量・つながり方に満足している人。特典だけを理由に急いで乗り換える必要はありません。

早見表では、MNP（電話番号を変えずに携帯会社を乗り換える手続き）と、新しい番号での契約を分けています。PayPayポイント（PayPayの支払いなどに使う特典）は現金と異なり、受取手続きと期限も確認が必要です。

<CharacterDialogue
  image="/images/characters/duo_talk_half.webp"
  lines={[
    { speaker: "ひまり", text: "2万ポイントって書いてあるけど、私も受け取れるの？" },
    { speaker: "らぼまる", text: "まず契約方法を選んで、対象と条件の列を見よう。特典額と毎月の支払いを一緒に比べると選びやすいよ。" },
  ]}
/>

{/* mobile-campaigns:start */}
<section class="mobile-campaigns" aria-labelledby="mobile-campaigns" data-campaign-version="d136bac2d459f1f05d54e768">
<h2 id="mobile-campaigns">携帯キャンペーンの早見表</h2>
<p>自分の契約方法を選び、特典と必要な条件を比べてください。MNPは、電話番号を変えずに携帯会社を乗り換える手続きです。ポイントの有効期限や受取操作は「条件・受取方法」で確認できます。</p>
<div class="campaign-filters" hidden>
<fieldset><legend>契約方法で絞る</legend><div class="campaign-options"><button type="button" data-audience-filter="all" aria-pressed="true">すべて</button><button type="button" data-audience-filter="mnp" aria-pressed="false">他社から乗り換え</button><button type="button" data-audience-filter="new" aria-pressed="false">新しい番号</button><button type="button" data-audience-filter="return" aria-pressed="false">以前使った会社に戻る</button></div></fieldset>
<div class="campaign-carrier-label"><label for="campaign-carrier">携帯会社</label><select id="campaign-carrier" data-carrier-filter><option value="all">すべての会社</option><option value="linemo">LINEMO</option><option value="ahamo">ahamo</option><option value="povo">povo</option><option value="rakuten">楽天モバイル</option><option value="uq">UQ mobile</option><option value="ymobile">Y!mobile</option><option value="au">au</option><option value="softbank">ソフトバンク</option><option value="iijmio">IIJmio</option><option value="mineo">mineo</option></select></div>
<p class="campaign-count" role="status" aria-live="polite">25件を表示</p>
</div>
<p class="campaign-filter-note">移行元・年齢・過去の特典利用などで対象外になる場合があります。最大額だけで決めず、月額料金と手数料も確認してください。</p>
<table class="campaign-table"><caption>開催中の携帯キャンペーン比較</caption><thead><tr><th scope="col">携帯会社・特典名</th><th scope="col">特典</th><th scope="col">対象</th><th scope="col">申込期限</th><th scope="col">先に確認する条件</th></tr></thead><tbody><tr data-carrier="linemo" data-audiences="mnp new"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">初回・ベストプランV増額</span><a href="#offer-linemo-standard-v-20261116">条件・受取方法へ</a></th><td data-label="特典"><strong>MNP20,000円相当／新規14,000円相当のPayPayポイント</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">12月6日まで</td><td data-label="先に確認する条件">初回利用。翌月末開通、Vの金額は6カ月後判定までのプラン条件。手数料割引は別条件</td></tr>
<tr data-carrier="linemo" data-audiences="mnp new"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">初回・ベストプラン増額</span><a href="#offer-linemo-standard-best-20261116">条件・受取方法へ</a></th><td data-label="特典"><strong>MNP14,000円相当／新規7,000円相当のPayPayポイント</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">12月6日まで</td><td data-label="先に確認する条件">初回利用。翌月末までに開通、紹介リンクのポイントとは併用不可</td></tr>
<tr data-carrier="linemo" data-audiences="mnp return"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">再契約MNP・おかえり増額</span><a href="#offer-linemo-return-standard-20261116">条件・受取方法へ</a></th><td data-label="特典"><strong>V14,000円相当／ベスト6,000円相当のPayPayポイント</strong></td><td data-label="対象"><span>他社から乗り換え・以前使った会社に戻る</span></td><td data-label="申込期限">12月6日まで</td><td data-label="先に確認する条件">専用ページからMNP。過去利用者も対象。Vは6カ月後判定までプラン条件</td></tr>
<tr data-carrier="linemo" data-audiences="mnp new"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">紹介専用リンク・ポイント継続</span><a href="#offer-linemo-referral-standard-20261123">条件・受取方法へ</a></th><td data-label="特典"><strong>MNP14,000円相当／新規10,000円相当のPayPayポイント</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">ポイント終了日未定</td><td data-label="先に確認する条件">初回利用、専用URL必須。今回の増額・手数料割引とは併用不可</td></tr>
<tr data-carrier="linemo" data-audiences="mnp"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">ソフトバンクなどから移行</span><a href="#offer-linemo-fee-migration-20261123">条件・受取方法へ</a></th><td data-label="特典"><strong>事務手数料3,850円分の請求割引（ポイント対象外）</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">12月6日まで</td><td data-label="先に確認する条件">翌月末開通＋開通月末までの専用エントリー必須。反映月は要確認</td></tr>
<tr data-carrier="linemo" data-audiences="mnp new return"><th scope="row"><span class="campaign-company">LINEMO</span><span class="campaign-row-label">有料オプション・既存利用者も</span><a href="#offer-linemo-appleone-points-20261118">条件・受取方法へ</a></th><td data-label="特典"><strong>初回24カ月：税抜料金の10％（通常122ポイント／月）</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号・以前使った会社に戻る</span></td><td data-label="申込期限">11/18開始・終了日未定</td><td data-label="先に確認する条件">Apple One月1,350円が別途。利用登録とPayPay連携が必要</td></tr>
<tr data-carrier="ahamo" data-audiences="mnp"><th scope="row"><span class="campaign-company">ahamo</span><span class="campaign-row-label">SIMのみ乗り換え</span><a href="#offer-ahamo-dpoint-ah00004">条件・受取方法へ</a></th><td data-label="特典"><strong>dポイント20,000ポイント（4,000×5回）</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">端末購入なし。同じdアカウントで開通の前月か当月にエントリー</td></tr>
<tr data-carrier="ahamo" data-audiences="return"><th scope="row"><span class="campaign-company">ahamo</span><span class="campaign-row-label">おかえり・再契約</span><a href="#offer-ahamo-return-ah00057">条件・受取方法へ</a></th><td data-label="特典"><strong>dポイント10,000（2,000×5回）</strong></td><td data-label="対象"><span>以前使った会社に戻る</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">過去の対象SIM乗り換え実績・ドコモ提供プラン解約から2年、SIMのみで再び他社から乗り換え</td></tr>
<tr data-carrier="ahamo" data-audiences="mnp"><th scope="row"><span class="campaign-company">ahamo</span><span class="campaign-row-label">iPhone 16（128GB）購入</span><a href="#offer-ahamo-iphone16-ah00089-20261120">条件・受取方法へ</a></th><td data-label="特典"><strong>dポイント10,000（後日・有効3カ月）</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">2027/1/11まで</td><td data-label="先に確認する条件">他社からの乗り換えと同時購入。期限内に開通。端末代別</td></tr>
<tr data-carrier="povo" data-audiences="mnp"><th scope="row"><span class="campaign-company">povo</span><span class="campaign-row-label">本気割</span><a href="#offer-povo-honkivari-202505">条件・受取方法へ</a></th><td data-label="特典"><strong>対象年間データ代の50％相当をau PAY残高に還元</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">年間分を先払い。開通7日後までの対象購入とau ID連携が必要</td></tr>
<tr data-carrier="povo" data-audiences="mnp new return"><th scope="row"><span class="campaign-company">povo</span><span class="campaign-row-label">データ増量祭・既存利用者も</span><a href="#offer-povo-data-increase-20261126">条件・受取方法へ</a></th><td data-label="特典"><strong>年額データ＋3／＋5／＋15GB</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号・以前使った会社に戻る</span></td><td data-label="申込期限">11/30 23:59まで</td><td data-label="先に確認する条件">例：375GBを26,400円で一括購入。増量対象を選択。本気割の還元は別条件</td></tr>
<tr data-carrier="rakuten" data-audiences="mnp new"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">楽天カード会員・初回契約</span><a href="#offer-rakuten-card-3452-20261120">条件・受取方法へ</a></th><td data-label="特典"><strong>回線契約分20,000楽天ポイント（分割）</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">Web12/21 10時／店頭12/20閉店</td><td data-label="先に確認する条件">12月末に有効な対象カード・同じ楽天ID。専用経路とクーポン、開通・指定通話</td></tr>
<tr data-carrier="rakuten" data-audiences="mnp"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">通常の初回乗り換え</span><a href="#offer-rakuten-mnp-2091-202610">条件・受取方法へ</a></th><td data-label="特典"><strong>楽天ポイント10,000ポイント（分割）</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">初回利用。Webは申込前エントリーと指定通話。毎回受取が必要</td></tr>
<tr data-carrier="rakuten" data-audiences="mnp"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">対象Galaxy購入＋初回MNP</span><a href="#offer-rakuten-galaxy-3303-20261126">条件・受取方法へ</a></th><td data-label="特典"><strong>楽天ポイント最大28,000（3企画の合計）</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">Web1/8 8:59／店頭1/7閉店</td><td data-label="先に確認する条件">最大額はZ Flip8／Fold8／Fold8 Ultra。対象プラン、開通後の指定通話が必要</td></tr>
<tr data-carrier="rakuten" data-audiences="new"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">通常の初回・新規番号</span><a href="#offer-rakuten-new-2142-202610">条件・受取方法へ</a></th><td data-label="特典"><strong>楽天ポイント9,000ポイント（分割）</strong></td><td data-label="対象"><span>新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">初回利用。Webは申込前エントリー、翌月末までの開通と指定通話</td></tr>
<tr data-carrier="rakuten" data-audiences="mnp new"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">紹介を受けて初回契約</span><a href="#offer-rakuten-referral-1784-202609">条件・受取方法へ</a></th><td data-label="特典"><strong>MNP 13,000／新規12,000楽天ポイント</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">初回利用。公式の紹介URL・QRから申込前ログイン。開通・指定通話と端末特価の併用条件を確認</td></tr>
<tr data-carrier="rakuten" data-audiences="mnp return"><th scope="row"><span class="campaign-company">楽天モバイル</span><span class="campaign-row-label">ただいまキャンペーン</span><a href="#offer-rakuten-return-2207">条件・受取方法へ</a></th><td data-label="特典"><strong>楽天ポイント2,162ポイント（1,081×2回）</strong></td><td data-label="対象"><span>他社から乗り換え・以前使った会社に戻る</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">解約から2カ月超。他社から番号を戻し、クーポンと指定通話</td></tr>
<tr data-carrier="uq" data-audiences="mnp"><th scope="row"><span class="campaign-company">UQ mobile</span><span class="campaign-row-label">オンライン・SIMのみ</span><a href="#offer-uq-sim-debut-20260917">条件・受取方法へ</a></th><td data-label="特典"><strong>au PAY残高20,000円相当</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">au・povoからは対象外。対象プランと増量オプションⅡ同時加入</td></tr>
<tr data-carrier="uq" data-audiences="mnp"><th scope="row"><span class="campaign-company">UQ mobile</span><span class="campaign-row-label">SIMのみ・手数料相当クーポン</span><a href="#offer-uq-fee-coupon-20261120">条件・受取方法へ</a></th><td data-label="特典"><strong>3,850円相当を後日の請求から減算</strong></td><td data-label="対象"><span>他社から乗り換え</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">公式6桁クーポン必須。20,000円相当の残高還元は別条件。povoは確認待ち</td></tr>
<tr data-carrier="ymobile" data-audiences="mnp new"><th scope="row"><span class="campaign-company">Y!mobile</span><span class="campaign-row-label">SIM契約キャンペーン5</span><a href="#offer-ymobile-sim-5-20261102">条件・受取方法へ</a></th><td data-label="特典"><strong>MNPはS 5,000／M・L 15,000円相当のPayPayポイント</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">新規M・Lは5,000円相当、5～18歳は別途増額。増量オプション必須</td></tr>
<tr data-carrier="au" data-audiences="mnp new"><th scope="row"><span class="campaign-company">au</span><span class="campaign-row-label">オンライン・SIMデビュー</span><a href="#offer-au-sim-debut-20260917">条件・受取方法へ</a></th><td data-label="特典"><strong>MNP 20,000／新規10,000円相当のau PAY残高</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">UQ・povoからは対象外。対象プランとau PAY設定。5～12歳の新規は20,000円相当</td></tr>
<tr data-carrier="softbank" data-audiences="mnp new"><th scope="row"><span class="campaign-company">ソフトバンク</span><span class="campaign-row-label">専用ページ・SIMのみ</span><a href="#offer-softbank-sim-paypay-202606">条件・受取方法へ</a></th><td data-label="特典"><strong>PayPayポイント12,000円相当</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">対象プラン・専用Web経由とPayPay連携。同系列からの移行は対象外</td></tr>
<tr data-carrier="iijmio" data-audiences="mnp new"><th scope="row"><span class="campaign-company">IIJmio</span><span class="campaign-row-label">音声ギガプラン半額</span><a href="#offer-iijmio-gigaplan-half-20261105">条件・受取方法へ</a></th><td data-label="特典"><strong>15GBなら月800円・最大20GB（最大3カ月）</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">終了日未定</td><td data-label="先に確認する条件">対象の音声SIM。申込時の容量を維持、初月日割り・終了後は通常料金</td></tr>
<tr data-carrier="mineo" data-audiences="mnp new"><th scope="row"><span class="campaign-company">mineo</span><span class="campaign-row-label">秋のピッタリ割</span><a href="#offer-mineo-autumn-fit-20260917">条件・受取方法へ</a></th><td data-label="特典"><strong>音声7・15GBは月990円など（最大6カ月）</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号</span></td><td data-label="申込期限">11月30日まで</td><td data-label="先に確認する条件">音声マイピタ。申込承諾は12月末まで、終了後は通常料金</td></tr>
<tr data-carrier="mineo" data-audiences="mnp new return"><th scope="row"><span class="campaign-company">mineo</span><span class="campaign-row-label">motorola 5機種・既存利用者も</span><a href="#offer-mineo-motorola-gift-20261126">条件・受取方法へ</a></th><td data-label="特典"><strong>交換式ギフト1,000〜10,000円分</strong></td><td data-label="対象"><span>他社から乗り換え・新しい番号・以前使った会社に戻る</span></td><td data-label="申込期限">12/27申込、1/31承諾まで</td><td data-label="先に確認する条件">mineoで対象端末を購入。最大はrazr 60。お試し200MBは対象外</td></tr></tbody></table>
<p class="campaign-empty" hidden>この組み合わせの掲載特典はありません。契約方法か携帯会社を変えてください。</p>
<h3 id="campaign-details">キャンペーンごとの詳しい条件</h3>
<p>気になる特典を開くと、対象外の条件、月額料金、受取時期と公式の出典を確認できます。</p>
<div class="campaign-detail-list">

<details class="campaign-offer" id="offer-linemo-standard-v-20261116" data-campaign-id="linemo-standard-v-20261116" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">12月6日まで：初回VはMNP20,000／新規14,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>毎月30GBと短い国内通話が必要で、受取までの期間とプラン条件を満たせる人。ポイントのためだけの高いプラン選択は勧めません。</dd></div>
<div><dt>特典</dt><dd>ベストプランVは他社MNPでPayPayポイント20,000円相当、新しい番号で14,000円相当。通常12,000／6,000円相当に週替わり8,000円相当を加えた合計です。別途、条件を満たすと手数料3,850円分の請求割引。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを使う人が、他社から番号を引き継ぐか、新しい番号で契約する場合。</dd></div>
<div><dt>必須条件</dt><dd>11月23日〜12月6日に初回契約を申し込み、申込月の翌月末までに開通。開通月の6カ月後の判定月まで、一度でもVから別プランへ変更した場合はベストプランの特典額になります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行は対象外。過去にLINEMOを申し込み開通した人、8日間キャンセル、特典判定前の譲渡も対象外。紹介など他のポイント特典とは併用できません。通常特典は同一名義の1回線目が対象です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式の11月23日開始の増額ページからベストプランVを選び、現在の携帯会社と適用キャンペーンを確認。紹介リンク経由とは別ルートです。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬にMy Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にチャージ。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
<div><dt>申込期限</dt><dd>増額と手数料割引の対象申込は2026年11月23日〜12月6日。開通は申込月の翌月末まで。通常ポイント企画全体の終了ではありません。</dd></div>
<div><dt>月額料金</dt><dd>税込2,970円／月・30GB。1回5分以内の国内通話付き。一部番号・超過通話は別料金。</dd></div>
<div><dt>手数料</dt><dd>11月23日〜12月6日の対象申込は、別の手数料割引条件も満たすと契約事務手数料3,850円分を請求から割引。ポイントと別の請求割引です。</dd></div>
<div><dt>注意点</dt><dd>ポイントは出金・譲渡不可。紹介特典や他の対象外ポイント企画とは併用できません。旧基本料2カ月0円の受付は11月22日で終了。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/syukakusai_1123.pdf?20261123" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/activationfee-free_202611.pdf?20261123" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/campaign/paypaycpn_2025/pdf/paypaycpn_2025.pdf?20260715" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-standard-best-20261116" data-campaign-id="linemo-standard-best-20261116" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">12月6日まで：初回ベストはMNP14,000／新規7,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>毎月のデータが3～10GBに収まり、オンライン手続きとポイント受取の管理ができる人。</dd></div>
<div><dt>特典</dt><dd>ベストプランは他社MNPでPayPayポイント14,000円相当、新しい番号で7,000円相当。通常10,000／3,000円相当に週替わり4,000円相当を加えた合計です。別途、条件を満たすと手数料3,850円分の請求割引。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを使う人が、他社から番号を引き継ぐか、新しい番号で契約する場合。</dd></div>
<div><dt>必須条件</dt><dd>11月23日〜12月6日に初回の他社MNPまたは新しい番号で申し込み、申込月の翌月末までに開通。同一名義の複数回線は通常ポイントの原則1回線目が対象です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行は対象外。過去にLINEMOを申し込み開通した人、8日間キャンセル、特典判定前の譲渡も対象外。紹介など他のポイント特典とは併用できません。通常特典は同一名義の1回線目が対象です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式の11月23日開始の増額ページからベストプランを選び、現在の携帯会社と適用キャンペーンを確認。紹介リンク経由とは別ルートです。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬にMy Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にチャージ。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
<div><dt>申込期限</dt><dd>増額と手数料割引の対象申込は2026年11月23日〜12月6日。開通は申込月の翌月末まで。通常ポイント企画全体の終了ではありません。</dd></div>
<div><dt>月額料金</dt><dd>税込990円／月（3GBまで）、3GB超～10GBは税込2,090円／月。国内通話は22円／30秒など別料金。</dd></div>
<div><dt>手数料</dt><dd>11月23日〜12月6日の対象申込は、別の手数料割引条件も満たすと契約事務手数料3,850円分を請求から割引。ポイントと別の請求割引です。</dd></div>
<div><dt>注意点</dt><dd>ポイントは出金・譲渡不可。紹介専用リンクの新規10,000円相当とは併用できません。紹介ルートは今回の手数料割引の対象外なので、ポイント額だけで選ばず支払額を比較してください。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/syukakusai_1123.pdf?20261123" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/activationfee-free_202611.pdf?20261123" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/campaign/paypaycpn_2025/pdf/paypaycpn_2025.pdf?20260715" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-return-standard-20261116" data-campaign-id="linemo-return-standard-20261116" data-carrier="linemo" data-audiences="mnp return">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">12月6日まで：再契約のMNPはV14,000／ベスト6,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>以前LINEMOを使っていて、今の他社回線から同じ番号で戻りたい人。</dd></div>
<div><dt>特典</dt><dd>専用ページからの他社MNPで、VはPayPayポイント14,000円相当、ベストプランは6,000円相当。通常6,000／2,000円相当に週替わり8,000／4,000円相当を加えた合計です。別途、条件を満たすと手数料3,850円分の請求割引。</dd></div>
<div><dt>対象者</dt><dd>過去にLINEMOを利用したことがあり、現在の他社回線の番号を引き継いでベストプランまたはベストプランVへ申し込む人も対象です。</dd></div>
<div><dt>必須条件</dt><dd>おかえりだモン専用ページを経由し、11月23日〜12月6日に他社MNPで申し込み、翌月末までに開通。Vから判定月までに一度でも別プランへ変更するとベストプラン額になります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での契約と、ソフトバンク・ワイモバイル・LINEモバイルからの移行は対象外。通常の初回ポイントや紹介特典とは併用不可。8日間キャンセル、特典判定前の譲渡なども対象外です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>「LINEMOおかえりだモンキャンペーン」の専用ページから申し込み、利用中の携帯会社を正しく選びます。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬にMy Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にチャージ。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
<div><dt>申込期限</dt><dd>増額と手数料割引の対象申込は2026年11月23日〜12月6日。開通は申込月の翌月末まで。通常ポイント企画全体の終了ではありません。</dd></div>
<div><dt>月額料金</dt><dd>ベストプランは3GBまで月990円、3GB超〜10GBは月2,090円。ベストプランVは30GBで月2,970円、1回5分以内の国内通話付き。いずれも税込で、一部通話やオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>11月23日〜12月6日の対象申込は、別の手数料割引条件も満たすと契約事務手数料3,850円分を請求から割引。ポイントと別の請求割引です。</dd></div>
<div><dt>注意点</dt><dd>過去の利用者も対象。初回利用者は初回向け増額ルートを比較してください。紹介ポイントや通常の初回ポイントを重ねてもらう企画ではありません。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/okaeridamon/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/okaeridamon/pdf/okaeridamon_20260715.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/syukakusai_1123.pdf?20261123" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/activationfee-free_202611.pdf?20261123" rel="noopener noreferrer">公式の条件5</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件6</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-referral-standard-20261123" data-campaign-id="linemo-referral-standard-20261123" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">紹介専用リンク：初回MNP14,000／新規10,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>紹介リンクを利用でき、特に小容量プランの新しい番号でポイント額を比べたい人。通常ルートの7,000円相当と手数料割引、紹介ルートの10,000円相当と手数料3,850円を、支払額・受取時期ごとに比べてください。</dd></div>
<div><dt>特典</dt><dd>紹介された人の初回利用は、他社MNP14,000円相当、新しい番号10,000円相当のPayPayポイント。紹介者の6,000円相当は別の人への特典で、ここへ合算しません。</dd></div>
<div><dt>対象者</dt><dd>紹介者から専用申込リンクを受け取り、初めてLINEMOを使う人。ベストプラン・Vのどちらも同じ紹介ポイント額です。</dd></div>
<div><dt>必須条件</dt><dd>紹介者が発行した専用URLから申し込み、申込月の翌月末までに開通。同一名義の複数回線では原則1回線目が対象。過去にLINEMOを申し込み利用開始した人は対象外です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行、過去利用者、8日間キャンセル、判定前の譲渡は対象外。11月23日開始の増額および手数料割引とは併用不可。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>紹介者から受け取った専用申込URLを開き、そのまま申し込みます。通常の増額ページからの申込とは分けてください。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬にMy Menu登録メールへPayPayギフトカードを送付予定。受取日を含め30日以内にPayPayへチャージします。</dd></div>
<div><dt>申込期限</dt><dd>紹介ポイント企画は終了日未定。11月22日までの手数料割引は終了し、今回の増額・手数料割引とも併用不可。</dd></div>
<div><dt>月額料金</dt><dd>ベストプランは3GBまで月990円、3GB超〜10GBは月2,090円。ベストプランVは30GBで月2,970円、1回5分以内の国内通話付き。いずれも税込で、一部通話やオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料3,850円。紹介経由の手数料割引は11月22日申込分までで、今回の11月23日開始の手数料割引も紹介とは併用できません。</dd></div>
<div><dt>注意点</dt><dd>以前から実施している紹介ポイントの継続案内です。新規開始・手数料無料として案内しません。Cookieを無効にした申込は対象外となるため、専用URLから推奨ブラウザで手続きを完了してください。同一メールアドレスを複数契約者で登録すると受取は1名のみです。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/invitation_202407/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/invitation_202407/pdf/invitation_202407.pdf?20261109" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/activationfee-free_202611.pdf?20261123" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-fee-migration-20261123" data-campaign-id="linemo-fee-migration-20261123" data-carrier="linemo" data-audiences="mnp">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">12月6日まで：ソフトバンクなどから移行は手数料相当の請求割引</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからLINEMOへ移る予定があり、ポイント対象外でも契約手数料分の負担を減らしたい人。</dd></div>
<div><dt>特典</dt><dd>契約事務手数料3,850円分の請求割引。ソフトバンク・ワイモバイル・LINEモバイルからの移行は、上記の乗り換えポイント増額の対象ではありません。</dd></div>
<div><dt>対象者</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルから、LINEMOベストプランまたはVへ移行する人。</dd></div>
<div><dt>必須条件</dt><dd>11月23日〜12月6日に対象プランへ申し込み、申込月の翌月末までに開通。事務手数料が発生する契約であること。さらに、開通後、開通月末までに対象回線の電話番号で専用フォームのエントリーを完了してください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>既存LINEMO回線の単なるプラン変更は手数料が発生しないため対象外。紹介ポイント等の併用不可企画、8日間キャンセル、付与までの譲渡も対象外です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式増額・手数料割引ページの移行向け案内から申し込み、開通後に専用フォームでエントリー。エントリー前の申込だけでは条件を満たしません。</dd></div>
<div><dt>受取時期・方法</dt><dd>通信サービスの料金請求から差し引く割引で、PayPayポイントや現金の給付ではありません。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
<div><dt>申込期限</dt><dd>増額と手数料割引の対象申込は2026年11月23日〜12月6日。開通は申込月の翌月末まで。通常ポイント企画全体の終了ではありません。</dd></div>
<div><dt>月額料金</dt><dd>ベストプランは3GBまで月990円、3GB超〜10GBは月2,090円。ベストプランVは30GBで月2,970円、1回5分以内の国内通話付き。いずれも税込で、一部通話やオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>通常の事務手数料3,850円分を、条件を満たした回線の請求から割引。通話料・オプション・基本料まで無料にはなりません。</dd></div>
<div><dt>注意点</dt><dd>ソフトバンクなどからの移行にMNP20,000円相当のポイントが付くと誤認しないでください。手数料割引には開通月末までの追加エントリーが必要です。手数料割引の反映月は、公式ページでは開通月、11月23日作成の提供条件書では開通月の翌月と記載が異なります。反映月を確約せず、申込時に公式窓口や契約書面で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1123/pdf/activationfee-free_202611.pdf?20261123" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-appleone-points-20261118" data-campaign-id="linemo-appleone-points-20261118" data-carrier="linemo" data-audiences="mnp new return">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">有料オプション：Apple Oneの税抜料金にポイント特典</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>既にLINEMOとApple One個人プランを使い、PayPayを利用する人。回線を乗り換えずに申込経路を見直せます。音楽・動画・50GBの保存容量などを実際に使うか、月1,350円に見合うかを先に確認してください。ポイントのためだけに使わない月額サービスを増やす必要はありません。</dd></div>
<div><dt>特典</dt><dd>初回加入は1〜24カ月目に、割引後の税抜月額（消費税を含める前の料金）の10％相当。割引なしの月1,350円なら122ポイント／月。25カ月目以降・同じ回線での再加入は5％相当で、通常61ポイント／月です。PayPayポイントでの付与で、請求の値引きや現金還元ではありません。</dd></div>
<div><dt>対象者</dt><dd>LINEMOの個人名義回線を新たに契約する人・既に利用している人で、回線使用者が13歳以上。Apple One個人プランが対象です。Appleから直接Apple Oneを契約中でも、この経路で初めて加入する場合は対象になります。</dd></div>
<div><dt>必須条件</dt><dd>公式ページ経由でApple Oneを申し込み、加入完了後のSMSからApple Account（Appleのサービスに使うアカウント）で利用登録を行います。対象のiPhone・iPad、対応OSを確認し、対象回線の電話番号とPayPayアカウントを連携してください。未成年のApple Accountは法定代理人の同意が必要です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>法人・13歳未満・ファミリープランは対象外。過去に本特典を受けた回線での再加入は初月から5％相当です。ソフトバンク経由のApple TV・Apple Arcadeを契約中の場合は、その契約の解約と期間満了後に申し込みます。他の企画と併用不可の場合があります。無料月はポイント付与なしですが、24カ月の特典期間には数えられます。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>LINEMO公式のApple One案内から申し込み、届いたSMSで利用登録。ポイント特典は対象のApple One契約が成立すると適用されます。LINEMO回線の乗り換え・新規申込は、このオプションのために必須ではありません。</dd></div>
<div><dt>受取時期・方法</dt><dd>対象の契約期間が始まる月の翌月中旬頃に、回線の電話番号と連携したPayPayアカウントへ付与（遅れる場合あり）。付与日から40日以内に番号とPayPayが未連携だと失効します。出金・譲渡はできません。連携済みポイントに一律40日の有効期限があるという意味ではありません。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月18日開始・終了日未定。</dd></div>
<div><dt>月額料金</dt><dd>Apple One個人プランは月1,350円。回線料金は別で、LINEMOベストプランは3GBまで990円・10GBまで2,090円、ベストプランVは30GBで2,970円が基本料金です。Apple Oneは加入日から1カ月ごとの自動更新で、日割り計算はありません。サービス料金は改定される場合があります。</dd></div>
<div><dt>手数料</dt><dd>Apple Oneの取引表示には月額1,350円と、利用時の通信料が示されています。回線を新たに契約する場合の通常事務手数料3,850円や、その割引の適用条件は別に確認してください。既存回線のままApple Oneを追加する使い方もできます。</dd></div>
<div><dt>注意点</dt><dd>次回更新が不要なら、契約期間満了日の前日までに解約手続きが必要です。直接契約からの利用登録が終わるまでは料金が重複する場合があります。ファミリー共有は終了・解除されるため、家族で使う人は切り替え前に確認を。iCloud+の200GB以上の契約は自動終了せず、その料金も続きます。Apple Accountを削除しても、この契約は自動では解約されません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/service/appleone/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.softbank.jp/mobile/set/common/pdf/service/apple-one/cp-terms.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.softbank.jp/mobile/set/common/pdf/legal/spguide/service/apple-one.pdf" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.softbank.jp/mobile/set/common/pdf/service/apple-one/transaction-act.pdf" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-ahamo-dpoint-ah00004" data-campaign-id="ahamo-dpoint-ah00004" data-carrier="ahamo" data-audiences="mnp">
<summary><span class="campaign-company">ahamo</span><span class="campaign-offer-title">SIMのみMNP：dポイント合計20,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>端末をそのまま使い、オンラインで手続きできるMNP利用者。短い国内通話を使い、ポイントの有効期限を管理できる人。</dd></div>
<div><dt>特典</dt><dd>期間・用途限定dポイント4,000ポイントを5カ月、合計20,000ポイント。現金の一括還元ではありません。</dd></div>
<div><dt>対象者</dt><dd>他社から番号を引き継ぎ、端末を買わずにahamoのSIMまたはeSIMを契約する人。OCN モバイル ONEからのMNPも対象。</dd></div>
<div><dt>必須条件</dt><dd>開通日の前月または当月に、契約と同じdアカウントでエントリーし、開通まで完了すること。進呈時にdポイントクラブ会員である必要があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での契約、端末同時購入、ドコモからのプラン変更、過去にahamoで同様の特典を受けた人、JALモバイルオプション同時申込は対象外。重複不可の他企画へ応募した場合は、月末に条件を満たす最新エントリーが優先されます。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式キャンペーンページでエントリー。エントリーは翌月末まで有効なので、申込日だけでなく開通日まで管理してください。</dd></div>
<div><dt>受取時期・方法</dt><dd>条件達成月の翌々月末から5カ月に分割。各回のポイントは進呈日から94日間有効。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。エントリーと開通の月の組み合わせには期限があります。</dd></div>
<div><dt>月額料金</dt><dd>11月時点の基本料金は30GB・月2,970円、5分以内の国内通話付き。別企画のデータ増量は基本容量と区別。12/1から40GBまで3,135円、60GBまで4,125円、120GBまで5,115円の段階制へ改定予定。</dd></div>
<div><dt>手数料</dt><dd>オンラインの新規・MNP契約事務手数料は0円。通話超過・SMS・有料サポート等は別料金。</dd></div>
<div><dt>注意点</dt><dd>20,000ポイントを受け取るまで分割期間があります。12月の料金改定後を含めて総費用で比較してください。メール案内への自動登録も公式規約に記載されています。 過去の特典を利用した人は、ドコモ提供プランの解約から2年以上なら「おかえり」の条件も確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://ahamo.com/special/lp/dpointcp/001.html" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://ahamo.com/plan/" rel="noopener noreferrer">公式の条件2</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-ahamo-return-ah00057" data-campaign-id="ahamo-return-ah00057" data-carrier="ahamo" data-audiences="return">
<summary><span class="campaign-company">ahamo</span><span class="campaign-offer-title">以前のSIM乗り換え特典を使った人向け：おかえり10,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>以前に通常のSIM乗り換え特典でahamoを使い、ドコモ提供プラン解約から2年以上たっていて、いまの端末と番号のまま戻りたい人。</dd></div>
<div><dt>特典</dt><dd>期間・用途限定dポイントを月2,000ポイントずつ5回、合計10,000ポイント。</dd></div>
<div><dt>対象者</dt><dd>以前、ahamoのSIMのみ乗り換え特典にエントリーして他社から乗り換え・開通し、ahamoを含むドコモ提供プランを解約してから2年が経過した人。今回も他社から番号を引き継ぎ、端末購入を伴わない乗り換えが必要です。</dd></div>
<div><dt>必須条件</dt><dd>開通日の前月か当月に、回線契約に使うdアカウントでエントリー。ahamo公式サイトでSIMカードまたはeSIMのみを契約し、エントリーの翌月末までに開通します。進呈時にdポイントクラブ会員であることも必要です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での契約、端末同時購入、JALモバイルオプション同時申込は対象外。通常のSIM乗り換え20,000ポイントと合算できません。重複不可の他企画に応募した場合は、開通月の月末時点で条件をすべて満たす最新のエントリーが適用されます。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>おかえりキャンペーンの公式ページからエントリーし、同じdアカウントで回線を申し込みます。同月中の再エントリーはできません。</dd></div>
<div><dt>受取時期・方法</dt><dd>条件達成月の翌々月末から5カ月間、毎月末までに2,000ポイント。各回の有効期限は進呈時にdポイントクラブで確認してください。回線とdアカウントにつき各1回まで。</dd></div>
<div><dt>申込期限</dt><dd>2025年11月17日受付開始・終了日未定。エントリー翌月末までに開通。</dd></div>
<div><dt>月額料金</dt><dd>11月30日までは基本30GBで月2,970円。12月1日からは40GBまで月3,135円、60GBまで4,125円、120GBまで5,115円の段階制です。5分以内の国内通話付きで、超過分や対象外の通話は別料金です。</dd></div>
<div><dt>手数料</dt><dd>オンラインの乗り換え事務手数料は0円。SMSや有料サポート等は別料金。</dd></div>
<div><dt>注意点</dt><dd>過去に通常のSIM乗り換え企画に参加していない人は、まず20,000ポイントの公式条件を確認してください。エントリー時にMyインフォメールへ自動登録される案内があります。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://ahamo.com/special/ahamo_okaeri/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://ahamo.com/campaigns/tyoujyou.html" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://ahamo.com/plan/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-ahamo-iphone16-ah00089-20261120" data-campaign-id="ahamo-iphone16-ah00089-20261120" data-carrier="ahamo" data-audiences="mnp">
<summary><span class="campaign-company">ahamo</span><span class="campaign-offer-title">iPhone 16（128GB）を同時購入する乗り換え：10,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>iPhone 16の128GBモデルを買う予定があり、ahamoへ乗り換える人。今のスマホを使い続けるなら、SIMのみの特典と総額で比べてください。</dd></div>
<div><dt>特典</dt><dd>期間・用途限定dポイント10,000ポイントを後日進呈。端末の注文時に10,000円値引きされる仕組みとは異なります。</dd></div>
<div><dt>対象者</dt><dd>ahamo公式サイトで他社から番号を引き継いで乗り換え、その申込と一緒にiPhone 16の128GBモデルを購入する人。</dd></div>
<div><dt>必須条件</dt><dd>2027年1月11日までに、対象端末の購入と乗り換え・開通を済ませます。進呈時にdポイントクラブ会員であることが必要です。購入後にキャンセル・返品をすると対象外です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号、SIMのみ、既存回線の機種変更、JALモバイルオプション同時申込は対象外。SIMのみの20,000ポイントとは条件が異なるため合算できません。他企画との重複不可の場合は本特典が優先されます。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>ahamo公式サイトでiPhone 16（128GB）を選び、他社からの乗り換えと同時に購入。規約の進呈条件は購入・開通で、別のエントリーは記載されていません。</dd></div>
<div><dt>受取時期・方法</dt><dd>条件を満たした月の翌月を予定。回線に紐づくdアカウントに付与され、進呈から3カ月で失効します。1回線・1アカウントにつき各1回まで。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月20日〜2027年1月11日。注文から開通までの日数と在庫に余裕を見てください。</dd></div>
<div><dt>月額料金</dt><dd>11月30日までは基本30GBで月2,970円。12月1日からは40GBまで月3,135円、60GBまで4,125円、120GBまで5,115円の段階制です。5分以内の国内通話付きで、超過分や対象外の通話は別料金です。 端末代は別に必要です。</dd></div>
<div><dt>手数料</dt><dd>オンラインの乗り換え事務手数料は0円。分割・返却型の購入では申込画面で返却条件や支払総額を確認してください。</dd></div>
<div><dt>注意点</dt><dd>在庫や端末代は注文時に確認を。ほかの割引や返却時の負担額を、この10,000ポイントと自動で合算して比較しないでください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://ahamo.com/special/lp/5g-welcome_wari.html#anc-iphone-16" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://ahamo.com/plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://ahamo.com/products/iphone/iphone-16/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-povo-honkivari-202505" data-campaign-id="povo-honkivari-202505" data-carrier="povo" data-audiences="mnp">
<summary><span class="campaign-company">povo</span><span class="campaign-offer-title">本気割：対象の年間データ購入代金の50％相当を還元</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>年間のデータ使用量を見通せ、まとめ払いできるMNP利用者。月ごとの使用量が変わり、年間容量を柔軟に使いたい人。</dd></div>
<div><dt>特典</dt><dd>対象のデータ追加360GB・365日間（26,400円）ならau PAY残高13,200円相当。1.32TB・365日間（39,240円）なら19,620円相当。対象外のトッピングには適用されません。 11月30日23:59まで、対象の360GB増量版（375GB、26,400円）も条件を満たせば13,200円相当です。</dd></div>
<div><dt>対象者</dt><dd>au・UQ mobile・povo1.0以外から、povo2.0の「通話＋データ」へMNPする人。</dd></div>
<div><dt>必須条件</dt><dd>SIM有効化の7日後23:59までに初めて対象トッピングを購入。購入前にpovoアカウントとau IDを連携し、還元までに同じau IDでau PAYを利用開始してください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号の契約、データ専用、対象外の購入、過去にpovo2.0のMNP特典を受けた人、購入後にau IDを変更・統合・解約・一時停止した場合等は対象外。併用不可の企画があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式の本気割ページで対象一覧を確認し、povo2.0へMNP。対象トッピングはpovoアプリで購入します。</dd></div>
<div><dt>受取時期・方法</dt><dd>SIM有効化の翌月末までに、購入時のau IDに紐づくau PAY残高へ還元。コード引換ではありません。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。対象トッピング・販売価格は変更される場合があります。</dd></div>
<div><dt>月額料金</dt><dd>基本料0円とは別に年間分を一括購入。360GB例は支払額26,400円で、還元後13,200円を12で割ると月あたり1,100円相当。毎月1,100円請求のプランではありません。通話料は別。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は原則0円。過去1年以内に同一名義で累計5回線以上の申込歴がある場合、6回線目以降は1回線3,850円。</dd></div>
<div><dt>注意点</dt><dd>先払いとau PAYでの還元です。還元前の支払額、365日の使い切り、7日後までの購入を確認。セール時は変更後の対象データ代金の50％相当となり、Amazonプライム等とのセットは公式の計算条件が異なります。 回線の維持は、直近180日間に対象の有効なデータ追加などが適用されているかで判定されます。データを使い切っても有効期限までは適用中と扱われます。還元で実質無料になる追加購入などは対象にならない場合があります。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://povo.jp/campaign/detail/mnp_aupay_cpn_2025_05/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://povo.jp/spec/detail/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://povo.jp/information/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://povo.jp/topping-list/detail/375G_365d_ext-cp/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-povo-data-increase-20261126" data-campaign-id="povo-data-increase-20261126" data-carrier="povo" data-audiences="mnp new return">
<summary><span class="campaign-company">povo</span><span class="campaign-offer-title">11月30日まで：年額データ増量祭は最大15GB追加</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>1年分のデータをまとめて買うつもりのpovo利用者。365日で使える量と支払額を比べ、多く使う人は同じ26,400円で15GB増える375GBが候補です。</dd></div>
<div><dt>特典</dt><dd>365日分のデータが購入時に増量。60GB→63GB、120GB→125GB、360GB→375GB。いずれも対応する通常商品の価格は据え置きです。</dd></div>
<div><dt>対象者</dt><dd>povo2.0の「通話＋データ」で、期間内に対象のデータ追加商品を購入する人。既存利用者も対象で、増量自体に乗り換えは不要です。データ専用プランでは「データ専用初回」と表示された対象商品の初回購入が対象です。</dd></div>
<div><dt>必須条件</dt><dd>期間内に、povoアプリなど公式が指定する購入画面で「増量中」と表示された対象商品を選んで購入を完了してください。回線開通や初回購入が必要な人は、購入期限に間に合うよう手続きします。</dd></div>
<div><dt>対象外・併用条件</dt><dd>既に買った通常商品のあとからの増量や、有効期間の延長はありません。データ専用プランは本気割の還元対象外。「通話＋データ」の375GBは対象の360GBの増量版で、本気割の乗り換え・開通後7日以内購入・au ID連携等を別途満たした場合に還元対象です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式の増量祭ページから対象商品を確認し、公式アプリ等で購入。増量分の受け取りエントリーの記載はありません。</dd></div>
<div><dt>受取時期・方法</dt><dd>増量後の容量を購入時に受け取り、有効期間は365日。24時間を1日とし、当面は満了日の23:59:59まで使えます。本気割を併用した場合のau PAY残高は別途、SIM有効化の翌月末まで。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月26日10:00〜11月30日23:59までに購入。</dd></div>
<div><dt>月額料金</dt><dd>基本料0円とは別に、63GBは13,200円、125GBは21,600円、375GBは26,400円を一括で支払います。Amazonプライム1年付きはそれぞれ16,700円、25,100円、29,900円。通話やSMSは別料金です。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は原則0円。同一名義で直近1年間に累計6回線目以降は1回線3,850円。既存利用者が増量商品を買う支払いは商品代です。</dd></div>
<div><dt>注意点</dt><dd>375GBを26,400円で購入し本気割の全条件を満たすと、au PAY残高13,200円相当が別に還元されます。63GB・125GBの購入や、データ専用の初回購入にも同じ還元が付くと考えないでください。購入した商品ごとに有効期限が進みます。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://povo.jp/campaign/detail/data-increase_2026_11/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://povo.jp/topping-list/detail/375G_365d_ext-cp/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://povo.jp/campaign/detail/mnp_aupay_cpn_2025_05/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://povo.jp/spec/detail/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-card-3452-20261120" data-campaign-id="rakuten-card-3452-20261120" data-carrier="rakuten" data-audiences="mnp new">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">楽天カード会員向け：初回の回線契約20,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>対象の楽天カードをすでに持ち、初めて楽天回線を契約する人。新しい番号でもMNPでも回線特典は20,000ポイントで、カードを新しく作らずに条件を満たせる人の比較候補です。</dd></div>
<div><dt>特典</dt><dd>条件を満たした回線の初回契約に、楽天の期間限定ポイント20,000ポイント（4,000×5回）。広告の最大30,000ポイントに含まれるカード新規入会・利用の別特典10,000ポイントは、この金額に含めません。</dd></div>
<div><dt>対象者</dt><dd>2026年12月末時点で有効な対象楽天カードを保有し、初めて楽天回線の音声プランを新しい番号または他社MNPで契約する楽天会員。U-NEXT付きプランも対象ですが、下記月額は通常プランの例です。</dd></div>
<div><dt>必須条件</dt><dd>12月31日23:59までに開通し、申込回線のRakuten Linkから10秒以上の対象通話を完了。楽天モバイルと対象カードに紐づく楽天IDが同じで、12月末時点でもカードが有効である必要があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>再契約、データ専用・プラン変更、専用経路以外・クーポン未適用、ID不一致、未納、不備、期限超過は対象外。紹介1784・通常初回特典とは合算不可。端末特価2178・2808・2938・2961・3090・3186・3419・3420などが優先される場合は本ポイントは付きません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>専用Webの申込ボタンから、公式クーポンを適用して開始。本人確認でアプリへ移った場合はWebに戻り、完了前にクーポン表示を確認します。店頭では開始時に公式画面を提示し、自分でクーポンを入力。後から追加できません。</dd></div>
<div><dt>受取時期・方法</dt><dd>2027年2月から6月まで各月末ごろに4,000ポイントずつ。各回の有効期限は付与日の3カ月後の月末です。カード新規入会分は別の進呈条件・時期です。</dd></div>
<div><dt>申込期限</dt><dd>Webは2026年12月21日10:00まで。店頭は12月20日の各店閉店まで。開通・指定通話は12月31日23:59まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プラン（動画セット・データ専用を除く）は割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。国内通話無料はRakuten Link利用などの条件あり。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>1人1回。カード新規入会・1回利用で10,000ポイントの別企画は、11月30日10:00までのカード申込など異なる条件があります。回線だけで全員30,000ポイントになる特典ではありません。対象カード・同一ID・有効期限を確認してください。端末の併用可リストは2568・2848・2926・3303などで、端末購入条件は別途必要です。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/card-mobile-majitoku/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-mnp-2091-202610" data-campaign-id="rakuten-mnp-2091-202610" data-carrier="rakuten" data-audiences="mnp">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">紹介を使わない初回MNP：10,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>紹介者がいなくても、スマホをそのまま使って初めて楽天回線へMNPしたい人。通知ごとの受取を管理できる人。</dd></div>
<div><dt>特典</dt><dd>楽天ポイント合計10,000ポイント。現在は4,000・3,000・3,000ポイントの3回に分けて受け取ります。</dd></div>
<div><dt>対象者</dt><dd>楽天回線を初めて申し込み、楽天モバイルの通常の音声プラン、または動画配信サービスU-NEXT（ユーネクスト）が付いた音声プランへ他社からMNPする楽天会員。データ専用は対象外です。</dd></div>
<div><dt>必須条件</dt><dd>Webでは申込前にエントリーし、その同じ月に申し込み。申込翌月末23:59までに利用開始とRakuten Linkから10秒以上の発信を完了します。</dd></div>
<div><dt>対象外・併用条件</dt><dd>再契約、新しい番号での契約、データ専用、通常プランとU-NEXT付きプランの間の単なるプラン変更は、このMNP特典の対象外。新規番号特典・紹介特典と併用できません。端末企画は公式の併用可リストを確認してください。未納・不備・期限超過等も対象外です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式2091の企画へ申込前にエントリー。店舗申込はエントリー不要ですが、この記事ではWebの手順を示しています。</dd></div>
<div><dt>受取時期・方法</dt><dd>条件確認月の翌々月末頃から3回（4,000・3,000・3,000ポイント）。Rakuten Linkとメールの通知から毎回受取手続きが必要。各回の受取期限は通知の2カ月後月末、ポイント有効期限は通知の3カ月後月末です。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。Webエントリーは申込と同月、開通・指定通話は申込翌月末まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プランは割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。U-NEXT付きの音声プランは割引前で月4,378円です。どちらも特典対象ですが、ポイント額と毎月の料金を分けて比べてください。国内通話無料はRakuten Link利用などの条件があります。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>紹介リンクを使える人は紹介特典と比較してください。番号を引き継がず新しく作る人には、別の初回新規特典があります。 期間中に店頭で申し込める場合は、別枠の20,000ポイント特典と比較してください。同じ回線での合算はできません。 楽天カード会員向け20,000ポイントとは別の申込経路・条件です。同じ回線の還元額へ合算しないでください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/mnp/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/detail/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-galaxy-3303-20261126" data-campaign-id="rakuten-galaxy-3303-20261126" data-carrier="rakuten" data-audiences="mnp">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">Galaxy Z Flip8・Fold8・Fold8 Ultra購入と初回乗り換え：最大28,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>対象の折りたたみGalaxyを購入予定で、楽天モバイルへ初めて番号を引き継ぐ人。今の端末を使うなら回線のみの特典で比較してください。</dd></div>
<div><dt>特典</dt><dd>対象のGalaxy Z 3機種では、機種分12,000（3303）＋対象Android購入分6,000（2006）＋初回乗り換え分10,000（2091）の条件をすべて満たすと、合計28,000楽天ポイント。S26シリーズの3303分は7,000ポイントで、支払い方法などで適用企画が異なります。</dd></div>
<div><dt>対象者</dt><dd>楽天モバイルへ初めて、他社から番号を引き継いで標準の音声プランまたはU-NEXT付きの音声プランを申し込み、同時に対象のGalaxyを買う楽天会員。最大額の対象はGalaxy Z Flip8／Z Fold8／Z Fold8 Ultraです。</dd></div>
<div><dt>必須条件</dt><dd>申込と対象端末購入を同時に済ませ、申込・購入の翌月末23:59までに開通し、申し込んだ回線で楽天の通話アプリ「Rakuten Link」から対象の相手に10秒以上発信します。後から楽天会員になる場合は、通話前に会員へ切り替えてください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での契約、データ専用、楽天モバイルのプラン間変更、公式の販売経路以外の端末購入は対象外。3303と機種変更の3304、端末特価2178は併用できません。28,000には初回乗り換えの10,000が含まれます。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>Webは公式ページで楽天IDを使い、初回乗り換え分のエントリー後、同じ月に申込と購入。楽天モバイルショップでは初回乗り換え分のWebエントリーは不要です。各ポイントの併用条件を購入前に確認してください。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通・指定通話を確認された月の翌々月末ごろから3カ月に分割。Z 3機種の3303分は4,000ずつ3回、有効期限は付与日を含め3カ月。初回乗り換え分は受取通知後に各回の取得操作が必要で、有効期限も別です。</dd></div>
<div><dt>申込期限</dt><dd>Webは2027年1月8日8:59、店頭は1月7日の閉店までに申込・購入。開通と指定通話は申込・購入の翌月末23:59まで。</dd></div>
<div><dt>月額料金</dt><dd>標準の音声プランは割引前で月1,078円／2,178円／3,278円の段階制。U-NEXT付きの音声プランは通常月4,378円。いずれも端末代などは別です。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。端末の支払総額や、返却型の負担額と返却条件は申込時に確認してください。</dd></div>
<div><dt>注意点</dt><dd>11月26日確認の対象機種と条件を掲載しています。既存利用者の機種変更分は別企画です。対象機種を決めたうえで端末代と回線費用を比べ、受取手続きをそれぞれ確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/galaxy/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/campaign/mnp/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/campaign/start-point/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/detail/" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/unext/" rel="noopener noreferrer">公式の条件5</a> ／ <a href="https://network.mobile.rakuten.co.jp/information/news/service/3526/" rel="noopener noreferrer">公式の条件6</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-new-2142-202610" data-campaign-id="rakuten-new-2142-202610" data-carrier="rakuten" data-audiences="new">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">紹介を使わず新しい番号で初回契約：9,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>番号を新しく作りたい人で、申し込み前に家族・知人から紹介を受けられない場合。紹介を受けられる場合は、受取回数や有効期限も含めて12,000ポイントの紹介特典と比べてください。</dd></div>
<div><dt>特典</dt><dd>楽天の期間限定ポイントを2,000ポイントずつ4回と1,000ポイント1回、計9,000ポイント受け取れます。</dd></div>
<div><dt>対象者</dt><dd>初めて楽天回線を申し込む楽天会員が、新しい番号で楽天モバイルの通常の音声プラン、またはU-NEXT付きの音声プランを契約する場合。データ専用は対象外です。</dd></div>
<div><dt>必須条件</dt><dd>Webでは申込前に契約と同じ楽天IDでエントリーし、同じ月に申込。翌月末23:59までに利用開始と、申込回線でRakuten Linkから10秒以上の対象通話を済ませます。</dd></div>
<div><dt>対象外・併用条件</dt><dd>他社からの乗り換え、再契約、データ専用、旧楽天モバイルのドコモ・au回線からメンバーズステーション経由の移行は対象外。紹介特典や初回MNP特典は併用不可。端末企画は公式の併用可リストを確認してください。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>Webは公式ページの新規契約特典（2142）へ申込前にエントリー。楽天モバイルショップで新しい番号を申し込む場合はエントリー不要です。</dd></div>
<div><dt>受取時期・方法</dt><dd>利用開始と指定通話が確認された月の翌々月末ごろから5回（2,000ポイントを4回、最後に1,000ポイント）。Rakuten Linkとメールの通知から毎回手続きします。受取期限は各通知の2カ月後の月末、ポイント有効期限は各通知の3カ月後の月末です。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。Webはエントリーと同月に申込。開通と指定通話は申込翌月末まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プランは割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。U-NEXT付きの音声プランは割引前で月4,378円です。どちらも特典対象ですが、ポイント額と毎月の料金を分けて比べてください。国内通話無料はRakuten Link利用などの条件があります。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>9,000ポイントは2026年10月1日以降の対象申込分。旧楽天モバイルのドコモ・au回線からメンバーズステーション経由で移行する場合は、同年10月28日9時以降、対象外です。受取手続きが5回に分かれるので、通知を見落とさないようにしてください。 期間中に店頭で申し込める場合は、別枠の20,000ポイント特典と比較してください。同じ回線での合算はできません。 楽天カード会員向け20,000ポイントとは別の申込経路・条件です。同じ回線の還元額へ合算しないでください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/mnp/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/detail/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-referral-1784-202609" data-campaign-id="rakuten-referral-1784-202609" data-carrier="rakuten" data-audiences="mnp new">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">紹介を受けて初回契約：MNP13,000／新規12,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>申し込み前に家族・知人から紹介を受けられる初回利用者。番号を新しく作る場合も通常の初回特典と比べたい人。</dd></div>
<div><dt>特典</dt><dd>紹介される側はMNPで13,000ポイント、新しい番号の契約で12,000ポイント。広告の「2人合わせて」やU-NEXTの別条件分を、自分ひとりの特典として合算していません。</dd></div>
<div><dt>対象者</dt><dd>本人以外から紹介を受け、初めて楽天モバイルの通常の音声プランを新しい番号または他社からの乗り換え（MNP）で申し込む人。動画セットでも特典対象ですが、この記事の料金比較は通常プランです。</dd></div>
<div><dt>必須条件</dt><dd>申し込みより先に紹介URL・QRから、契約に使う楽天IDで紹介ログイン。ログイン月の翌々月末23:59までに申し込み・開通・Rakuten Linkの10秒以上発信を完了します。</dd></div>
<div><dt>対象外・併用条件</dt><dd>旧楽天モバイルのドコモ・au回線からのプラン移行、自分自身の紹介、申込後の紹介ログイン、再契約、データタイプ、未納・不備などは対象外。初回MNPの10,000ポイントや新規番号の9,000ポイントとは併用できません。 端末同時購入の特典は、公式の併用可リストに載るものに限ります。対象の端末特価などが優先適用される場合、紹介ポイントは付きません。 楽天カード会員向け20,000ポイント（3452）との併用もできません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>紹介する人が公式ページのLINE・X・Viber・Rakuten Link・SMS等で共有した紹介URL、または公式の紹介QRから、申込より先に楽天IDで紹介ログイン。その後Webまたは店舗で申し込みます。この記事の公式案内を開くだけでは紹介は成立しません。</dd></div>
<div><dt>受取時期・方法</dt><dd>紹介ログイン月の4カ月後から3カ月。MNPは5,000・4,000・4,000、新規は4,000ずつ。ポイント有効期間は進呈日を含め6カ月。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。紹介ログイン後の申込・開通・通話は翌々月末まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プラン（動画セット・データ専用を除く）は割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。国内通話無料はRakuten Link利用などの条件あり。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>MNP13,000と新規12,000の区別、紹介を受ける順番を確認。紹介する側の特典を自分の還元額に含めず、U-NEXTへの有料加入も前提にしていません。紹介者も、紹介ログイン時点または同じ月のうちに公式指定の楽天回線を契約している必要があります。 楽天カードを持つ初回利用者は、別枠のカード会員向け20,000ポイント特典と比較してください。同じ回線での合算はできません。 iPhoneの一括・24回払い割引2169は、今回確認した併用可リストにはありません。同リストに載る乗り換え向け割引2568などと、企画番号まで区別してください。買い替えプログラムの特価にも併用できるもの・優先適用されるものがあるため、公式の企画番号まで確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/referral/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-return-2207" data-campaign-id="rakuten-return-2207" data-carrier="rakuten" data-audiences="mnp return">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">以前使っていた人が他社から戻ると2,162ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>以前使っていた楽天モバイルへ、いま使っている他社の番号をそのまま持ち帰りたい人。</dd></div>
<div><dt>特典</dt><dd>楽天の期間限定ポイントを1,081ポイントずつ2回、合計2,162ポイント受け取れます。</dd></div>
<div><dt>対象者</dt><dd>以前に楽天モバイルを契約していた楽天会員で、解約から2カ月を超え、現在の他社の電話番号を引き継いで、楽天モバイルの通常の音声プランまたはU-NEXT付きプランに申し込む人。</dd></div>
<div><dt>必須条件</dt><dd>申込の翌月末23:59までに開通し、対象回線のRakuten Linkから10秒以上発信。0570などの対象外番号を除きます。楽天IDなしで申し込んだ場合は、期限までに楽天会員へ切り替えてから指定通話を済ませます。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での申込、データ専用、プラン変更、未納は対象外。初回特典とは併用できません。再契約向けの特典2129を適用済み・適用予定の人も対象外です。公式の併用可リストには対象Android端末の特典2006が記載されています。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>Webは公式特典ページのボタンから申し込み、本人確認でアプリに移動したらWebに戻ってクーポン表示を確認。店頭は手続き開始時に本人が公式ページ記載のコードを入力します。</dd></div>
<div><dt>受取時期・方法</dt><dd>申込から数カ月後に月末ごろの進呈が始まり、2カ月に分けて受け取ります。公式例では3月申込・4月末までに条件達成で7月末と8月末ごろ。各回の有効期間は付与日を含め6カ月です。</dd></div>
<div><dt>申込期限</dt><dd>申込の終了日は未定。開通・指定通話は申込翌月末23:59まで。</dd></div>
<div><dt>月額料金</dt><dd>通常の音声プランは割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。U-NEXT付きプランは割引前で月4,378円。通話料などは別途かかる場合があります。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、5回線目から1回線3,850円。解約済み回線も数えます。開通から1年以内の解約手数料は通常プランで最大1,078円、U-NEXT付きは1,100円です。</dd></div>
<div><dt>注意点</dt><dd>一人1回線・1回限り。月額料金は請求され、ポイントは後日付与です。初回の店頭・銀行連携の2万ポイントは再契約には適用されません。 公式の移行に関する旧文言は削除されていますが、今回も他社から番号を引き継ぐMNPの条件は必要です。新しい番号やプラン変更を対象に含めません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/tadaima/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/detail/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-uq-sim-debut-20260917" data-campaign-id="uq-sim-debut-20260917" data-carrier="uq" data-audiences="mnp">
<summary><span class="campaign-company">UQ mobile</span><span class="campaign-offer-title">オンラインのSIMのみMNP：au PAY残高20,000円相当</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>au回線の使い勝手を重視し、35GB前後や店舗での相談も必要な人。オンラインの契約とau PAYの利用設定ができるMNP利用者。</dd></div>
<div><dt>特典</dt><dd>au PAY残高20,000円相当（不課税）。商品購入や抽選の最大額を合算していません。</dd></div>
<div><dt>対象者</dt><dd>au・povo以外から、UQ mobileオンラインショップでSIMカードまたはeSIMのみをMNP契約する個人。</dd></div>
<div><dt>必須条件</dt><dd>注文時にコミコミプランバリューまたはトクトクプラン2と増量オプションⅡへ同時加入。申込翌月末までに開通し、還元時点までに回線のau ID・au PAYアプリを設定してください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新規番号、au・povoからの移行、法人、増量オプション未加入、Amazonエントリーコード、キャンセル等は対象外。過去の同種還元歴・au ID変更等でも対象外の場合があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>UQ mobile公式オンラインショップから、対象プランと増量オプションⅡを選択。店頭の条件とは分けて確認してください。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通の翌月下旬以降に、契約回線のau IDに紐づくau PAY残高へ還元。コード引換ではなく、事前の利用設定が必要です。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。20,000円への増額は2026年9月17日から。</dd></div>
<div><dt>月額料金</dt><dd>割引前：コミコミプランバリュー35GB・10分国内通話付き月3,828円、トクトクプラン2は5GB超～30GBで月4,048円。増量オプションⅡは月550円、別企画で適用月から7カ月無料、以後自動課金。セット割・おトク割は別条件です。</dd></div>
<div><dt>手数料</dt><dd>オンラインの契約事務手数料3,850円。通話超過・SMS等は別料金。 別枠の事務手数料企画はクーポン入力などを満たすと後日の請求から相当額が減算されます。</dd></div>
<div><dt>注意点</dt><dd>増量オプションⅡへの同時加入が必須です。無料期間後の550円を含めて比較し、各種割引にも対象条件があります。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://shop.uqmobile.jp/shop/cashback/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.uqwimax.jp/mobile/plan/komikomi-pv/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.uqwimax.jp/mobile/plan/tokutoku2/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-uq-fee-coupon-20261120" data-campaign-id="uq-fee-coupon-20261120" data-carrier="uq" data-audiences="mnp">
<summary><span class="campaign-company">UQ mobile</span><span class="campaign-offer-title">SIMのみ乗り換え：事務手数料相当を後日の請求から減算</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>自分のスマホを使い続け、SIMのみでUQへ乗り換える人。対象の他社MNPなら残高還元との併用、auからなら手数料相当だけを分けて比較できます。</dd></div>
<div><dt>特典</dt><dd>契約事務手数料3,850円相当を、後日の請求額から減算して返します。現金・au PAY残高の付与ではありません。別枠のSIMデビュー20,000円相当と両方の条件を満たす他社MNPでは実質合計23,850円相当です。</dd></div>
<div><dt>対象者</dt><dd>UQ mobileオンラインショップでSIMカードまたはeSIMのみを契約する個人。他社（au・povoを除く）からのMNPと、auからの番号移行は公式の適用条件に記載されています。povoからの扱いは注意点を確認してください。</dd></div>
<div><dt>必須条件</dt><dd>申込時に公式クーポン「3MP155」を入力し、申込翌月末までに開通。申込完了後のクーポン追加・変更はできません。20,000円相当のSIMデビューも受ける場合は、別途対象プラン・増量オプションⅡなど全条件を満たします。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新規番号、法人、店頭などオンラインショップ以外、Amazonエントリーコード、キャンセル・期間外の注文確定などは対象外。ほかのクーポン企画とは併用不可。解約後の復権・再利用、譲渡・承継等は対象外の場合があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>UQ mobileオンラインショップでSIMのみを選び、申込中のクーポン番号欄に公式ページの6桁コードを入力して完了します。</dd></div>
<div><dt>受取時期・方法</dt><dd>利用開始1カ月後の請求で事務手数料をいったん支払い、利用開始2カ月後の請求額から相当額を差し引いて返します。契約・請求状況により減算方法が異なり、開始が遅れる場合があります。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月20日から終了日未定。申込翌月末までに開通。</dd></div>
<div><dt>月額料金</dt><dd>割引前：コミコミプランバリュー35GB・10分国内通話付き月3,828円、トクトクプラン2は5GB超～30GBで月4,048円。増量オプションⅡは月550円、別企画で適用月から7カ月無料、以後自動課金。セット割・おトク割は別条件です。</dd></div>
<div><dt>手数料</dt><dd>契約時の事務手数料3,850円は請求され、後日の請求から相当額が減算されます。消費税計算により実際の減算額が3,850円と異なる場合があります。通話・SMS等は別料金です。</dd></div>
<div><dt>注意点</dt><dd>20,000円相当の残高還元と手数料相当の請求減算は別特典です。auからの移行は手数料企画の対象条件にありますが、SIMデビュー20,000円相当は対象外です。povoは適用条件とFAQの記載が一致しないため、この記事では対象と断定せず、契約前に公式へ確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://shop.uqmobile.jp/shop/administration_fee/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://shop.uqmobile.jp/shop/cashback/" rel="noopener noreferrer">公式の条件2</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-ymobile-sim-5-20261102" data-campaign-id="ymobile-sim-5-20261102" data-carrier="ymobile" data-audiences="mnp new">
<summary><span class="campaign-company">Y!mobile</span><span class="campaign-offer-title">ワイモバSIM契約キャンペーン5：MNP最大15,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>店舗サポートのある回線へMNPしたい人。ソフトバンク系以外からの乗り換えで、家族・光回線の割引条件も自分で確認できる人。</dd></div>
<div><dt>特典</dt><dd>MNPはシンプル3 Sが5,000円相当、M/Lが15,000円相当。新規番号はS特典なし、M/L各5,000円相当。使用者5～18歳の新規M/Lは、対象者限定の5,000円相当増額と合わせ10,000円相当。</dd></div>
<div><dt>対象者</dt><dd>公式オンラインストアでSIM・eSIMのみをシンプル3 S/M/Lで契約し、同時にデータ増量オプションへ加入する個人。</dd></div>
<div><dt>必須条件</dt><dd>開通まで完了し、開通月の翌々月末までに届いたPayPayポイントコードをチャージ。過去の同オンラインストアでの還元歴も確認してください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・LINEMO・LINEモバイルのソフトバンク回線および同回線MVNOからの移行、増量オプションなし、未納・キャンセル等は対象外。同一名義・使用者は1回線のみ、他企画と併用できない場合があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式オンラインストアのSIM専用ページから申し込み。契約時に対象プランとデータ増量オプションを選択。U18増額は対象年齢の使用者登録が必要です。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の翌々月初頃、SMS等でコード送付。同月末までにPayPayへチャージし、期限超過時は再発行されません。</dd></div>
<div><dt>申込期限</dt><dd>基本の企画5は2026年11月2日から終了日未定。前の期間限定増額と混同しないでください。</dd></div>
<div><dt>月額料金</dt><dd>割引前：S5GB月3,278円、M30GB月4,378円、L35GB月5,478円。増量オプション月550円が別途必要、無料キャンペーンの対象条件・終了後課金を確認。光回線・家族・カードの割引は別条件。</dd></div>
<div><dt>手数料</dt><dd>オンライン契約事務手数料3,850円。過去のハロウィン企画の事務手数料無料を、現在にも適用すると考えないでください。</dd></div>
<div><dt>注意点</dt><dd>最大15,000円相当はM/Lへの対象MNPです。M/Lの月額が高くなる分を含めて比較し、特典目的だけで容量を増やさないこと。ポイントは出金・譲渡不可。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.ymobile.jp/store/sp/sim/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.ymobile.jp/sp/price_info_2026/" rel="noopener noreferrer">公式の条件2</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-au-sim-debut-20260917" data-campaign-id="au-sim-debut-20260917" data-carrier="au" data-audiences="mnp new">
<summary><span class="campaign-company">au</span><span class="campaign-offer-title">au Online Shop SIMデビュー：MNP20,000円相当</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>auの大容量回線や付帯サービスを必要とし、オンライン契約とau PAYの設定ができる人。還元だけのために高いプランを選ぶ人には向きません。</dd></div>
<div><dt>特典</dt><dd>他社MNPはau PAY残高20,000円相当。新しい番号は原則10,000円相当、使用者5～12歳なら20,000円相当。</dd></div>
<div><dt>対象者</dt><dd>au Online ShopでSIMカードまたはeSIMのみを契約する個人。MNPはUQ mobile・povo1.0・povo2.0以外からの乗り換え。</dd></div>
<div><dt>必須条件</dt><dd>注文月を1カ月目として2カ月目末までに開通。還元までに契約回線のau IDとau PAYアプリを取得し、利用設定を完了してください。対象料金プランへの加入が必要です。 au PAYが使える端末（iOS 16.0以上またはAndroid 7.0以上など）と、au PAYのコード支払い・ネット支払い特約への同意が必要です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>スマホミニプラン＋、タブレット、au Starlink Direct専用プラン＋、ウォッチナンバー専用SIM、法人、キャンセル等は対象外。過去のau Online Shop還元歴、au ID統合・分離等で対象外の場合があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>au Online ShopでSIMのみを申し込み、対象料金プランを選択。年齢区分は注文完了時点の使用者年齢で判定されます。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通完了の翌月下旬以降にau PAY残高へ還元。契約した回線のau ID・アプリの設定が必要。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。MNP20,000円への増額は2026年9月17日から。</dd></div>
<div><dt>月額料金</dt><dd>対象例のauバリューリンクプランは、割引前で月8,008円。家族・光回線・カードの割引は別条件で、通話料・端末代等も別途。対象外の低容量プランへ入ると、この特典は受け取れません。</dd></div>
<div><dt>手数料</dt><dd>au Online Shopの契約事務手数料3,850円。</dd></div>
<div><dt>注意点</dt><dd>MNP20,000円相当、新規は通常10,000円相当・5〜12歳は20,000円相当です。9/17の増額お知らせが一覧から消えても、現在の特典表の金額は同じです。高額な月額を含め、長期の総費用で判断してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.au.com/mobile/campaign/ols-sim-2010/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.au.com/pr/newplan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.au.com/mobile/information/contract/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-softbank-sim-paypay-202606" data-campaign-id="softbank-sim-paypay-202606" data-carrier="softbank" data-audiences="mnp new">
<summary><span class="campaign-company">ソフトバンク</span><span class="campaign-offer-title">専用ページのSIMのみ契約：PayPay12,000ポイント</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>ソフトバンクの大容量回線を必要とし、PayPayを利用する人。特典のためだけに月額の高いプランへ移ることは勧めません。</dd></div>
<div><dt>特典</dt><dd>条件を満たすとPayPayポイント12,000円相当を一括付与。MNPまたは新しい番号の契約が対象。</dd></div>
<div><dt>対象者</dt><dd>専用ページからSIMのみを個人名義で契約し、ペイトク2またはテイガク無制限へ加入する人。</dd></div>
<div><dt>必須条件</dt><dd>開通後90日以内に、今回の契約電話番号とPayPayアカウントを連携。使用者に過去の同キャンペーン適用歴がないこと。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ワイモバイル・LINEMO・LINEモバイル・ソフトバンク回線MVNOからの移行、専用ページ以外の申込、法人、対象プラン以外は対象外。LINEヤフー限定割引クーポンとは併用不可。その他も併用できない場合があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>必ず公式の「SIMのみ契約限定！PayPayポイントプレゼント」専用ページから申し込み、申込画面の企画名を確認してください。</dd></div>
<div><dt>受取時期・方法</dt><dd>電話番号とPayPayアカウントを連携した日から1週間以内を目途に一括付与。連携が90日を超えると特典は失効。契約内容等で付与時期が前後する場合があります。</dd></div>
<div><dt>申込期限</dt><dd>終了日未定。開通後90日以内のPayPay連携が必須。</dd></div>
<div><dt>月額料金</dt><dd>割引前：テイガク無制限は月8,008円、ペイトク2は月10,538円。家族・光回線・カードや買い物還元を使った実質額を、無条件の基本料金として比較しません。</dd></div>
<div><dt>手数料</dt><dd>オンラインの新規・MNP契約事務手数料3,850円。</dd></div>
<div><dt>注意点</dt><dd>ポイントは出金・譲渡不可。PayPayの利用設定が必要です。無制限プランにも速度制御等があるため、月額と生活圏での使い勝手が合うかを先に確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.softbank.jp/mobile/special/sim-paypay-point/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.softbank.jp/mobile/set/common/pdf/special/sim-paypay-point/paypay-points.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.softbank.jp/mobile/price_plan/data/teigaku-museigen/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.softbank.jp/shop/support/necessary/fee/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-iijmio-gigaplan-half-20261105" data-campaign-id="iijmio-gigaplan-half-20261105" data-carrier="iijmio" data-audiences="mnp new">
<summary><span class="campaign-company">IIJmio</span><span class="campaign-offer-title">ギガプラン半額｜15GBなら月800円・最大20GB</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>スマホをそのまま使い、月15GB前後の通信費を抑えたい人。割引と増量が終わっても15GBで足りるか、通常月額1,600円で納得できるかを先に確認してください。</dd></div>
<div><dt>特典</dt><dd>音声5・10・15・25・35GBの月額基本料を最大3カ月割引。15GBを選ぶと同期間に最大5GB増量され、満額適用の月は月800円で20GB使えます。</dd></div>
<div><dt>対象者</dt><dd>新しい番号での契約、または他社からの乗り換え（MNP）で、対象の音声SIMカード・音声eSIMを新たに申し込む人。</dd></div>
<div><dt>必須条件</dt><dd>受付期間中に対象容量を選んで申し込み、回線の利用を開始。特典が終わる月まで音声回線と申込時の容量を維持します。期間内に申し込めば、開通が受付終了後でも対象です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>2GB・45GB・55GB、データ専用・SMS用のSIM、JALモバイル・BIC SIM経由は対象外。対象容量同士でも途中で変更すると割引終了。15GBの増量は月額割引と併用でき、通話定額の無料特典には同時申込など別条件があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>IIJmio公式の特典ページから音声SIMまたは音声eSIMを選んで申込。半額・増量は対象回線の申込と開通が条件で、別途ポイントを受け取る手続きはありません。</dd></div>
<div><dt>受取時期・方法</dt><dd>利用開始月を含む最大3カ月の請求に反映。初月は基本料と増量分が日割りで、請求額を超えた割引分の翌月繰り越しはありません。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月5日受付開始。終了日は公式未定です。</dd></div>
<div><dt>月額料金</dt><dd>満額適用月の基本料は5GB 475円、10GB 700円、15GB 800円、25GB 1,000円、35GB 1,200円。割引終了後はそれぞれ950円、1,400円、1,600円、2,000円、2,400円。すべて税込、通話料やオプションは別です。</dd></div>
<div><dt>手数料</dt><dd>初期費用は11月時点で3,300円。音声SIMカードの発行料はタイプD 433.4円・タイプA 446.6円、音声eSIMはタイプD 433.4円・タイプA 220円。12月1日から新規申込時の初期費用は3,850円に改定予定です。</dd></div>
<div><dt>注意点</dt><dd>「20GB」は15GBプランに5GBを足した期間限定の容量です。初月は利用開始日に応じて使える容量が少なくなり、増量終了後は15GBに戻ります。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.iijmio.jp/campaign/mio.html?cptype=simcp" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.iijmio.jp/info/iij/1793256547.html" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.iijmio.jp/hdc/spec/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-mineo-autumn-fit-20260917" data-campaign-id="mineo-autumn-fit-20260917" data-carrier="mineo" data-audiences="mnp new">
<summary><span class="campaign-company">mineo</span><span class="campaign-offer-title">秋のピッタリ割：音声マイピタ最大6カ月割引</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>速さより月額を抑えた使い方を選び、最大3Mbpsの通信でも自分の用途に合う人。ポイント管理より請求額の割引を好む人。</dd></div>
<div><dt>特典</dt><dd>音声マイピタ3GB月880円、7GB・15GB月990円、30GB月1,320円、50GB月2,090円（最大6カ月）。3GB・7GBではパケット放題3Mbpsも条件付きで最大6カ月無料。</dd></div>
<div><dt>対象者</dt><dd>期間中に音声＋データのマイピタを新たに申し込む個人。MNP・新規番号とも対象。既存のシングルタイプからデュアルタイプへの変更は別の適用条件あり。</dd></div>
<div><dt>必須条件</dt><dd>11/30までに申し込み、12/31までにmineo側で申込を承諾できること。3GB・7GBの3Mbps割引は、回線とオプション同時申込など対象条件を満たす必要があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>法人、対象外コース、同回線での特典再適用等は対象外。割引額の異なるマイピタ・マイそく・シングルへの変更や解約で割引は継続されません。公式規約では他キャンペーン適用中でも本特典を適用するとしています。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>mineoの公式申込経路でマイピタのデュアルタイプを選択。3Mbpsオプションを使う場合は、必要なオプションを別途選択してください。</dd></div>
<div><dt>受取時期・方法</dt><dd>利用開始月から最大6カ月、毎月の請求額を割引。初月は請求額に応じた割引となり、ポイント受取操作はありません。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月30日まで。申込承諾の期限は12月31日。</dd></div>
<div><dt>月額料金</dt><dd>割引終了後は3GB月1,298円、7GB1,518円、15GB1,958円、30GB2,178円、50GB2,948円。3GB・7GBの3Mbpsは無料期間後月385円。15GB以上の同オプションは別条件で無料、申込は必要。通話料は別。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料3,850円。SIMカード発行料440円、eSIMプロファイル発行料は現在無料（提供プラン・対応端末の確認が必要）。</dd></div>
<div><dt>注意点</dt><dd>3Mbpsは高速データ容量の無制限ではありません。最大速度の制限があり、3日間10GB以上利用時の混雑回避制限もあります。通常料金とオプションの自動課金を含めて比較してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://mineo.jp/campaign/cp-20260917-1/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://mineo.jp/price/" rel="noopener noreferrer">公式の条件2</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-mineo-motorola-gift-20261126" data-campaign-id="mineo-motorola-gift-20261126" data-carrier="mineo" data-audiences="mnp new return">
<summary><span class="campaign-company">mineo</span><span class="campaign-offer-title">motorola 5機種の購入で電子マネーギフト1,000〜10,000円分</span><span class="campaign-status">開催中（条件付き）</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/27 8:05:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>mineoの回線契約や機種変更を予定し、対象motorolaを買いたい人。低価格機も対象なので、ギフト額より端末代と使い方で機種を選べます。</dd></div>
<div><dt>特典</dt><dd>電子マネーやポイントに交換して使えるEJOICAセレクトギフト。moto g06は1,000円分、moto g37jは1,500円分、edge 70 fusionとedge 60は5,000円分、razr 60は10,000円分です。</dd></div>
<div><dt>対象者</dt><dd>対象端末をmineoで購入する個人。回線の新規申込（乗り換えまたは新しい番号）と同時購入、既存利用者のプラン・タイプ変更に伴う購入、端末追加購入が対象です。</dd></div>
<div><dt>必須条件</dt><dd>対象機種を受付期間内に申し込み、2027年1月31日までにmineoの受付承諾が必要です。支払い状況で対象外になる場合があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>法人と、お試し200MBコースへの申込・利用中の対象端末購入は対象外。他の割引は各企画の適用条件を確認してください。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>mineo通信サービスを扱う公式Web、店舗、電話から購入。既にmineoを利用中ならマイページの端末追加購入も対象です。</dd></div>
<div><dt>受取時期・方法</dt><dd>mineoの課金開始月を1カ月目として3カ月目の月末までに、マイページへ付与しメールで通知。交換先と有効期限は受け取った案内を確認してください。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月26日〜12月27日に申込。mineoでの受付承諾は2027年1月31日まで。</dd></div>
<div><dt>月額料金</dt><dd>マイピタの音声通話付きは通常3GBで月1,298円、7GBで月1,518円。端末代と通話料は別です。</dd></div>
<div><dt>手数料</dt><dd>新規契約の通常事務手数料3,850円、SIMカード発行料440円。A・DプランのeSIMプロファイル発行料は無料で、SプランはeSIM非対応です。</dd></div>
<div><dt>注意点</dt><dd>ギフトは交換して使います。換金や払い戻しはできません。回線解約時にコンテンツユーザー登録も解除すると、マイページで受け取れなくなります。機種によって端末価格と特典額が違うため、購入総額で比べてください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://mineo.jp/campaign/cp-20261126/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://mineo.jp/price/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://mineo.jp/price/mypita/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>

</div>
<details class="campaign-history">

<summary>終了済み・確認中の特典（12件）</summary><p>受付終了後も、申し込み済みの人が条件を確認できるよう履歴を残しています。確認中の特典は、現在のおすすめに含めていません。</p>

<details class="campaign-offer" id="offer-linemo-v-free-20261116" data-campaign-id="linemo-v-free-20261116" data-carrier="linemo" data-audiences="mnp new return">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/22受付終了：ベストプランV基本料2カ月0円</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/23 8:08:12（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>30GBと5分以内の国内通話を使い、初期2カ月分の基本料を抑えたい人。既存の小容量プランから変更する場合は、割引後の月2,970円が使い方に合うかも確認してください。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：ベストプランVの月額基本使用料から税込2,970円を2カ月間割引します。ポイントや現金の給付ではありません。通話・オプション・手数料まで全て0円になる特典ではありません。</dd></div>
<div><dt>対象者</dt><dd>期間中にVを新たに契約する人。新しい番号、他社MNP、ソフトバンク・ワイモバイル・LINEモバイルからの移行も対象。既存のミニプラン・スマホプラン・ベストプランからVへ変更する人も対象です。</dd></div>
<div><dt>必須条件</dt><dd>11月16〜22日にVへ申し込み、新たな契約は申込月の翌月末までに開通。既存回線は期間中にVへの変更を申し込み、Vの適用を完了します。</dd></div>
<div><dt>対象外・併用条件</dt><dd>8日間キャンセルは対象外。割引期間中の解約・番号移行・他社MNP・譲渡や他プランへの変更は、その月で割引終了。公式の併用可リスト外のポイント等が付く企画と同時に条件を満たす場合は、本割引は対象外です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式オンラインでVを申し込みます。既存回線はMy MenuでVへのプラン変更を申し込みます。21時頃以降の変更申込は翌日受付扱いになる場合があるため、締切当日の遅い手続きは避けてください。</dd></div>
<div><dt>受取時期・方法</dt><dd>新規・MNP等は開通月の翌月から2カ月間。既存回線からのプラン変更はV適用開始月から2カ月間です。変更の適用は原則申込翌月で、締日21時頃以降などは翌々月になる場合があります。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月22日で対象申込の受付終了。期間内申込者の開通期限・割引条件は従来どおり。</dd></div>
<div><dt>月額料金</dt><dd>Vは30GB・月2,970円。新たな契約の開通月は通常の請求で、翌月から2カ月間は基本料0円、割引終了後は月2,970円。5分超過通話等とオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>新規・MNP等の通常契約事務手数料は3,850円。既存回線のプラン変更と新たな契約を区別してください。基本料の割引だけで手数料が無料になるわけではありません。</dd></div>
<div><dt>注意点</dt><dd>基本料割引は1回線1回限り。通常ポイント、おかえりだモン、追加申込・2回線まとめ等は公式の併用可リストにありますが、それぞれの条件を別途満たす必要があります。紹介特典との併用はできません。 現在の新規申込向けおすすめから外しています。期間内に申し込んだ人の割引まで終了したという意味ではありません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1116/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1116/pdf/syukakusai_1116-v.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261109-v" data-campaign-id="linemo-20261109-v" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/15増額受付終了：ベストプランVのPayPayポイント増額</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/16 8:06:11（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>毎月30GBと短い国内通話が必要で、受取までの期間とプラン条件を満たせる人。ポイントのためだけの高いプラン選択は勧めません。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：他社からの乗り換えは20,000円相当（通常12,000＋増額8,000）、新しい番号は14,000円相当（通常6,000＋増額8,000）。いずれも両方の条件を満たした場合です。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを使う人が、他社から番号を引き継ぐか、新しい番号で契約する場合。</dd></div>
<div><dt>必須条件</dt><dd>11月9〜15日にベストプランVへ申し込み、翌月末までに開通。Vの金額を受け取るには、開通月の6カ月後の判定月まで他プランへ変更しないこと。途中で変更するとベストプランの特典額になります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行は対象外。過去にLINEMOを申し込み開通した人、8日間キャンセル、特典判定前の譲渡も対象外。紹介など他のポイント特典とは併用できません。通常特典は同一名義の1回線目が対象です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>この特典の公式ページからオンラインで申し込み、申込画面で企画名と現在の携帯会社を確認。通常申込に追加のエントリーは不要です。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬に、My Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にPayPayにチャージします。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月15日で今回の増額申込受付は終了。期間内申込者は当時の開通・受取条件を確認してください。</dd></div>
<div><dt>月額料金</dt><dd>税込2,970円／月・30GB。1回5分以内の国内通話付き。一部番号・超過通話は別料金。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料は税込3,850円。通話やオプションは別料金です。</dd></div>
<div><dt>注意点</dt><dd>通常申込のポイント増額と紹介経由の特典は別ルートです。事務手数料や、開通から付与までの月額と合わせて比べてください。ポイントは出金・譲渡できません。 この金額は11月9〜15日の増額分を含む履歴で、11月16日以降の新しい申込には適用しません。通常のプログラム自体が終了した意味ではありません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1109/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1109/pdf/syukakusai_1109.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/paypaycpn_2025/pdf/paypaycpn_2025.pdf?20260715" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261109-best" data-campaign-id="linemo-20261109-best" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/15増額受付終了：ベストプランのPayPayポイント増額</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/16 8:06:11（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>毎月のデータが3～10GBに収まり、オンライン手続きとポイント受取の管理ができる人。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：他社からの乗り換えは14,000円相当（通常10,000＋増額4,000）、新しい番号は7,000円相当（通常3,000＋増額4,000）。いずれも両方の条件を満たした場合です。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを使う人が、他社から番号を引き継ぐか、新しい番号で契約する場合。</dd></div>
<div><dt>必須条件</dt><dd>11月9〜15日にベストプランへ申し込み、翌月末までに開通。通常のPayPayポイント特典の適用条件も満たしてください。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行は対象外。過去にLINEMOを申し込み開通した人、8日間キャンセル、特典判定前の譲渡も対象外。紹介など他のポイント特典とは併用できません。通常特典は同一名義の1回線目が対象です。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>この特典の公式ページからオンラインで申し込み、申込画面で企画名と現在の携帯会社を確認。通常申込に追加のエントリーは不要です。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬に、My Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にPayPayにチャージします。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月15日で今回の増額申込受付は終了。期間内申込者は当時の開通・受取条件を確認してください。</dd></div>
<div><dt>月額料金</dt><dd>税込990円／月（3GBまで）、3GB超～10GBは税込2,090円／月。国内通話は22円／30秒など別料金。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料は税込3,850円。通話やオプションは別料金です。</dd></div>
<div><dt>注意点</dt><dd>紹介を受けられる人は、ポイントと事務手数料の両方を比べてください。ポイントは出金・譲渡できません。 この金額は11月9〜15日の増額分を含む履歴で、11月16日以降の新しい申込には適用しません。通常のプログラム自体が終了した意味ではありません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1109/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1109/pdf/syukakusai_1109.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/paypaycpn_2025/pdf/paypaycpn_2025.pdf?20260715" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件4</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件5</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261109-referral" data-campaign-id="linemo-20261109-referral" data-carrier="linemo" data-audiences="mnp new">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/22手数料割引受付終了：紹介ポイント自体は継続</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/23 8:08:12（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>家族や知人から紹介リンクを受け取れて、事務手数料を抑えたい人。新しい番号で申し込む人は、通常申込のポイント額と比べてください。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：紹介を受けて初めて利用する人は、対象の他社から乗り換えでPayPayポイント14,000円相当、新しい番号で10,000円相当。紹介経由の条件を満たすと事務手数料3,850円も割引されます。</dd></div>
<div><dt>対象者</dt><dd>紹介者が発行した専用リンクからベストプランまたはベストプランVを申し込む人。ポイントはLINEMOの初回利用者が対象です。</dd></div>
<div><dt>必須条件</dt><dd>専用リンクから11月9〜22日に申し込み、翌月末までに開通。手数料割引には、契約時に事務手数料が発生することが必要です。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・ワイモバイル・LINEモバイルからの移行は紹介ポイントの対象外ですが、手数料割引は対象条件を満たせば適用されます。通常申込の週替わり増額との併用はできません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>紹介者から受け取った専用申込リンクを開き、そのまま手続き。申込時に現在の携帯会社を正しく選んでください。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬に、My Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にPayPayにチャージします。 手数料割引は請求に反映されます。</dd></div>
<div><dt>申込期限</dt><dd>紹介経由の手数料割引の対象申込は2026年11月22日で受付終了。紹介ポイント企画自体の終了日ではありません。</dd></div>
<div><dt>月額料金</dt><dd>ベストプランは3GBまで月990円、3GB超〜10GBは月2,090円。ベストプランVは30GBで月2,970円、1回5分以内の国内通話付き。いずれも税込で、一部通話やオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>割引の条件を満たすと契約事務手数料3,850円が0円。月額料金・通話・オプションは別です。</dd></div>
<div><dt>注意点</dt><dd>表示額は紹介された側のものです。同じ名義の複数回線では、紹介ポイントは原則1回線目。8日間キャンセルや特典付与前の回線譲渡は対象外です。 終了したのは11月9〜22日申込向けの手数料割引との組み合わせです。紹介ポイントの現行条件は開催中の紹介専用リンクの項目で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/invitation_202407/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/invitation_202407/pdf/activationfee-free_202611.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261109-return" data-campaign-id="linemo-20261109-return" data-carrier="linemo" data-audiences="mnp return">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/15増額受付終了：過去にLINEMOを使った人も対象：他社からの乗り換え</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/16 8:06:11（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>以前LINEMOを使っていて、今の他社回線から同じ番号で戻りたい人。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：専用ページから他社乗り換えし、両方の条件を満たすと、ベストプランVは14,000円相当（通常6,000＋増額8,000）、ベストプランは6,000円相当（通常2,000＋増額4,000）のPayPayポイントです。</dd></div>
<div><dt>対象者</dt><dd>過去にLINEMOを利用したことがあり、現在の他社回線の番号を引き継いでベストプランまたはベストプランVへ申し込む人も対象です。</dd></div>
<div><dt>必須条件</dt><dd>11月9〜15日に専用ページから乗り換えを申し込み、翌月末までに開通。Vの金額には開通月の6カ月後の判定月までプランを変えない条件があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>新しい番号での申込、ソフトバンク・ワイモバイル・LINEモバイルからの移行、8日間キャンセル、特典判定前の譲渡は対象外。週替わり増額は併用できますが、通常の初回ポイントや紹介特典とは併用できません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>「LINEMOおかえりだモンキャンペーン」の専用ページから申し込み、利用中の携帯会社を正しく選びます。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通月の7カ月後の上旬に、My Menuの登録メールへPayPayポイントコードを送付予定。受取日を含め30日以内にPayPayにチャージします。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月15日で今回の増額申込受付は終了。期間内申込者は当時の開通・受取条件を確認してください。</dd></div>
<div><dt>月額料金</dt><dd>ベストプランは3GBまで月990円、3GB超〜10GBは月2,090円。ベストプランVは30GBで月2,970円、1回5分以内の国内通話付き。いずれも税込で、一部通話やオプションは別料金です。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料は税込3,850円。通話やオプションは別料金です。</dd></div>
<div><dt>注意点</dt><dd>11月15日の期限は今回の増額分です。増額後の金額には通常特典の条件とプラン条件の両方があります。 この金額は11月9〜15日の増額分を含む履歴で、11月16日以降の新しい申込には適用しません。通常のプログラム自体が終了した意味ではありません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/okaeridamon/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/202611/1109/pdf/syukakusai_1109.pdf" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261104-v" data-campaign-id="linemo-20261104-v" data-carrier="linemo" data-audiences="">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/8受付終了：ベストプランVのポイント特典＋契約事務手数料無料</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/9 7:57:48（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>11月8日までに申し込んだ人が、手数料無料とポイントの条件を確認するための履歴です。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：他社MNPは12,000円相当、新しい番号は6,000円相当のPayPayポイント。別途、契約事務手数料3,850円を割引。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを申し込み、利用開始する人。他社からのMNPまたは新しい電話番号での契約。</dd></div>
<div><dt>必須条件</dt><dd>11/4～11/8に対象プランへ申し込み、申込月の翌月末までに開通。契約事務手数料が発生する申し込みが手数料割引の対象。Vの特典には、開通月の6か月後までVからプランを変更しない条件があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・Y!mobile・LINEモバイルからの乗り換え、過去にLINEMOを申し込み利用開始した人は通常ポイント特典の対象外。同一名義の複数回線は原則1回線目。紹介キャンペーン等とは併用不可。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>LINEMO公式オンラインで対象プランに申し込む。現在の携帯会社を正しく選択。通常のMNP・新規申込では専用エントリーは不要。</dd></div>
<div><dt>受取時期・方法</dt><dd>ポイントは開通月の7か月後の上旬予定。My Menuの登録メールへ届くコードを、受取日を含め30日以内にPayPayへチャージ。手数料割引は開通月の料金請求に適用。</dd></div>
<div><dt>申込期限</dt><dd>手数料無料は2026年11月8日で受付終了。期限内の申込は、申込月の翌月末までの開通など当時の条件を確認してください。</dd></div>
<div><dt>月額料金</dt><dd>税込2,970円／月・30GB。1回5分以内の国内通話付き。一部番号・超過通話は別料金。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料3,850円を、本企画の条件を満たす場合に請求から割引。通話・オプション等の利用料は別。</dd></div>
<div><dt>注意点</dt><dd>11月8日までに申し込んだ人には当時の適用条件が残ります。11月9日以降の申込は、開催中の各特典の案内を確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1104/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/js/data.json" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261104-best" data-campaign-id="linemo-20261104-best" data-carrier="linemo" data-audiences="">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/8受付終了：ベストプランのポイント特典＋契約事務手数料無料</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/9 7:57:48（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>11月8日までに申し込んだ人が、手数料無料とポイントの条件を確認するための履歴です。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：他社MNPは10,000円相当、新しい番号は3,000円相当のPayPayポイント。別途、契約事務手数料3,850円を割引。</dd></div>
<div><dt>対象者</dt><dd>初めてLINEMOを申し込み、利用開始する人。他社からのMNPまたは新しい電話番号での契約。</dd></div>
<div><dt>必須条件</dt><dd>11/4～11/8に対象プランへ申し込み、申込月の翌月末までに開通。契約事務手数料が発生する申し込みが手数料割引の対象。Vへの変更などで特典を自動的に上積みできるとは限りません。</dd></div>
<div><dt>対象外・併用条件</dt><dd>ソフトバンク・Y!mobile・LINEモバイルからの乗り換え、過去にLINEMOを申し込み利用開始した人は通常ポイント特典の対象外。同一名義の複数回線は原則1回線目。紹介キャンペーン等とは併用不可。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>LINEMO公式オンラインで対象プランに申し込む。現在の携帯会社を正しく選択。通常のMNP・新規申込では専用エントリーは不要。</dd></div>
<div><dt>受取時期・方法</dt><dd>ポイントは開通月の7か月後の上旬予定。My Menuの登録メールへ届くコードを、受取日を含め30日以内にPayPayへチャージ。手数料割引は開通月の料金請求に適用。</dd></div>
<div><dt>申込期限</dt><dd>手数料無料は2026年11月8日で受付終了。期限内の申込は、申込月の翌月末までの開通など当時の条件を確認してください。</dd></div>
<div><dt>月額料金</dt><dd>税込990円／月（3GBまで）、3GB超～10GBは税込2,090円／月。国内通話は22円／30秒など別料金。</dd></div>
<div><dt>手数料</dt><dd>通常の契約事務手数料3,850円を、本企画の条件を満たす場合に請求から割引。通話・オプション等の利用料は別。</dd></div>
<div><dt>注意点</dt><dd>11月8日までに申し込んだ人には当時の適用条件が残ります。11月9日以降の申込は、開催中の各特典の案内を確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202611/1104/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/js/data.json" rel="noopener noreferrer">公式の条件3</a> ／ <a href="https://www.linemo.jp/plan/" rel="noopener noreferrer">公式の条件4</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-linemo-20261024-point-increase" data-campaign-id="linemo-20261024-point-increase" data-carrier="linemo" data-audiences="">
<summary><span class="campaign-company">LINEMO</span><span class="campaign-offer-title">11/3申込分までのPayPayポイント増額企画</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/4 8:06:37（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>既に期間内に申し込んだ人が受取条件を確認するための履歴。現在の申し込みのおすすめ対象にはしません。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：他社MNP・ベストプランVでは通常特典と合わせ最大20,000円相当のPayPayポイント。</dd></div>
<div><dt>対象者</dt><dd>2026年10月24日～11月3日に対象条件で申し込んだ人。</dd></div>
<div><dt>必須条件</dt><dd>対象のポイント企画の適用条件を満たし、申込月の翌月末までに開通。V増額にはプラン変更の制限あり。</dd></div>
<div><dt>対象外・併用条件</dt><dd>11月4日以降の新しい申し込みには、この増額期間の条件を適用しません。移行元・過去の利用・他の特典との併用制限があります。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>当時の公式申込経路と提供条件に従う。</dd></div>
<div><dt>受取時期・方法</dt><dd>当時の対象ポイント企画の付与時期に準じる。コードは受取日を含め30日以内に受取手続き。</dd></div>
<div><dt>申込期限</dt><dd>申込期間は2026年11月3日まで。申込受付の終了であり、既に申し込んだ人の受取資格が一律に消える意味ではありません。</dd></div>
<div><dt>月額料金</dt><dd>当時の対象プランの料金がかかります。特典額だけで総費用を判断しないでください。</dd></div>
<div><dt>手数料</dt><dd>当時の同時開催企画を含む適用条件に従います。新しい申し込みは現在の企画で確認してください。</dd></div>
<div><dt>注意点</dt><dd>この増額企画の申込受付は終了しました。期間内に申し込んだ人は、当時の開通期限・付与時期を公式条件で確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.linemo.jp/campaign/syukakusai/202610/1024/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.linemo.jp/campaign/syukakusai/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.linemo.jp/campaign/js/data.json" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-store-3490-20261109" data-campaign-id="rakuten-store-3490-20261109" data-carrier="rakuten" data-audiences="mnp new">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">11/19増額受付終了：店頭初回契約20,000ポイント</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/20 8:04:56（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>11月9〜19日に対象クーポンで店頭申込を済ませ、開通・指定通話やポイントの受取条件を確認したい人。これから申し込む人のおすすめには含めません。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：条件を満たした新しい番号の契約・他社からの乗り換えに、楽天の期間限定ポイント20,000ポイント。</dd></div>
<div><dt>対象者</dt><dd>楽天モバイルショップで、楽天回線の通常の音声プランを初めて契約する楽天会員。動画セットも対象ですが、下の月額は通常プランです。</dd></div>
<div><dt>必須条件</dt><dd>店頭で申込後、2026年12月31日23:59までに利用を開始し、対象回線でRakuten Linkから10秒以上発信します。0570など指定の対象外番号は除きます。</dd></div>
<div><dt>対象外・併用条件</dt><dd>オンライン申込、再契約、データ専用、プラン変更、未納、開通・通話期限を過ぎた場合などは対象外。紹介・通常の初回ポイントや銀行連携の特典とは併用不可。端末特典は公式の併用可リストを確認してください。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>店頭での申込開始時に公式ページに載っているクーポンコードを本人が入力し、手続き完了前に表示を確認。後からの入力はできません。</dd></div>
<div><dt>受取時期・方法</dt><dd>2027年2月から5カ月間、毎月末ごろに4,000ポイントずつ進呈。各回の有効期間は付与日を含め3カ月です。</dd></div>
<div><dt>申込期限</dt><dd>20,000ポイントへの増額申込は2026年11月19日の各店閉店で受付終了。期間内申込者の開通・指定通話は12月31日23:59まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プラン（動画セット・データ専用を除く）は割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。国内通話無料はRakuten Link利用などの条件あり。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>一人1回。店頭で手続きを完了する前にクーポンコードを確認してください。来店や見積もりだけの抽選は別企画です。 20,000ポイントへの期間限定増額は11月19日の各店閉店で申込受付終了です。店頭の特典すべてが終了した意味ではありません。11月20日以降の新しい申込にこの増額条件は適用しません。期間内申込者には開通・指定通話・分割付与の条件が残ります。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/shop-limited-application/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-rakuten-bank-3456-20261109" data-campaign-id="rakuten-bank-3456-20261109" data-carrier="rakuten" data-audiences="mnp new">
<summary><span class="campaign-company">楽天モバイル</span><span class="campaign-offer-title">11/18 10時受付終了：楽天銀行連携の回線契約20,000ポイント</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/19 10:49:42（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>受付期間内に専用Webページから申し込み済みで、開通・指定通話・口座連携や受取期限を確認したい人。これから申し込む人のおすすめ対象には含めません。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：回線の初回契約に楽天の期間限定ポイント20,000ポイント。広告の最大28,000は、新規口座向けの別条件を満たした場合の合計です。</dd></div>
<div><dt>対象者</dt><dd>楽天銀行の口座を持つか、公式条件に沿って開設し、楽天回線の音声プランを初めて契約する楽天会員。新しい番号と他社からの乗り換えが対象。動画セットも対象ですが、下の月額は通常プランです。</dd></div>
<div><dt>必須条件</dt><dd>12月31日23:59までに利用開始、Rakuten Linkから10秒以上の対象通話、回線の申込と同じ楽天IDで、楽天銀行のハッピープログラム（楽天IDと口座の連携）を完了。11月9日23:59時点で銀行口座の開設も申込もしていなかった人は、指定の口座開設企画を経由します。</dd></div>
<div><dt>対象外・併用条件</dt><dd>店頭、アプリ内で完結した申込、クーポン未適用、再契約・データ専用は対象外。紹介・通常の初回特典・店頭20,000ポイントは併用不可。端末の特典は公式の併用条件を確認してください。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>専用ページの申込ボタンからWebで開始。本人確認でアプリに移動した場合はWebに戻り、完了前にクーポンが適用されていることを確認。</dd></div>
<div><dt>受取時期・方法</dt><dd>回線契約分は2027年2月から5カ月間、毎月末ごろに4,000ポイントずつ。各回は付与日の3カ月後の月末まで使えます。銀行分は別に受取手続きが必要です。口座開設分は2027年2月、ボーナス金利条件分は3月に銀行の画面で受け取ります。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月18日10:00に新しい申込の受付は終了。期間内申込者の開通・指定通話・口座連携は12月31日23:59まで。</dd></div>
<div><dt>月額料金</dt><dd>楽天モバイルの通常の音声プラン（動画セット・データ専用を除く）は割引前で3GBまで月1,078円、20GBまで2,178円、20GB超3,278円。国内通話無料はRakuten Link利用などの条件あり。</dd></div>
<div><dt>手数料</dt><dd>契約事務手数料は累計4回線目まで0円、同一名義で累計5回線目以降は3,850円。回線利用開始から1年以内の解約では、別途最大1,078円の解約事務手数料がかかる場合があります。</dd></div>
<div><dt>注意点</dt><dd>銀行分の最大8,000ポイントは、新規口座開設、アプリの初期設定、ATMまたは他行から一度に5万円以上の入金などで4,000ポイント。さらに指定の支払い設定、公式アカウントのフォロー、ボーナス金利へのエントリーなどを満たすと4,000ポイントです。 公式ページで2026年11月18日の終了案内を確認しました。新しい申込は対象外です。期間内に申込済みでも、残る必須条件や受取手続きは別途必要です。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://network.mobile.rakuten.co.jp/campaign/bank-mobile-joint/" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://network.mobile.rakuten.co.jp/fee/saikyo-plan/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://network.mobile.rakuten.co.jp/guide/commission/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-docomo-mini-sim-202611" data-campaign-id="docomo-mini-sim-202611" data-carrier="docomo" data-audiences="">
<summary><span class="campaign-company">ドコモ</span><span class="campaign-offer-title">再確認中：ドコモminiのSIMのみ契約特典</span><span class="campaign-status">開催状況を確認中</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/4 10:22:50（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>公式条件の再確認が完了するまで、おすすめ対象から外しています。過去に確認できた対象者・条件の参照用です。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：MNPはmini10GBで15,000ポイント、4GBで10,000ポイント。新規番号はどちらも5,000ポイント。いずれも期間・用途限定dポイントを5回に分割。</dd></div>
<div><dt>対象者</dt><dd>ドコモオンラインショップでドコモminiのSIMのみを契約する個人。ドコモやahamoからのプラン変更を、他社MNPとして扱いません。</dd></div>
<div><dt>必須条件</dt><dd>同じdアカウントでエントリーし、エントリー当月または翌月までに契約・開通。開通後のエントリーは開通月末まで。進呈時にdポイントクラブ会員である必要があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>端末同時購入、過去の同企画特典受取、1回線・1アカウントの複数適用等は対象外。同期間の対象プラン契約向け特典と併用できません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>公式キャンペーンページからエントリーし、ドコモオンラインショップでSIMまたはeSIMのみを契約。店頭の申し込みは本企画の対象経路ではありません。</dd></div>
<div><dt>受取時期・方法</dt><dd>開通の翌々月から5分割。10GBのMNPは毎月3,000、4GBは2,000、新規は1,000ポイントずつ。各回のポイントは進呈日から94日間有効。</dd></div>
<div><dt>申込期限</dt><dd>ドコモminiの新規申込受付は2026年11月30日まで。12/1以降はmini2へ対象が変更され、MNP特典は10,000ポイントになります。</dd></div>
<div><dt>月額料金</dt><dd>割引前：mini4GB月2,750円、10GB月3,850円。光回線・dカード等の割引には別条件。通話料・オプションは別。12月以降の新規mini2と、このminiの条件を混同しないでください。</dd></div>
<div><dt>手数料</dt><dd>ドコモオンラインショップの新規・MNP契約事務手数料は0円。</dd></div>
<div><dt>注意点</dt><dd>11月5日の再確認時、公式オンラインショップがシステムメンテナンス中のため、現在の適用条件を再確認できませんでした。開催中のおすすめから一時的に外しています。以下は最後に確認できた条件で、申し込み前に公式の復旧後の案内を確認してください。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://onlineshop.docomo.ne.jp/special/sim-campaign" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.docomo.ne.jp/charge/docomo_mini/" rel="noopener noreferrer">公式の条件2</a> ／ <a href="https://www.docomo.ne.jp/support/mnp_subscribe/" rel="noopener noreferrer">公式の条件3</a></p>
</div>
</details>
<details class="campaign-offer" id="offer-iijmio-voice-25g-20261104" data-campaign-id="iijmio-voice-25g-20261104" data-carrier="iijmio" data-audiences="">
<summary><span class="campaign-company">IIJmio</span><span class="campaign-offer-title">11/4受付終了：音声25GBの月額割引・データ増量</span><span class="campaign-status">終了</span><span class="campaign-expand">条件・受取方法</span></summary>
<div class="campaign-offer-body">

<p class="campaign-verified">公式情報の確認 2026/11/5 8:03:44（日本時間）</p>
<dl>
<div><dt>向いている人</dt><dd>11月4日までに申し込んだ人が当時の特典条件を確認するための履歴。現在の新規申込のおすすめには含めません。</dd></div>
<div><dt>特典</dt><dd>現在のおすすめ対象から外しています。過去の特典：25ギガ音声プランへ新たに申し込むと、組み合わせた月額割引で最大6カ月月900円、5GB増量で30GB。5ギガ音声プランの月550円は最大3カ月の別条件です。</dd></div>
<div><dt>対象者</dt><dd>ギガプランの25ギガ音声SIM・音声eSIMを新たに申し込む人。初回・追加・MNPが対象で、利用中のギガプランの単なる容量変更とは別です。</dd></div>
<div><dt>必須条件</dt><dd>受付期間中に対象サービス・容量で申し込み、利用開始すること。月額割引は申込時と同一容量・音声機能を特典満了まで継続する条件があります。</dd></div>
<div><dt>対象外・併用条件</dt><dd>JALモバイル・BIC SIM、対象外のデータ・SMS回線、容量変更・解約等は対象外または割引終了。指定する一部キャンペーンとは併用できません。</dd></div>
<div><dt>申込経路・エントリー</dt><dd>IIJmio公式Webから音声25ギガを選択。eSIMの初期費用割引は公式Webでの新規申込に限り、量販店パッケージ等は対象外です。</dd></div>
<div><dt>受取時期・方法</dt><dd>月額割引と増量は利用開始月から最大6カ月。初月の月額料金とデータ量は日割り。期間内申込なら利用開始が期間外でも対象ですが、利用開始が必要です。</dd></div>
<div><dt>申込期限</dt><dd>2026年11月4日の申込分まで。端末セット特価の21:59という期限と、このSIM月額企画の受付日を混同しないでください。</dd></div>
<div><dt>月額料金</dt><dd>期間内に申し込んだ人向けの過去条件：通常25GB月2,000円→最大6カ月900円、以後は通常料金。音声通話・通話定額は別申込・別料金。通話定額10分＋の最大6カ月無料は同時申込など別条件です。</dd></div>
<div><dt>手数料</dt><dd>期間内に申し込んだ人向けの過去条件：SIMカード初期費用3,300円＋発行手数料。公式Webの新規eSIMは11/4まで初期費用1,650円（対象機能ごと1名義1回線まで）、プロファイル発行料は同日までの別企画を満たす場合に割引。</dd></div>
<div><dt>注意点</dt><dd>申込受付は2026年11月4日で終了しました。期間内に申し込んだ人は、当時の利用開始・継続・容量変更等の条件を確認してください。受付終了により既存申込者の割引が直ちに失効する意味ではありません。</dd></div>
</dl>
<p class="campaign-sources">出典 <a href="https://www.iijmio.jp/campaign/mio.html" rel="noopener noreferrer">公式の条件1</a> ／ <a href="https://www.iijmio.jp/gigaplan/esim/" rel="noopener noreferrer">公式の条件2</a></p>
</div>
</details></details>
</section>
{/* mobile-campaigns:end */}

<div id="plan-diagnosis"></div>

## 料金を見直す前に、請求額と使用量を確認しよう

スマホの通信費に、毎月いくら払っていますか。

請求額は見ていても、「自分の使い方なら高いのか、妥当なのか」までは分かりにくいものです。総務省統計局の家計消費状況調査では、2025年のスマートフォン・携帯電話などの通信・通話使用料は、1世帯あたり月平均9,129円でした。二人以上の世帯は11,464円、単身世帯は5,383円です。端末代や自宅のインターネット代は別なので、まずは自分の請求書にある「回線料金」を見比べてみてください。

この記事では、データ量・重視すること・現在の契約先という3問から、候補を絞ります。最安ランキングではなく、**自分に合う料金の決まり方を見つけるための診断**です。

平均額は目安であって、「9,129円より高ければ必ず払いすぎ」という意味ではありません。家族の回線数、通話オプション、端末補償などで請求は変わります。

見る順番は次のとおりです。

1. キャリアのアプリや請求書で、回線料金と端末代を分ける
2. 直近3カ月のデータ使用量を見る
3. 通話オプション、補償、動画サービスなどの追加料金を確認する

<Callout kind="facts" title="診断の出発点">
  <p><strong>いちばん大事なのは契約容量ではなく実使用量です。</strong>30GBプランを契約していても毎月3GBしか使っていないなら、見直し余地があります。反対に、毎月上限ぎりぎりなら、安さだけで容量を減らすと使いにくくなります。</p>
</Callout>

## 3問診断：自分に合う回線の方向を決める

### Q1. 月に使うデータ量は？

- **3GB以下**：自宅や職場のWi-Fiが中心。低容量プランを優先
- **3〜20GB**：SNS、地図、音楽、時々動画。料金と品質のバランスを優先
- **20GB以上・無制限**：外でも動画やテザリングをよく使う。大容量の上限と速度制御を確認

### Q2. 何をいちばん重視する？

- **料金の安さ**：オンライン手続きや初期設定を自分でできるなら、格安SIMやオンライン専用プラン
- **通信品質**：昼休みや通勤時間も使うなら、回線の混雑傾向や自分の生活圏でのつながりやすさ
- **店舗サポート**：対面相談が必要なら、Y!mobileやUQ mobileなど店舗がある候補

### Q3. 今はどこと契約している？

- **大手キャリア**：家族割、固定回線とのセット、端末の分割残額を先に確認
- **サブブランド**：十分安い場合も多い。容量が余っているか、割引終了後の通常料金を見る
- **格安SIM**：さらに安くするより、速度・通話・サポートの不満を解消できるかで選ぶ

<CharacterBubble speaker="himari" mood="curious">私なら、使う量と困っていることから決めればいいの？</CharacterBubble>

<CharacterBubble speaker="labo" mood="point">そう。会社名から選ぶより、条件から候補を減らすほうが失敗しにくいよ。</CharacterBubble>

## 診断結果：タイプ別に候補を2〜3社へ絞る

### 少量・とにかく安くしたい：IIJmio、日本通信

自宅のWi-Fiが中心で、外では連絡や地図を見る程度なら、低容量の料金が細かく用意された回線が合います。

- **IIJmio**：2GBから段階的に選べるため、少量から中量まで容量を合わせやすい
- **日本通信SIM**：1GB込み290円のプランがあり、使わない月の固定費を抑えやすい

ただし、混雑時間帯の体感や店舗サポートは大手キャリアと同じではありません。設定を自分で進められるかも判断材料です。

<MobileCarrierCTA carrier="iijmio" description="2GB・5GB・10GBなど、実際に使う量に近い通常料金を確認できます。" />

### 中量・料金と安心感のバランス：UQ mobile、Y!mobile、ahamo

毎月3〜20GB程度使い、料金だけでなく回線やサポートも重視する人の中心候補です。

- **UQ mobile**：店舗で相談でき、35GBと10分以内の国内通話が含まれるプランがある
- **Y!mobile**：店舗サポートがあり、5GB・30GB・35GBから選びやすい
- **ahamo**：30GBで5分以内の国内通話が含まれ、オンラインで完結しやすい

UQ mobileとY!mobileは、セット割を使うかどうかで実際の支払額が変わります。この記事の比較表では、腐りにくいように割引前の通常料金を載せています。

<MobileCarrierCTA carrier="uq" description="コミコミプランバリューなど、割引前の料金と含まれる通話サービスを確認できます。" />

<MobileCarrierCTA carrier="ymobile" description="通常料金や申込条件を、正規取扱店Yステーションで確認できます。" />

<MobileCarrierCTA carrier="ahamo" description="30GBと大盛りの通常料金、国内通話や海外利用の条件を確認できます。" />

### 大容量・無制限を使いたい：楽天モバイル、povo、ahamo

動画、テザリング、外出先での作業が多いなら、単純な月額だけでなく容量上限と買い方を見ます。

- **楽天モバイル**：使ったデータ量に応じて料金が上がり、20GB超は定額。毎月の使用量が変わる人に合いやすい
- **povo**：必要なデータをトッピングで買う方式。月ごとの差が大きい人や、使う時期を自分で管理できる人向け
- **ahamo**：110GBの大盛りがあり、毎月ほぼ同じ大容量を使う人が管理しやすい

povoは基本料0円ですが、0GB時は最大128kbpsで、180日間以上有料トッピングの購入などがない場合は利用停止・契約解除になることがあります。「ずっと無料で高速通信できる」という意味ではありません。

### 店舗サポートを重視：UQ mobile、Y!mobile

初期設定、データ移行、料金相談を対面で進めたいなら、店舗の有無を先に見ます。オンライン専用プランより月額が高く見えても、困った時に相談できることへ価値を感じる人には合理的です。

ただし、店舗で無料対応される範囲は手続きによって異なります。訪問前に、予約の要否とサポート料金を公式サイトで確認してください。

## 主要7社の通常料金を容量帯で比較

<p class="lead">以下は<strong>2026年8月4日時点</strong>に各社公式サイトで確認した税込の通常料金です。期間限定キャンペーンや家族・固定回線・カードの割引は入れていません。</p>

<ComparisonTable
  responsive
  headers={["回線", "少量の代表例", "中量の代表例", "大容量の代表例", "向いている人"]}
  rows={[
    ["IIJmio", "2GB 850円", "15GB 1,600円", "35GB 2,400円", "容量を細かく合わせたい"],
    ["日本通信SIM", "1GB 290円", "20GB 1,390円", "50GB 2,178円", "通話込みでも固定費を抑えたい"],
    ["Y!mobile", "5GB 3,278円", "30GB 4,378円", "35GB 5,478円", "店舗サポートと割引条件を重視"],
    ["UQ mobile", "—", "35GB 3,828円", "—", "10分通話込みと店舗を重視"],
    ["ahamo", "—", "30GB 2,970円", "110GB 4,950円", "分かりやすいオンラインプランがよい"],
    ["楽天モバイル", "3GBまで 1,078円", "20GBまで 2,178円", "20GB超 3,278円", "使用量が月ごとに変わる・無制限重視"],
    ["povo", "3GB/30日 990円", "30GB/月 2,780円", "必要量を都度追加", "使う時期と容量を自分で管理できる"],
  ]}
/>

<Callout kind="unc" title="月額だけで決めない">
  <p>「通常料金が安い順」だけで決めないでください。通話込みか、店舗があるか、昼休みに使いやすいか、固定回線などの割引条件を満たせるかで、実際の満足度は変わります。</p>
</Callout>

## 乗り換え前に確認する5つのこと

### 1. MNP予約番号が必要か

現在は「MNPワンストップ」に対応した会社同士なら、予約番号なしで移れる場合があります。対応していない組み合わせではMNP予約番号が必要です。予約番号には有効期限があるため、取得後は早めに申し込みます。

### 2. 違約金や端末の残額

回線を解約しても、分割払い中の端末代がなくなるわけではありません。短期解約などで契約解除料が発生する条件も会社ごとに異なるため、マイページと公式の重要事項を確認します。

### 3. 端末の対応バンド

今のスマホをそのまま使う場合は、乗り換え先の動作確認端末一覧を見ます。SIMロックだけでなく、使う周波数帯に対応しているかも重要です。

### 4. キャリアメールを残すか

大手キャリアのメールアドレスを使っている場合、解約後も持ち運ぶ有料サービスがあります。銀行、通販、各種ログインに登録したメールを先に洗い出しておくと安全です。

### 5. 支払い方法と本人確認書類

クレジットカードだけでなく口座振替に対応する会社もありますが、条件は同じではありません。契約者名義、支払い名義、本人確認書類の住所が一致しているかも確認します。

## よくある質問

### 携帯代は月いくらなら安いですか？

回線単体で見るなら、少量利用は月1,000円前後、中量は2,000〜4,000円前後が候補になります。ただし、端末代・補償・通話定額を含むかで請求額は変わります。まず内訳を分けて比べてください。

### 格安SIMにすると電話番号は変わりますか？

MNPを使えば、現在の電話番号を引き継げます。新規契約を選ぶと新しい番号になるため、申し込み画面で「他社から乗り換え」を選びます。

### 3GBで1カ月足りますか？

自宅や職場のWi-Fiが中心で、外ではメッセージ、地図、短時間のSNSが中心なら足りる可能性があります。外で動画を見る、テザリングする、アプリ更新をする人は不足しやすいです。直近3カ月の使用量で判断してください。

### 通信品質を優先するなら大手キャリアのままがいいですか？

必ずしも一択ではありません。大手のオンライン専用プランやサブブランドも候補です。一方、格安SIMは混雑時間帯の体感に差が出ることがあるため、生活圏と利用時間に合うかを確認します。

### 店舗で相談できる安い回線はありますか？

Y!mobileとUQ mobileは店舗があります。ただし、手続き内容やサポート範囲によって費用がかかる場合があるので、来店予約時に確認してください。

## 端末と回線は別々に選ぶと整理しやすい

スマホ本体は「iPhoneかAndroidか」「予算はいくらか」で選び、回線は「データ量・品質・サポート」で選びます。2つを一度に決めようとすると、端末割引と月額料金が混ざって比較しにくくなります。

端末側の判断は、対になる常設ハブの[「iPhoneとAndroid、結局どっちが向いている？」](/articles/iphone-vs-android/)で整理できます。

## まとめ：迷ったら3カ月分の使用量から始める

- 3GB以下ならIIJmio・日本通信SIMなどの低容量を確認
- 3〜20GBならUQ mobile・Y!mobile・ahamoで料金、通話、店舗を比較
- 20GB超なら楽天モバイル・povo・ahamoの容量の買い方を比較
- 大手から乗り換える前に、セット割、端末残額、メール、対応端末を確認

この記事は更新型です。通常料金表と、冒頭のキャンペーン欄は確認日が異なります。キャンペーンは上の各項目の公式情報の確認日時を見て、申し込み前にも対象・受取条件・期限を確認してください。

## 参考情報

- [総務省統計局「2025年 家計消費状況調査の概要」](https://www.stat.go.jp/data/joukyou/2025ar/gaiyou/pdf/25gaiyou.pdf)
- [IIJmio「ギガプラン」](https://www.iijmio.jp/gigaplan/)
- [日本通信SIM「合理的なスマホ料金」](https://www.nihontsushin.com/)
- [Y!mobile「月額基本使用料変更のお知らせ」](https://www.ymobile.jp/jusetsu/jusetsu04/)
- [UQ mobile「料金プラン」](https://www.uqwimax.jp/mobile/plan/)
- [ahamo「料金プラン」](https://ahamo.com/plan/)
- [楽天モバイル「料金プラン」](https://network.mobile.rakuten.co.jp/fee/saikyo-plan/)
- [povo「トッピング一覧」](https://povo.jp/topping-list/)
- [NTTドコモ「MNPを利用した解約」](https://www.docomo.ne.jp/support/mnp_subscribe/)
