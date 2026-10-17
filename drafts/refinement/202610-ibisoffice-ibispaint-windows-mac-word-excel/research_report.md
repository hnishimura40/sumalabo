# Research Pass — ibisOffice

調査日: 2026-10-18（日本時間）
対象: 2026-10-17のスカウト済み記事。一次資料で内容を再確認した。

## 確定した事実（発表主体の記載）

- アイビスは2026年10月12日にibisOfficeをリリースしたと10月14日付の発表で説明した。Wordの.docx、Excelの.xlsx、PowerPointの.pptxを閲覧・編集・保存するソフトである。[アイビス公式発表](https://www.ibis.ne.jp/20261014-ibisoffice/)
- バージョン0.8.1のデスクトップ版はWindows 11以降の64bit Intel互換CPU、macOS 11以降のApple Siliconに対応する。インストール不要のWeb版はWebGPU対応ブラウザが必要。[公式製品仕様](https://www.ibis.ne.jp/20261014-ibisoffice/)
- マクロ付きの.docm、.xlsm、.pptmも開いて保存できるが、マクロは実行しない。[公式発表](https://www.ibis.ne.jp/20261014-ibisoffice/)
- Web版で手元のファイルを開く場合、内容は外部サーバーへ送られず、ブラウザ内で処理されると開発元は説明する。[公式発表](https://www.ibis.ne.jp/20261014-ibisoffice/)
- ソースは公開され、AGPL-3.0と商用ライセンスの二本立て。公式GitHubにダウンロードとブラウザ試用先がある。[公式GitHub](https://github.com/ibisjp/ibis-office) / [v0.8.1リリース](https://github.com/ibisjp/ibis-office/releases/tag/v0.8.1)

## 開発元の主張・検証の限界

- Officeと同じ見た目を目指し、試験文書で画素比較しているというのは開発元の説明。すまラボによる全形式・全機能の互換性検証ではない。
- 高速性の比較値は開発元が選んだ文書と環境での単回測定であり、誰のPCでも同じ速度とは言えない。記事の中心には置かない。

## 未確定・将来計画

- Linux版、共同編集、ibisStorage上でのオンライン編集は将来計画として記載されている。現時点で一般提供済みとは書かない。
- 複雑な業務文書の完全互換や全ブラウザ対応は確定しない。元ファイルの控えと、編集後の表示確認が必要。
