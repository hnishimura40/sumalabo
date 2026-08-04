export type MobileCarrierKey = "uq" | "ahamo" | "ymobile" | "iijmio" | "rakuten";

type MobileCarrierLink = {
  label: string;
  officialHref: string;
  affiliateHref: string;
  network: "VC" | "A8";
};

// 回線アフィリエイトの単一設定場所。
// 提携済みかつ管理画面で発行したリンクだけ affiliateHref に入れる。
// 空欄の間は公式サイトへの通常リンクとして表示され、記事本文の変更は不要。
export const mobileCarrierLinks: Record<MobileCarrierKey, MobileCarrierLink> = {
  uq: {
    label: "UQ mobile",
    officialHref: "https://www.uqwimax.jp/mobile/",
    affiliateHref: "", // VC: 管理画面で提携済みを確認後に発行URLを設定
    network: "VC",
  },
  ahamo: {
    label: "ahamo",
    officialHref: "https://ahamo.com/",
    affiliateHref: "https://px.a8.net/svt/ejp?a8mat=4B8B4X+1RPG1U+4TIO+5YJRM", // A8 s00000022488001 / すまラボ 003
    network: "A8",
  },
  ymobile: {
    label: "Y!mobile",
    officialHref: "https://www.ymobile.jp/",
    affiliateHref: "https://px.a8.net/svt/ejp?a8mat=4B8B4X+ZQ2MA+424K+BY642", // A8 Yステーション s00000018938002 / すまラボ 003（VC公式承認後に差し替え）
    network: "A8",
  },
  iijmio: {
    label: "IIJmio",
    officialHref: "https://www.iijmio.jp/",
    affiliateHref: "", // VC: 提携待ち予約枠
    network: "VC",
  },
  rakuten: {
    label: "楽天モバイル",
    officialHref: "https://network.mobile.rakuten.co.jp/",
    affiliateHref: "", // A8: 提携待ち予約枠
    network: "A8",
  },
};
