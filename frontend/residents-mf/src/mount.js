import { createApp } from "vue";
import App from "./App.vue";

export function mount(el, props = {}) {
  const app = createApp(App, props);
  app.mount(el);
  return () => app.unmount();
}
