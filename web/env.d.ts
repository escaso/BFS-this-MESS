// Lets plain `tsc` accept imports of single-file components. It does not
// type-check inside .vue files; `vue-tsc` does that if you add it.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Vite bundles stylesheets imported for their side effects (web/main.ts).
declare module "*.css";
