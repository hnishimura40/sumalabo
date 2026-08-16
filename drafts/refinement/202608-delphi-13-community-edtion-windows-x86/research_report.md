# Research Report: Delphi 13 Community Edition

- 出所: Codexによる一次情報優先調査
- 調査日時: 2026-08-17 JST
- 対象: Delphi 13 Community Editionの提供開始と、利用前に確認すべき範囲

## facts（公式ページで確認できたこと）

EmbarcaderoのDelphi Community Edition公式ページは、サイト上部と無料版メニューで「Delphi 13 CE」を案内している。本文の「What's in Delphi CE 13」では、Community Editionが12.1からFlorence世代へ進み、新しいDelphi言語機能、Android 15とiOS 18への対応更新、ネイティブ64-bit IDE、64-bit language server、エディター分割表示、Focus Mode、コードナビゲーション改善などを利用できるとしている。

公式ページは、単一のDelphiコードベースからWindows、macOS、Android、iOS向けアプリを開発できると説明している。開発環境そのものはWindows上で動き、macOS／iOS向けのビルドや署名にはMac、Xcode、Apple Developer Programなど別途の環境・条件が必要になる。Delphi CE 13にはIDE内AIアシスタント「Kai」は含まれず、対応もしないと公式ページに明記されている。

Community Editionは誰でも無条件に商用利用できる製品ではない。日本語公式ページでは、個人開発者の有料アプリ等の年間売上が5,000 USドル未満、スタートアップは企業全体の年間売上が5,000 USドル未満かつ開発者5名以下などの条件を示す。企業所属者が私的利用する場合も、企業PC・企業メール・企業ネットワークの扱いに注意が必要とされている。詳細はライセンス本文の確認が必要である。

## claims（報道・ページ更新状況から採用を限定すること）

スカウト元の見出しは、Windows x86／Arm、Mac、iOS、Android向けネイティブアプリ開発を広くうたっている。ただし、Delphi CE 13公式ページが明示するのは「Windows、macOS、Android、iOS」とAndroid 15／iOS 18、64-bit IDE等であり、Windows on Arm用コンパイラがCommunity Editionに含まれるかまでは本文で明記していない。Windows on ArmはRAD Studio 13.1の公式資料で追加機能として確認できるが、CE 13への同梱を意味するとまでは断定しない。

「フル機能」という表現は公式にもあるが、有料版と全機能が同じという意味ではない。Kai非対応、利用資格、エンタープライズ向け接続や一部GetIt機能などに差があるため、「学習・個人開発に必要な主要IDE機能を備える無料版」と噛み砕く。

## uncertain_points（公開時点でも確認を促すこと）

公式のCommunity Edition Q&Aには、同じ2026年8月17日時点でも「現在の最新バージョンは12.1 Athens」と残る箇所がある。一方、ダウンロードページとサイトメニューはDelphi 13 CEを明記しており、更新の行き違いとみられる。実際に入手できるビルド番号、Windows on Armターゲット、Android 16／iOS 26など13.1相当機能の有無は、ダウンロード後のFeature Managerとライセンス情報で確認する必要がある。

インストールできるOSと、生成できるアプリの対象OSは別である。RAD Studio Florenceの公式インストールノートでは、IDEは64-bit版Windows 10／11を前提とする。macOSやiOSを対象にできることを「Mac単体へIDEを入れられる」と誤解させない。

## 読者に関係する判断材料

学生、趣味の個人開発者、小規模な個人販売でDelphiを学び直したい人には、12.1より新しいIDE機能へ無料で移れることが大きい。既に企業で開発している人、年間売上や請負売上が上限を超える人、Kaiや有料版機能を必要とする人はCEではなくTrialまたは有料版を検討する。まず公式の利用資格を確認し、対応プラットフォームはFeature Managerで実物確認してから環境構築するのが安全である。

## 参考URL

- https://www.embarcadero.com/jp/products/delphi/starter
- https://www.embarcadero.com/jp/products/delphi/starter/faq
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Installation_Notes
- https://docwiki.embarcadero.com/RADStudio/Florence/en/Supported_Target_Platforms
