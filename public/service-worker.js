const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/js/db.js",
  "/js/index.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install
self.addEventListener("install", function (evt) {
  // pre cache all transactions
  evt.waitUntil(
    caches.open(DATA_CACHE_NAME).then((cache) => cache.add("/api/transaction"))
  );

  // pre cache all static assets
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );

  // tell the browser to activate this service worker immediately once it
  // has finished installing
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        //remove old data from cache when the service worker activates
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log("Removing old cache data", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// fetch
self.addEventListener("fetch", function (evt) {
  // cache successful requests to the API
  if (evt.request.url.includes("/api/")) {
    console.log("[Service Worker] Fetch (data)", evt.request.url);
    evt.respondWith(
      caches
        //open the data cache
        .open(DATA_CACHE_NAME)
        .then((cache) => {
          // make a fetch request
          return fetch(evt.request)
            .then((response) => {
              // If the response was good, clone it and store it in the cache.
              if (response.status === 200) {
                cache.put(evt.request.url, response.clone());
              }
              return response;
            })
            .catch((err) => {
              // Network request failed, try to get it from the cache.
              return cache.match(evt.request);
            });
        })
        .catch((err) => console.log(err))
    );
    return;
  }
  // if the request is not to the api...
  evt.respondWith(
    //open the cache
    caches
      .open(CACHE_NAME)
      //check the cache for a matching request
      .then((cache) => {
        return cache.match(evt.request).then((response) => {
          //return either the documents for the matching request or make a new fetch request
          return response || fetch(evt.request);
        });
      })
  );
});
