// features/catalog/catalog.view.js
// Lógica del listado. Todo el marcado está en los <template> de la página.

import $ from "jquery";
import { getProducts } from "./catalog.service.js";
import { createProductCard } from "./product-card.js";
import { cloneTemplate } from "../../utils/template.js";

const LIMIT = 9;

// Lee ?page=2&gender=men de la URL
function readState() {
  const params = new URLSearchParams(location.search);
  return {
    page: Math.max(1, Number(params.get("page")) || 1),
    gender: params.get("gender") || "",
  };
}

// Escribe el estado en la URL sin recargar (permite compartir el enlace y usar "atrás")
function writeState({ page, gender }) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", page);
  if (gender) params.set("gender", gender);
  const qs = params.toString();
  history.pushState(null, "", qs ? `?${qs}` : location.pathname);
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
  $item.toggleClass("disabled", disabled).toggleClass("active", active);
  $item.find("[data-page]").attr("data-page", page).text(label);
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

export function initCatalog() {
  const $grid = $("#products-grid");
  const $pagination = $("#products-pagination");
  const $gender = $("#gender-filter");

  if (!$grid.length) return;

  let state = readState();
  let requestId = 0; // descarta respuestas viejas si el usuario cambia rápido de página

  async function load() {
    const id = ++requestId;
    $gender.val(state.gender);
    renderLoading($grid);

    try {
      const resp = await getProducts({
        limit: LIMIT,
        offset: (state.page - 1) * LIMIT,
        gender: state.gender,
      });
      if (id !== requestId) return;

      renderProducts($grid, resp.products);
      renderPagination($pagination, state.page, resp.pages);
    } catch (error) {
      if (id !== requestId || error.isAborted) return;
      renderError($grid, error);
      $pagination.empty();
    }
  }

  function go(next) {
    state = { ...state, ...next };
    writeState(state);
    load();
    $grid[0].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Delegación: funciona aunque el HTML se vuelva a pintar
  $pagination.on("click", "[data-page]", function (e) {
    e.preventDefault();
    if ($(this).parent().is(".disabled, .active")) return;
    go({ page: Number($(this).attr("data-page")) });
  });

  $gender.on("change", function () {
    go({ gender: $(this).val(), page: 1 });
  });

  $grid.on("click", "[data-retry]", load);

  // Botones atrás / adelante del navegador
  $(window).on("popstate", () => {
    state = readState();
    load();
  });

  load();
}
