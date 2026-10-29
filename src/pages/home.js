import { bootstrapApp } from "@/app/bootstrap.js";
import { initCatalog } from "@/features/catalog/catalog.view.js";

bootstrapApp(() => initCatalog());
