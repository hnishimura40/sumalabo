# research_report: Anthropic「Claude for Teachers」

## 【出所】

### 公式・一次情報
- Anthropic公式発表
  https://www.anthropic.com/news/claude-for-teachers
- Claude for Teachers公式ページ
  https://claude.com/solutions/teachers
- 対象・機能・データ利用に関する公式ヘルプ
  https://support.claude.com/en/articles/15926041-claude-for-teachers-your-data-and-our-terms
- U.S. K-12 Terms of Service
  https://www.anthropic.com/legal/k12-terms
- U.S. K-12 Data Processing Agreement
  https://www.anthropic.com/legal/k12-dpa
- 教員向けスキルの公開リポジトリ
  https://github.com/anthropics/k12-teacher-skills
- Learning Commons
  https://learningcommons.org/
- AI Fluency for PK-12 Educators
  https://anthropic.skilljar.com/path/ai-fluency-for-pk-12-educators

### 報道・二次情報
- EdSurge
  https://edsurge.com/news/anthropic-introduces-claude-for-teachers
- The Verge
  https://www.theverge.com/ai-artificial-intelligence/965544/anthropic-introduced-a-claude-product-for-k-12-teachers

## facts

- Anthropicは**2026年7月14日**、「Claude for Teachers」を発表した。
- 対象は、**米国のK-12学校で働く認証済みの個人教員・教育職員**。教科担任のほか、指導コーチ、専門職、介入支援担当、司書、カウンセラーなどの有資格職員が例示されている。学校メールで認証する。
- 現行制度は**米国の教員向け**であり、日本を含む米国外の教員は対象に含まれていない。将来の海外展開は別途未発表。
- 教員専用で、**生徒向けサービスではない**。AnthropicはClaudeの「18歳以上」方針に沿うとしている。18歳以上の生徒でも、教員としての利用でなければ通常の消費者向け規約が適用される。
- **2027年6月30日まで**に登録すると、認証後から**丸1年間**無料で利用できる。
- 公式ヘルプ上の位置付けは、**Claude Pro相当の機能を含む、教員向けの無料Claude for Teamsプラン**。通常の無料アカウントより利用上限は高いが、具体的な回数は公表されていない。
- Teamsの全機能が使えるわけではない。請求、座席購入、メンバー管理、権限管理、SSO、使用額管理などは無効化されている。
- **Claude CodeとClaude Cowork**が含まれる。名簿、診断結果、出欠、教員メモなどをまとめて分析する例や、退室チケットを**毎登校日の午後4時**に確認する定例処理が紹介されている。
- Learning Commonsコネクターを通じ、**米国50州の教育基準、前提となる技能、学習順序、カリキュラム情報**を参照できる。OpenSciEdやIllustrative Mathematicsの教材も例示されている。
- 教員向けスキルとして、少なくとも公開リポジトリでは**授業計画作成**と**習熟度別の授業差別化**の2種類が確認できる。「多数の機能が入った巨大なライブラリ」とまでは断定しない方が安全。
- Claude for Teachersに入力・アップロード・接続した内容と、Claudeの出力は、**モデル学習に使わない**と規約で明記されている。入力の権利は利用者側に残り、出力も利用者側が所有する。
- 生徒情報はK-12向けDPAの対象となる。Anthropicはデータ処理者として、サービス提供に必要な範囲で利用者の指示に従って処理するとしている。
- 「FERPA準拠」と言い切るより、公式表現に合わせて**「FERPAに沿うよう設計」「FERPA-aligned」「FERPAへの適合を意図したDPA」**と書く方が正確。独立機関による認証取得とは書かれていない。
- 教員が生徒データを自由にアップロードしてよいわけではない。規約では、学校を代表する権限や、FERPAなどに基づいてデータを処理する権限が必要とされている。
- 出力には誤り、不完全、古い情報が含まれる可能性があり、利用前の**人による確認と事実確認**が利用者側の責任とされている。
- 現在は**個人教員向け**。学校・学区向けの専用プランは「coming soon」とされ、開始日や料金は未発表。
- 日本の教員が直接利用できる無料プランではないが、AI活用研修はモデル非依存・Creative Commonsライセンスで公開され、教員向けスキルもApache 2.0で公開されている。考え方や教材設計は日本でも参考にできる。

## claims

- Anthropicは、授業準備、教材作成、個別対応、保護者連絡、事務作業を効率化し、教員が生徒と向き合う時間を増やせるとしている。ただし、開始直後であり、Claude for Teachers自体の大規模な効果検証結果はまだない。
- 教員の実例や推薦コメントは掲載されているが、公式ページ内の事例・利用者の声であり、独立した比較試験ではない。
- EdSurgeは、教育AI市場をめぐる競争をAnthropicが一段強めた動きと評価。The Vergeも、OpenAIなどを含む教育特化AIへの流れの一部と位置付けている。これは報道側の市場評価であり、公式の確定事実ではない。
- AFTの「Gold Standard」に基づくと紹介されているが、公式発表ではAFTが基準を**策定中**とも説明されている。「AFTによる認証済み」とは扱わない。

## uncertain

- **日本向けClaude for Teachersが提供されるか、いつ提供されるかは不明**。現時点の無料提供は米国K-12教員限定。
- 日本の学習指導要領、教科書、評価基準に対応するLearning Commons接続は発表されていない。現在確認できるのは米国50州の基準。
- 日本の個人情報保護法、自治体の情報セキュリティ規程、校務用端末の運用ルールに適合するかは公式発表から判断できない。
- 日本の学校で児童・生徒の氏名、出欠、成績、診断情報などを入力してよいかは、学校・教育委員会ごとの規程確認が必要。
- 無料期間終了後の料金、継続条件、自動移行の有無は未公表。
- 利用回数やClaude Code・Coworkの正確な上限は未公表。「通常の無料版より多い」ことだけ確認できる。
- 学校・学区向け専用プランの開始日、管理機能、契約条件、料金は未定。
- MagicSchool、Canva、TeachFXなど第三者コネクターはAnthropicのサービスとは別扱い。接続先ごとのデータ利用条件や保存期間は個別確認が必要。
- 教員の作業時間、授業の質、児童・生徒の成績にどの程度影響するかは未確定。Anthropicはデトロイト公立学校区で評価を行う予定だが、結果はまだ出ていない。
