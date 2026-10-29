// src/ui/loader/loader.js
// Barra de progreso global mientras hay peticiones en curso.
// Espera un momento antes de aparecer para no parpadear en respuestas rápidas.

import $ from "jquery";
import "./loader.scss";
import template from "./loader.html?raw";

const SHOW_DELAY = 150; // ms

/**
 * @param {string|HTMLElement} [target] Dónde se inserta la barra
 * @returns {{ show: () => void, hide: () => void }}
 */
export function mountLoader(target = document.body) {
  const $loader = $(template).appendTo(target);
  let timer;

  return {
    show() {
      clearTimeout(timer);
      timer = setTimeout(() => $loader.prop("hidden", false), SHOW_DELAY);
    },
    hide() {
      clearTimeout(timer);
      $loader.prop("hidden", true);
    },
  };
}
