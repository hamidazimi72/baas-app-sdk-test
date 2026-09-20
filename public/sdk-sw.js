!(function () {
	'use strict';
	!(function () {
		const t = 'GapPushSDK';
		self[t] || (self[t] = {});
		const o = self[t];
		o.version = '1.0.12';
		const n = 'installation-tokens';
		((o.reportNotificationEvent = async function (t, o) {
			try {
				const e = await new Promise((t, o) => {
						const e = indexedDB.open('mbaas-sdk', 2);
						((e.onupgradeneeded = () => {
							e.result.objectStoreNames.contains(n) || e.result.createObjectStore(n);
						}),
							(e.onsuccess = () => {
								const i = e.result,
									c = i.transaction(n, 'readonly').objectStore(n).get('mbaas:installation_token');
								((c.onsuccess = () => {
									(i.close(), t(c.result || null));
								}),
									(c.onerror = () => {
										(i.close(), o(c.error));
									}));
							}),
							(e.onerror = () => o(e.error)));
					}),
					i = { 'Content-Type': 'application/json' };
				e && (i.Authorization = `Bearer ${e}`);
				return await fetch('/api/sdk/7078/api/v1/push/event', {
					method: 'POST',
					headers: i,
					keepalive: !0,
					body: JSON.stringify({ eventType: t, pushId: o.notification.tag }),
				});
			} catch (t) {
				throw t;
			}
		}),
			(o.handleNotificationClick = function (t) {
				const n = t.notification.data?.url || new URL(self.location.origin).href;
				(console.log(n),
					t.waitUntil(
						(async () => {
							try {
								await o.reportNotificationEvent('OPENED', t);
							} catch (t) {
								console.error('Failed to report click:', t);
							}
							try {
								const t = await clients.matchAll({ type: 'window', includeUncontrolled: !0 });
								for (const o of t) if (o.url === n && 'focus' in o) return await o.focus();
								if (clients.openWindow) return await clients.openWindow(n);
							} catch (t) {
								console.error('Failed to open window:', t);
							}
						})(),
					));
			}),
			(o.handleNotificationClose = function (t) {
				t.waitUntil(Promise.all([o.reportNotificationEvent('DISMISSED', t)]));
			}),
			self.addEventListener('notificationclick', function (t) {
				(console.log('notificationclick received'), o.handleNotificationClick(t));
			}),
			self.addEventListener('notificationclose', function (t) {
				(console.log('notificationclose received'), o.handleNotificationClose(t));
			}));
	})();
})();
