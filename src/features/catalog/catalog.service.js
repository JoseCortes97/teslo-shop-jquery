// features/catalog/catalog.service.js
// Endpoints del catálogo. Devuelve modelos de la app, no la respuesta cruda.

import { http } from "../../core/http.js";
import { toProduct } from "./product.mapper.js";

/**
 * GET /products?limit&offset&gender
 * @returns {Promise<{ count: number, pages: number, products: import("./product.mapper.js").Product[] }>}
 */
export async function getProducts({ limit = 9, offset = 0, gender = "" } = {}, options) {
  const resp = await http.get("/products", { ...options, params: { limit, offset, gender } });

  return {
    count: Number(resp?.count) || 0,
    pages: Number(resp?.pages) || 0,
    products: (resp?.products ?? []).map(toProduct),
  };
}
