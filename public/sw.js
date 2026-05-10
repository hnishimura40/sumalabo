// すまラボ Service Worker
// 役割:
//   - Web Push 通知の受信と表示
//   - 通知クリック時に /review/ または該当 Preview 記事へ遷移
//   - PWAインストール時の起点
//
// インストール後、`/review/` ページから `navigator.serviceWorker.register('/sw.js')` で登録される。
// VAPID公開鍵での subscribe は `/review/` 側で行い、購読情報を `/api/push/subscribe` に送る。

const CACHE_VERSION = "sumalabo-pwa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { title: "すまラボ", body: event.data.text() };
      } catch {
        payload = { title: "すまラボ", body: "新しい通知があります。" };
      }
    }
  }

  const title = payload.title || "すまラボ レビュー";
  const body = payload.body || "確認待ちの記事があります。";
  const url = payload.url || "/review/";
  const tag = payload.tag || "sumalabo-review";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: true,
    requireInteraction: false,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/review/";

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Try to focus an existing tab on the same origin and navigate it
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(url).catch(() => {});
          }
          return;
        }
      } catch {
        /* ignore */
      }
    }
    await self.clients.openWindow(url);
  })());
});
