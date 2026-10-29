// features/catalog/product.mapper.js
// Convierte la respuesta de la API (DTO) en el modelo que usa la app.
// Las vistas solo conocen Product: si el backend cambia un campo, se ajusta este archivo.

import { enviroment } from "../../config/environment.js";

const PLACEHOLDER = "/images/no-image.png";

/**
 * @typedef {object} Product
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {number} price
 * @property {string} description
 * @property {string} gender
 * @property {number} stock
 * @property {string[]} sizes
 * @property {string[]} tags
 * @property {string[]} images   URLs listas para <img src>
 * @property {string} imageUrl   Imagen principal (o placeholder)
 */

function resolveImage(image) {
  if (/^https?:\/\//.test(image)) return image;
  return `${enviroment.baseUrl}/files/product/${encodeURIComponent(image)}`;
}

/**
 * @param {object} dto Producto tal como lo devuelve la API
 * @returns {Product}
 */
export function toProduct(dto) {
  const images = (dto.images ?? []).filter(Boolean).map(resolveImage);

  return {
    id: dto.id,
    title: dto.title ?? "",
    slug: dto.slug ?? "",
    price: Number(dto.price),
    description: dto.description ?? "",
    gender: dto.gender ?? "",
    stock: Number(dto.stock) || 0,
    sizes: dto.sizes ?? [],
    tags: dto.tags ?? [],
    images,
    imageUrl: images[0] ?? PLACEHOLDER,
  };
}
