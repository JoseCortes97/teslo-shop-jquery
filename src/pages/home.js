import $ from "jquery";
import "@/styles/main.scss";
import { mountNavbar } from "@/ui/navbar/navbar.js";
import { initCatalog } from "@/features/catalog/catalog.view.js";

$(() => {
  mountNavbar();
  initCatalog();
});
