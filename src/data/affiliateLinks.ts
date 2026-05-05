export const affiliateLinks = {
  "anker-511-nano-3-30w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "belkin-30w-pd-pps": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "samsung-45w-power-adapter": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "cio-novaport-duo-ii-45w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "elecom-65w-ec-ac8565bk": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "anker-prime-67w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "cio-novaport-trio-ii-67w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "anker-power-bank-10000-30w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "anker-zolo-power-bank-10000-30w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "elecom-de-c69l-10000": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "motteru-mot-mb10003-ec": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "cio-smartcoby-pro-cable-c": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "cio-smartcoby-trio-67w-ss": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "anker-power-bank-20000-87w": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "buffalo-bmpbsa10000": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "anker-maggo-power-bank-slim": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
  "belkin-qi2-15w-10k": {
    amazon: "",
    rakuten: "",
    yahoo: "",
    official: "",
  },
} as const;

export type AffiliateProductId = keyof typeof affiliateLinks;
export type AffiliateStore = keyof (typeof affiliateLinks)[AffiliateProductId];
