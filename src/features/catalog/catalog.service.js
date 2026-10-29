// features/catalog/catalog.service.js
// Endpoints del catálogo.

import { http } from "../../core/http.js";

/**
 * GET /products?limit&offset&gender
 * @returns {Promise<{ count: number, pages: number, products: object[] }>}
 */
export function getProducts({ limit = 9, offset = 0, gender = "" } = {}, options) {
  return http.get("/products", { ...options, params: { limit, offset, gender } });
}
