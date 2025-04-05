/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference no-default-lib="true"/>
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(ASSETS);
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (event.request.headers.has('range')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cachedResponse = await cache.match(event.request);

			if (cachedResponse) {
				return cachedResponse;
			}

			const networkResponse = await fetch(event.request);
			if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
				if (event.request.url.startsWith('http')) {
					await cache.put(event.request, networkResponse.clone());
				}
			}
			return networkResponse;
		})()
	);
});

sw.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}
});
