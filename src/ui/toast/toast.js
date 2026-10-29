// src/ui/toast/toast.js
// Avisos flotantes (Bootstrap Toast). Cada aviso se quita del DOM al cerrarse.
//
// Uso:
//   showToast("Producto agregado", { variant: "success" });

import $ from "jquery";
import Toast from "bootstrap/js/dist/toast";
import containerTemplate from "./toast-container.html?raw";
import toastTemplate from "./toast.html?raw";

let $container = null;

// El contenedor se crea con el primer aviso
function getContainer() {
  if (!$container) $container = $(containerTemplate).appendTo(document.body);
  return $container;
}

/**
 * @param {string} message
 * @param {object} [options]
 * @param {"danger"|"success"|"primary"|"secondary"|"dark"} [options.variant]
 * @param {number} [options.delay] ms antes de cerrarse solo
 */
export function showToast(message, { variant = "danger", delay = 5000 } = {}) {
  const $toast = $(toastTemplate).addClass(`text-bg-${variant}`);
  $toast.find('[data-field="message"]').text(message);
  $toast.appendTo(getContainer());

  $toast.one("hidden.bs.toast", () => $toast.remove());
  Toast.getOrCreateInstance($toast[0], { delay }).show();
}
