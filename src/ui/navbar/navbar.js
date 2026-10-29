// src/ui/navbar/navbar.js
// Inserta el navbar (navbar.html) en la página y marca el link activo.
// El menú móvil lo maneja Bootstrap con data-bs-toggle="collapse".

import $ from "jquery";
import "bootstrap/js/dist/collapse"; // registra el data API de collapse
import template from "./navbar.html?raw";

// "/index.html" y "/" son la misma página
const normalize = (path) => path.replace(/\/index\.html$/, "/");

// Un link está activo si coinciden la ruta y el género (?gender=)
function linkKey(url) {
  const { pathname, searchParams } = new URL(url, location.origin);
  return `${normalize(pathname)}?${searchParams.get("gender") ?? ""}`;
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

const NS = ".navbar";

/**
 * @param {string} [target] Elemento que se reemplaza por el navbar
 * @returns {() => void} destroy: quita los eventos del navbar
 */
export function mountNavbar(target = "[data-navbar]") {
  const $target = $(target);
  if (!$target.length) return () => {};

  const $nav = $(template);
  const $links = $nav.find("[data-nav-link]");
  const $window = $(window);

  markActive($links);
  $target.replaceWith($nav);

  // La paginación del catálogo cambia la URL con pushState
  $window.on(`popstate${NS}`, () => markActive($links));

  return function destroy() {
    $window.off(NS);
  };
}
