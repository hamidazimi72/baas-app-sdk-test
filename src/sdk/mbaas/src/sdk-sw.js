(function () {
  const GAP_NAMESPACE = "GapPushSDK";

  if (!self[GAP_NAMESPACE]) {
    self[GAP_NAMESPACE] = {};
  }

  const sdk = self[GAP_NAMESPACE];

  sdk.version = "1.0.13";

  const PUSH_EVENT_URL = "http://130.185.72.14:7078/api/v1/push/event";
  const INSTALLATION_TOKEN_KEY = "mbaas:installation_token";
  const INSTALLATION_TOKEN_DB_NAME = "mbaas-sdk";
  const INSTALLATION_TOKEN_DB_VERSION = 2;
  const INSTALLATION_TOKEN_STORE_NAME = "installation-tokens";

  function getInstallationTokenFromIndexedDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(INSTALLATION_TOKEN_DB_NAME, INSTALLATION_TOKEN_DB_VERSION);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(INSTALLATION_TOKEN_STORE_NAME)) {
          request.result.createObjectStore(INSTALLATION_TOKEN_STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(INSTALLATION_TOKEN_STORE_NAME, "readonly");
        const getRequest = transaction.objectStore(INSTALLATION_TOKEN_STORE_NAME).get(INSTALLATION_TOKEN_KEY);

        getRequest.onsuccess = () => {
          database.close();
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => {
          database.close();
          reject(getRequest.error);
        };
      };

      request.onerror = () => reject(request.error);
    });
  }

  sdk.reportNotificationEvent = async function (eventType, event) {
    try {
      const installationToken = await getInstallationTokenFromIndexedDb();

      const headers = {
        "Content-Type": "application/json",
      };

      if (installationToken) {
        headers.Authorization = `Bearer ${installationToken}`;
      }

      const response = await fetch(PUSH_EVENT_URL, {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify({
          eventType,
          pushId: event.notification.data?.pushId,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  };

  sdk.handleNotificationClick = function (event) {
    // event.notification.close();

    const url = event.notification.data?.url || new URL(self.location.origin).href;

    event.waitUntil(
      (async () => {
        try {
          // ۱. اول ارسال گزارش به سرور
          await sdk.reportNotificationEvent("OPENED", event);
        } catch (e) {
          console.error("Failed to report click:", e);
        }

        // ۲. سپس باز کردن یا فوکوس روی تب
        try {
          const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
          for (const client of clientList) {
            if (client.url === url && "focus" in client) {
              return await client.focus();
            }
          }
          if (clients.openWindow) {
            return await clients.openWindow(url);
          }
        } catch (e) {
          console.error("Failed to open window:", e);
        }
      })(),
    );
  };

  sdk.handleNotificationClose = function (event) {
    event.waitUntil(Promise.all([sdk.reportNotificationEvent("DISMISSED", event)]));
  };

  self.addEventListener("notificationclick", function (event) {
    sdk.handleNotificationClick(event);
  });

  self.addEventListener("notificationclose", function (event) {
    sdk.handleNotificationClose(event);
  });
})();
