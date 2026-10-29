// Service worker de Rouge & Noir : affiche les notifications.
// Le « réveil » reçu ne contient rien : on demande le texte au site, puis on l'affiche.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let msg = { title: "Rouge & Noir", body: "Pense à vérifier tes pronostics du prochain match.", url: "/", tag: "rn" };
      try {
        const sub = await self.registration.pushManager.getSubscription();
        const res = await fetch("/api/push/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub ? sub.endpoint : null }),
        });
        if (res.ok) msg = { ...msg, ...(await res.json()) };
      } catch (e) {
        // réseau indisponible : message générique
      }
      await self.registration.showNotification(msg.title, {
        body: msg.body,
        tag: msg.tag,
        data: { url: msg.url },
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
