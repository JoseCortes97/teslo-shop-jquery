/**
 * src/core/router.js
 * Dueño único de la URL: nadie más llama a history.pushState ni escucha popstate.
 *
 * La app es multipágina: el router solo resuelve sin recargar los cambios
 * dentro de la página actual (query string). Ir a otra página recarga normal.
 *
 * Uso:
 *   import { router } from '../core/router.js';
 *
 *   router.query().get('gender');               // URLSearchParams actual
 *   router.navigate({ page: 2, gender: 'men' }); // reemplaza el query string (null / '' se quitan)
 *   router.navigate('/?gender=men');             // URL completa
 *
 *   const unsubscribe = router.subscribe(({ url, query }) => { ... });
 *
 * Links: los <a data-link> que apuntan a la página actual se resuelven sin recargar.
 *
 * Evento que emite en `document` (CustomEvent, el dato va en event.detail):
 *   'route:change' → { url: URL, query: URLSearchParams }
 *   Se dispara con navigate(), con los <a data-link> y con atrás / adelante.
 */

const EVENT = "route:change";

/** "/index.html" y "/" son la misma página */
export function normalizePath(path) {
  return path.replace(/\/index\.html$/, "/");
}

function query() {
  return new URLSearchParams(location.search);
}

function toURL(to) {
  if (typeof to === "string" || to instanceof URL) {
    return new URL(to, location.href);
  }

  const url = new URL(location.pathname, location.origin);
  for (const [key, value] of Object.entries(to)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, value);
  }
  return url;
}

function isSamePage(url) {
  return (
    url.origin === location.origin &&
    normalizePath(url.pathname) === normalizePath(location.pathname)
  );
}

function emit() {
  document.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { url: new URL(location.href), query: query() },
    })
  );
}

/**
 * @param {string|URL|object} to  URL o parámetros del query string
 * @param {object} [options]
 * @param {boolean} [options.replace] Reemplaza la entrada del historial en vez de agregar una
 */
function navigate(to, { replace = false } = {}) {
  const url = toURL(to);

  if (!isSamePage(url)) {
    location.assign(url);
    return;
  }
  if (url.href === location.href) return;

  history[replace ? "replaceState" : "pushState"](null, "", url);
  emit();
}

// Deja pasar ctrl/cmd + clic, target="_blank", download y links a otras páginas
function onLinkClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest?.("a[data-link]");
  if (!link || link.hasAttribute("download")) return;
  if (link.target && link.target !== "_self") return;

  const url = new URL(link.href);
  if (!isSamePage(url)) return;

  event.preventDefault();
  navigate(url);
}

/**
 * @param {(route: { url: URL, query: URLSearchParams }) => void} handler
 * @returns {() => void} unsubscribe
 */
function subscribe(handler) {
  const listener = (event) => handler(event.detail);
  document.addEventListener(EVENT, listener);
  return () => document.removeEventListener(EVENT, listener);
}

let started = false;

/** Activa atrás / adelante y los <a data-link>. Se llama una vez al arrancar la app. */
function start() {
  if (started) return;
  started = true;
  window.addEventListener("popstate", emit);
  document.addEventListener("click", onLinkClick);
}

export const router = { start, query, navigate, subscribe };

export default router;
