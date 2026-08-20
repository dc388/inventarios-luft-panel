const CACHE = 'inventarios-luft-pvc-fe2092a5f57e';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Borrar los caches de versiones anteriores DE ESTA DIVISION. Sin esto el
  // telefono acumula una copia completa de la app por cada actualizacion.
  //
  // El prefijo importa: las dos divisiones viven en el mismo dominio y por
  // tanto comparten el almacen de caches. Sin filtrar por prefijo, publicar
  // PVC le borraria a Wood su copia y quien tuviera Wood instalada se
  // quedaria sin app en cuanto se metiera en la nave sin senal.
  var PREFIJO = 'inventarios-luft-pvc-';

  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n.indexOf(PREFIJO) === 0 && n !== CACHE; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Solo se sirve del cache la carga de la aplicacion. Todo lo demas —en
  // particular las llamadas a la base central— va a la red sin intermediarios.
  if (req.method !== 'GET' || req.mode !== 'navigate') return;

  event.respondWith(
    caches.match('./index.html').then(function (hit) {
      var live = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        }
        return res;
      }).catch(function () {
        // Sin conexion. Si hay copia, se usa; si no, que falle de verdad.
        if (hit) return hit;
        throw new Error('sin conexion y sin copia local');
      });

      return hit || live;
    })
  );
});
