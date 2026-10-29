/**
 * src/core/http.js
 * Capa de transporte para consumir la API REST con fetch (sin dependencias).
 *
 * Responsabilidades:
 *  - URL base desde src/config/environment.js
 *  - Token Bearer y token CSRF en cada petición
 *  - Envío de JSON o FormData
 *  - Errores normalizados en una sola clase (ApiError)
 *  - Timeout y cancelación con AbortController
 *  - Reintentos automáticos solo en GET (idempotente)
 *  - Eventos globales para spinner y sesión expirada
 *
 * Uso:
 *   import { http, ApiError } from '../core/http.js';
 *
 *   const products = await http.get('/products', { params: { page: 2, q: 'tenis' } });
 *   const cart     = await http.post('/cart/items', { variant_id: 15, qty: 1 });
 *
 *   try {
 *     await http.post('/auth/login', { email, password });
 *   } catch (err) {
 *     if (err instanceof ApiError && err.isValidation) {
 *       console.log(err.fieldErrors); // { email: ['El correo no es válido'] }
 *     }
 *   }
 *
 *   // Cancelar una búsqueda anterior
 *   const controller = new AbortController();
 *   http.get('/products', { params: { q }, signal: controller.signal });
 *   controller.abort();
 *
 * Eventos que emite en `document` (CustomEvent, el dato va en event.detail):
 *   'http:start' / 'http:end'   → mostrar / ocultar spinner global
 *   'auth:unauthorized'          → sesión expirada (401)
 *   'http:error'                 → log o toast genérico
 *
 *   document.addEventListener('http:error', (e) => Toast.show(e.detail.message));
 *   // Con jQuery: $(document).on('http:error', (e) => Toast.show(e.originalEvent.detail.message));
 */

import { enviroment } from "../config/environment.js";

// ─────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  baseURL: enviroment.baseUrl.replace(/\/+$/, ""),
  timeout: 15000, // ms
  getRetries: 2, // reintentos para GET ante fallo de red, timeout, 5xx o 429
  retryDelay: 400, // ms; se duplica en cada intento (backoff)
  tokenKey: "auth_token", // clave en localStorage
  // 'same-origin': no envía cookies a otro dominio (el token va en el header Authorization).
  // Usa 'include' solo si la API usa cookies de sesión Y su CORS responde con el origen exacto
  // + Access-Control-Allow-Credentials: true. Con Access-Control-Allow-Origin: * el navegador la bloquea.
  credentials: "same-origin",
};

// ─────────────────────────────────────────────────────────────
// Error normalizado
// ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  /**
   * @param {object} opts
   * @param {number} opts.status        Código HTTP (0 = red / timeout / cancelado)
   * @param {string} opts.message       Mensaje legible para el usuario
   * @param {object} [opts.fieldErrors] Errores por campo (422)
   * @param {*}      [opts.data]        Cuerpo completo de la respuesta
   * @param {string} [opts.code]        'network' | 'timeout' | 'aborted' | 'http'
   */
  constructor({
    status,
    message,
    fieldErrors = {},
    data = null,
    code = "http",
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.data = data;
    this.code = code;
  }

  get isValidation() {
    return this.status === 422;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isServerError() {
    return this.status >= 500;
  }
  get isNetwork() {
    return this.code === "network" || this.code === "timeout";
  }
  get isAborted() {
    return this.code === "aborted";
  }
}

const DEFAULT_MESSAGES = {
  400: "La solicitud no es válida.",
  401: "Tu sesión expiró. Inicia sesión de nuevo.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "Hubo un conflicto con el estado actual (por ejemplo, sin stock).",
  422: "Revisa los datos del formulario.",
  429: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
  500: "Ocurrió un error en el servidor. Intenta más tarde.",
};

const abortedError = () =>
  new ApiError({ status: 0, code: "aborted", message: "Solicitud cancelada." });

// ─────────────────────────────────────────────────────────────
// Token (localStorage puede fallar en modo privado → try/catch)
// ─────────────────────────────────────────────────────────────

export const auth = {
  getToken() {
    try {
      return localStorage.getItem(CONFIG.tokenKey);
    } catch {
      return null;
    }
  },
  setToken(token) {
    try {
      localStorage.setItem(CONFIG.tokenKey, token);
    } catch {
      /* sin storage */
    }
  },
  clearToken() {
    try {
      localStorage.removeItem(CONFIG.tokenKey);
    } catch {
      /* sin storage */
    }
  },
};

function getCsrfToken() {
  return (
    document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content") || null
  );
}

// ─────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

let pending = 0;

function trackStart() {
  if (pending++ === 0) emit("http:start");
}

function trackEnd() {
  pending = Math.max(0, pending - 1);
  if (pending === 0) emit("http:end");
}

function buildURL(path, params) {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${CONFIG.baseURL}/${String(path).replace(/^\/+/, "")}`;

  if (!params) return url;

  // Quita null / undefined / '' para no enviar ?q=&page=
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
    else search.append(key, value);
  }

  const qs = search.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

/** Lee el cuerpo según el Content-Type. 204 o cuerpo vacío → null. */
async function parseBody(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  const isJSON = (response.headers.get("content-type") || "").includes(
    "application/json"
  );
  if (!isJSON) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toHttpError(status, data) {
  const body = data && typeof data === "object" ? data : null;
  return new ApiError({
    status,
    data,
    // Laravel usa { message, errors }; Express suele usar { message } o { error }
    message:
      body?.message ||
      body?.error ||
      DEFAULT_MESSAGES[status] ||
      DEFAULT_MESSAGES[500],
    fieldErrors: body?.errors ?? {},
  });
}

function shouldRetry(error, method, attempt) {
  if (method !== "GET" || attempt >= CONFIG.getRetries) return false;
  if (error.isAborted) return false;
  return error.isNetwork || error.isServerError || error.status === 429;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────
// Petición base
// ─────────────────────────────────────────────────────────────

/**
 * Un solo intento de fetch, con timeout y cancelación.
 * fetch NO lanza error en 4xx/5xx: aquí se revisa response.ok y se lanza ApiError.
 */
async function send(url, init, { signal, timeout }) {
  if (signal?.aborted) throw abortedError();

  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await parseBody(response);

    if (!response.ok) throw toHttpError(response.status, data);
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error.name === "AbortError") {
      if (timedOut) {
        throw new ApiError({
          status: 0,
          code: "timeout",
          message: "El servidor tardó demasiado en responder.",
        });
      }
      throw abortedError();
    }

    // TypeError: Failed to fetch → sin red, DNS o CORS bloqueado
    throw new ApiError({
      status: 0,
      code: "network",
      message: "Sin conexión. Revisa tu internet.",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * @param {string} method
 * @param {string} path         Ruta relativa a la base ('/products') o URL absoluta
 * @param {object} [options]
 * @param {object|FormData} [options.data]  Cuerpo de la petición
 * @param {object} [options.params]         Query string
 * @param {object} [options.headers]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeout]
 * @param {boolean} [options.silent]        No dispara eventos de spinner
 * @returns {Promise<any>}                  Cuerpo de la respuesta (null si 204)
 */
async function request(method, path, options = {}) {
  const {
    data,
    params,
    headers = {},
    signal,
    timeout = CONFIG.timeout,
    silent = false,
  } = options;
  const verb = method.toUpperCase();

  const token = auth.getToken();
  const csrf = getCsrfToken();
  const isFormData = data instanceof FormData;

  const init = {
    method: verb,
    credentials: CONFIG.credentials,
    headers: {
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrf && verb !== "GET" && { "X-CSRF-TOKEN": csrf }),
      // Con FormData NO se pone Content-Type: el navegador agrega el boundary
      ...(data !== undefined &&
        !isFormData && { "Content-Type": "application/json" }),
      ...headers,
    },
  };

  if (data !== undefined && verb !== "GET") {
    init.body = isFormData ? data : JSON.stringify(data);
  }

  const url = buildURL(path, params);

  if (!silent) trackStart();

  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await send(url, init, { signal, timeout });
      } catch (error) {
        if (!shouldRetry(error, verb, attempt)) throw error;
        await wait(CONFIG.retryDelay * 2 ** attempt);
      }
    }
  } catch (error) {
    if (error.isUnauthorized) {
      auth.clearToken();
      emit("auth:unauthorized", error);
    }
    if (!error.isAborted) emit("http:error", error);
    throw error;
  } finally {
    if (!silent) trackEnd();
  }
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

export const http = {
  get: (path, options) => request("GET", path, options),
  post: (path, data, options) => request("POST", path, { ...options, data }),
  put: (path, data, options) => request("PUT", path, { ...options, data }),
  patch: (path, data, options) => request("PATCH", path, { ...options, data }),
  delete: (path, options) => request("DELETE", path, options),

  /** Cambia la configuración en tiempo de ejecución (por ejemplo, en tests). */
  configure(overrides = {}) {
    Object.assign(CONFIG, overrides);
  },
};

export default http;
