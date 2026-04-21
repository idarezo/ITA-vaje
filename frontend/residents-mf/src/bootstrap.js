import { createApp } from "vue";
import App from "./App.vue";

const rootElement = document.getElementById("root");
if (rootElement) {
  createApp(App).mount(rootElement);
}
