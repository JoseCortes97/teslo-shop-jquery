// features/catalog/product-card.js
// Llena el <template id="tpl-product-card"> con los datos de un producto.
// Usa .text() y .attr(): el navegador escapa los valores, no hace falta escapar HTML a mano.

import $ from "jquery";
import { cloneTemplate } from "../../utils/template.js";
import { formatPrice } from "../../utils/format.js";

const DESCRIPTION_LENGTH = 100;

// Las descripciones de la API son largas: el card muestra solo el inicio
function excerpt(text = "", max = DESCRIPTION_LENGTH) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max);
  return `${clean.slice(0, cut > 0 ? cut : max)}…`;
}

/**
 * @param {import("./product.mapper.js").Product} product
 * @returns {HTMLElement}
 */
export function createProductCard(product) {
  const $card = $(cloneTemplate("tpl-product-card"));

  $card
    .find('[data-field="image"]')
    .attr({ src: product.imageUrl, alt: product.title });
  $card.find('[data-field="title"]').text(product.title);
  $card.find('[data-field="description"]').text(excerpt(product.description));
  $card.find('[data-field="price"]').text(formatPrice(product.price));
  $card
    .find('[data-field="link"]')
    .attr("href", `/product.html?slug=${encodeURIComponent(product.slug)}`);

  return $card[0];
}
