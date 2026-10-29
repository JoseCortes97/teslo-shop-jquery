// src/app/bootstrap.js
// Raíz de composición: el arranque común a todas las páginas.
// Es la única capa que puede importar de core, ui y features a la vez.
//
// Uso (en pages/*.js):
//   bootstrapApp(() => initCatalog());
//   bootstrapApp(initCart, { loginUrl: "/login.html" });

import $ from "jquery";
import "@/styles/main.scss";
import { router } from "@/core/router.js";
import { mountNavbar } from "@/ui/navbar/navbar.js";
import { mountLoader } from "@/ui/loader/loader.js";
import { showToast } from "@/ui/toast/toast.js";

// Escucha los eventos globales que emite core/http.js
function wireGlobalHandlers({ loginUrl }) {
  const loader = mountLoader();

  document.addEventListener("http:start", loader.show);
  document.addEventListener("http:end", loader.hide);
  document.addEventListener("http:error", (e) => showToast(e.detail.message));

  document.addEventListener("auth:unauthorized", () => {
    if (!loginUrl) return; // sin login todavía: basta con el aviso de http:error
    const redirect = encodeURIComponent(location.pathname + location.search);
    location.assign(`${loginUrl}?redirect=${redirect}`);
  });
}

/**
 * @param {() => void} [initPage] Monta lo propio de la página
 * @param {object} [options]
 * @param {string} [options.loginUrl] A dónde enviar al usuario cuando la sesión expira (401)
 */
export function bootstrapApp(initPage = () => {}, { loginUrl } = {}) {
  router.start();

  $(() => {
    wireGlobalHandlers({ loginUrl });
    mountNavbar();
    initPage();
  });
}
