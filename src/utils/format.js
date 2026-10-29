// src/utils/format.js

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
});

/**
 * @param {number} value
 * @returns {string}
 */
export function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? currency.format(number) : "";
}
