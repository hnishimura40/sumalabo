// src/data/affiliateLinks.ts — 資産記事の購入リンク元データ
//
// 各モールの"素の"URL を入れる。楽天は src/config/affiliate.ts の rakutenAffiliateId が
// 設定済みのため、buildMallLink 経由で自動的に hb.afl.rakuten.co.jp の
// 正規アフィリエイトリンク（rel="sponsored"）へ変換される。
// Amazon / Yahoo は ASP 未開通のため通常リンク（rel="noopener"）のまま共存する。
//
// 楽天リンクは「型番で絞った検索URL」を採用（item URL は失効しやすいため）。
// 型番キーワードにより "その商品" の販売ページに着地する。2026-07-19 楽天開通で一斉有効化。
export const affiliateLinks = {
  "apple-20w-usb-c": {
    amazon: "https://www.amazon.co.jp/s?k=Apple%2020W%20USB-C%E9%9B%BB%E6%BA%90%E3%82%A2%E3%83%80%E3%83%97%E3%82%BF",
    rakuten: "https://search.rakuten.co.jp/search/mall/Apple%2020W%20USB-C%E9%9B%BB%E6%BA%90%E3%82%A2%E3%83%80%E3%83%97%E3%82%BF/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Apple%2020W%20USB-C%E9%9B%BB%E6%BA%90%E3%82%A2%E3%83%80%E3%83%97%E3%82%BF",
    official: "",
  },
  "anker-511-nano-3-30w": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20511%20Charger%20Nano%203%2030W",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20511%20Charger%20Nano%203%2030W/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20511%20Charger%20Nano%203%2030W",
    official: "",
  },
  "belkin-30w-pd-pps": {
    amazon: "https://www.amazon.co.jp/s?k=Belkin%20BoostCharge%2030W%20USB-C%20PD%20PPS",
    rakuten: "https://search.rakuten.co.jp/search/mall/Belkin%20BoostCharge%2030W%20USB-C%20PD%20PPS/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Belkin%20BoostCharge%2030W%20USB-C%20PD%20PPS",
    official: "",
  },
  "samsung-45w-power-adapter": {
    amazon: "https://www.amazon.co.jp/s?k=Samsung%20EP-T4511%2045W%20%E7%B4%94%E6%AD%A3%E5%85%85%E9%9B%BB%E5%99%A8",
    rakuten: "https://search.rakuten.co.jp/search/mall/Samsung%20EP-T4511%2045W%20%E7%B4%94%E6%AD%A3%E5%85%85%E9%9B%BB%E5%99%A8/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Samsung%20EP-T4511%2045W%20%E7%B4%94%E6%AD%A3%E5%85%85%E9%9B%BB%E5%99%A8",
    official: "",
  },
  "cio-novaport-duo-ii-45w": {
    amazon: "https://www.amazon.co.jp/s?k=CIO%20NovaPort%20DUO%20II%2045W2C",
    rakuten: "https://search.rakuten.co.jp/search/mall/CIO%20NovaPort%20DUO%20II%2045W2C/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=CIO%20NovaPort%20DUO%20II%2045W2C",
    official: "",
  },
  "elecom-65w-ec-ac8565bk": {
    amazon: "https://www.amazon.co.jp/s?k=%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20EC-AC8565BK%2065W",
    rakuten: "https://search.rakuten.co.jp/search/mall/%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20EC-AC8565BK%2065W/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20EC-AC8565BK%2065W",
    official: "",
  },
  "anker-prime-67w": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20Prime%20Wall%20Charger%2067W",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20Prime%20Wall%20Charger%2067W/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20Prime%20Wall%20Charger%2067W",
    official: "",
  },
  "cio-novaport-trio-ii-67w": {
    amazon: "https://www.amazon.co.jp/s?k=CIO%20NovaPort%20TRIO%20II%2067W%202C1A",
    rakuten: "https://search.rakuten.co.jp/search/mall/CIO%20NovaPort%20TRIO%20II%2067W%202C1A/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=CIO%20NovaPort%20TRIO%20II%2067W%202C1A",
    official: "",
  },
  "anker-power-bank-10000-30w": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20Power%20Bank%2010000mAh%2030W%20A1256",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20Power%20Bank%2010000mAh%2030W%20A1256/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20Power%20Bank%2010000mAh%2030W%20A1256",
    official: "",
  },
  "anker-zolo-power-bank-10000-30w": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20Zolo%20Power%20Bank%2010000mAh%2030W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20Zolo%20Power%20Bank%2010000mAh%2030W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20Zolo%20Power%20Bank%2010000mAh%2030W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5",
    official: "",
  },
  "elecom-de-c69l-10000": {
    amazon: "https://www.amazon.co.jp/s?k=%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20DE-C69L-10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC",
    rakuten: "https://search.rakuten.co.jp/search/mall/%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20DE-C69L-10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=%E3%82%A8%E3%83%AC%E3%82%B3%E3%83%A0%20DE-C69L-10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC",
    official: "",
  },
  "motteru-mot-mb10003-ec": {
    amazon: "https://www.amazon.co.jp/s?k=MOTTERU%20MOT-MB10003-EC",
    rakuten: "https://search.rakuten.co.jp/search/mall/MOTTERU%20MOT-MB10003-EC/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=MOTTERU%20MOT-MB10003-EC",
    official: "",
  },
  "cio-smartcoby-pro-cable-c": {
    amazon: "https://www.amazon.co.jp/s?k=CIO%20SMARTCOBY%20Pro%20CABLE%20C",
    rakuten: "https://search.rakuten.co.jp/search/mall/CIO%20SMARTCOBY%20Pro%20CABLE%20C/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=CIO%20SMARTCOBY%20Pro%20CABLE%20C",
    official: "",
  },
  "cio-smartcoby-trio-67w-ss": {
    amazon: "https://www.amazon.co.jp/s?k=CIO%20SMARTCOBY%20TRIO%2067W%20SS",
    rakuten: "https://search.rakuten.co.jp/search/mall/CIO%20SMARTCOBY%20TRIO%2067W%20SS/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=CIO%20SMARTCOBY%20TRIO%2067W%20SS",
    official: "",
  },
  "anker-power-bank-20000-87w": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20Power%20Bank%2020000mAh%2087W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20Power%20Bank%2020000mAh%2087W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20Power%20Bank%2020000mAh%2087W%20%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E5%86%85%E8%94%B5",
    official: "",
  },
  "buffalo-bmpbsa10000": {
    amazon: "https://www.amazon.co.jp/s?k=%E3%83%90%E3%83%83%E3%83%95%E3%82%A1%E3%83%AD%E3%83%BC%20BMPBSA10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC",
    rakuten: "https://search.rakuten.co.jp/search/mall/%E3%83%90%E3%83%83%E3%83%95%E3%82%A1%E3%83%AD%E3%83%BC%20BMPBSA10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=%E3%83%90%E3%83%83%E3%83%95%E3%82%A1%E3%83%AD%E3%83%BC%20BMPBSA10000%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC",
    official: "",
  },
  "anker-maggo-power-bank-slim": {
    amazon: "https://www.amazon.co.jp/s?k=Anker%20MagGo%20Power%20Bank%2010000mAh%20Slim",
    rakuten: "https://search.rakuten.co.jp/search/mall/Anker%20MagGo%20Power%20Bank%2010000mAh%20Slim/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Anker%20MagGo%20Power%20Bank%2010000mAh%20Slim",
    official: "",
  },
  "belkin-qi2-15w-10k": {
    amazon: "https://www.amazon.co.jp/s?k=Belkin%20Qi2%2015W%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC%2010000mAh",
    rakuten: "https://search.rakuten.co.jp/search/mall/Belkin%20Qi2%2015W%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC%2010000mAh/",
    yahoo: "https://shopping.yahoo.co.jp/search?p=Belkin%20Qi2%2015W%20%E3%83%A2%E3%83%90%E3%82%A4%E3%83%AB%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC%2010000mAh",
    official: "",
  },
} as const;

export type AffiliateProductId = keyof typeof affiliateLinks;
export type AffiliateStore = keyof (typeof affiliateLinks)[AffiliateProductId];
