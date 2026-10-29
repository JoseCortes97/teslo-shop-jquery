// src/ui/navbar/navbar.js
// Inserta el navbar (navbar.html) en la página y marca el link activo.
// El menú móvil lo maneja Bootstrap con data-bs-toggle="collapse".
// Los links llevan data-link: en la misma página el router los resuelve sin recargar.

import $ from "jquery";
import Collapse from "bootstrap/js/dist/collapse"; // registra el data API de collapse
import { router, normalizePath } from "../../core/router.js";
import template from "./navbar.html?raw";

// Un link está activo si coinciden la ruta y el género (?gender=)
function linkKey(url) {
  const { pathname, searchParams } = new URL(url, location.origin);
  return `${normalizePath(pathname)}?${searchParams.get("gender") ?? ""}`;
}

function markActive($links) {
  const current = linkKey(location.href);

  $links.each(function () {
    const $link = $(this);
    const isActive = linkKey($link.attr("href")) === current;
    $link
      .toggleClass("active", isActive)
      .attr("aria-current", isActive ? "page" : null);
  });
}

/**
 * @param {string} [target] Elemento que se reemplaza por el navbar
 * @returns {() => void} destroy: deja de escuchar al router
 */
export function mountNavbar(target = "[data-navbar]") {
  const $target = $(target);
  if (!$target.length) return () => {};

  const $nav = $(template);
  const $links = $nav.find("[data-nav-link]");
  const $collapse = $nav.find(".navbar-collapse");

  markActive($links);
  $target.replaceWith($nav);

  // Al navegar sin recargar: actualiza el link activo y cierra el menú móvil
  return router.subscribe(() => {
    markActive($links);
    Collapse.getInstance($collapse[0])?.hide();
  });
}
