// features/catalog/catalog.view.js
// Lógica del listado. Todo el marcado está en los <template> de la página.

import $ from "jquery";
import { getProducts } from "./catalog.service.js";
import { createProductCard } from "./product-card.js";
import { cloneTemplate } from "../../utils/template.js";
import { router } from "../../core/router.js";

const LIMIT = 9;

// Lee ?page=2&gender=men de la URL
function readState() {
  const params = router.query();
  return {
    page: Math.max(1, Number(params.get("page")) || 1),
    gender: params.get("gender") || "",
  };
}

// Estado → query string (permite compartir el enlace y usar "atrás")
function toQuery({ page, gender }) {
  return { page: page > 1 ? page : null, gender };
}

function renderLoading($grid) {
  $grid.empty().append(cloneTemplate("tpl-loading"));
}

function renderError($grid, error) {
  const $error = $(cloneTemplate("tpl-error"));
  $error.find('[data-field="message"]').text(error.message);
  $grid.empty().append($error);
}

function renderProducts($grid, products) {
  if (!products.length) {
    $grid.empty().append(cloneTemplate("tpl-empty"));
    return;
  }
  $grid.empty().append(products.map(createProductCard));
}

function pageItem(page, label, { disabled = false, active = false } = {}) {
  const $item = $(cloneTemplate("tpl-page-item"));
  // Las clases son solo estilo; el JS decide con los atributos aria-*
  $item.toggleClass("disabled", disabled).toggleClass("active", active);
  $item.find("[data-page]").attr({
    "data-page": page,
    "aria-disabled": disabled ? "true" : null,
    "aria-current": active ? "page" : null,
  }).text(label);
  return $item[0];
}

function renderPagination($pagination, current, totalPages) {
  $pagination.empty();
  if (totalPages <= 1) return;

  const items = [pageItem(current - 1, "«", { disabled: current === 1 })];
  for (let p = 1; p <= totalPages; p++) {
    items.push(pageItem(p, String(p), { active: p === current }));
  }
  items.push(pageItem(current + 1, "»", { disabled: current === totalPages }));

  $pagination.append(items);
}

const NS = ".catalog"; // namespace de eventos: permite quitarlos con .off(NS)

/**
 * Monta el listado en la página.
 * @returns {() => void} destroy: quita los eventos del catálogo
 */
export function initCatalog() {
  const $grid = $("#products-grid");
  const $pagination = $("#products-pagination");
  const $gender = $("#gender-filter");

  if (!$grid.length) return () => {};

  let state = readState();
  let requestId = 0; // descarta respuestas viejas si el usuario cambia rápido de página

  async function load() {
    const id = ++requestId;
    $gender.val(state.gender);
    renderLoading($grid);

    try {
      // notify: false → el error se pinta en el grid, no en el aviso global
      const resp = await getProducts(
        {
          limit: LIMIT,
          offset: (state.page - 1) * LIMIT,
          gender: state.gender,
        },
        { notify: false }
      );
      if (id !== requestId) return;

      renderProducts($grid, resp.products);
      renderPagination($pagination, state.page, resp.pages);
    } catch (error) {
      if (id !== requestId || error.isAborted) return;
      renderError($grid, error);
      $pagination.empty();
    }
  }

  // El router avisa el cambio y la suscripción de abajo vuelve a cargar
  function go(next) {
    router.navigate(toQuery({ ...state, ...next }));
    $grid[0].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Delegación: funciona aunque el HTML se vuelva a pintar
  $pagination.on(`click${NS}`, "[data-page]", function (e) {
    e.preventDefault();
    const $link = $(this);
    if ($link.is('[aria-disabled="true"], [aria-current="page"]')) return;
    go({ page: Number($link.attr("data-page")) });
  });

  $gender.on(`change${NS}`, function () {
    go({ gender: $(this).val(), page: 1 });
  });

  $grid.on(`click${NS}`, "[data-retry]", load);

  // Paginación, filtro, links del navbar y atrás / adelante
  const unsubscribe = router.subscribe(() => {
    state = readState();
    load();
  });

  load();

  return function destroy() {
    requestId++; // ignora la respuesta en curso
    $pagination.off(NS);
    $gender.off(NS);
    $grid.off(NS);
    unsubscribe();
  };
}
