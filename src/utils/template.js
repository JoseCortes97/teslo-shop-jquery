// src/utils/template.js
// Clona el primer elemento de un <template id="..."> de la página.

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export function cloneTemplate(id) {
  const template = document.getElementById(id);
  if (!template) throw new Error(`No existe <template id="${id}">`);
  return template.content.firstElementChild.cloneNode(true);
}
