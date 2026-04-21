import { mount } from "./mount.js";

const el = document.getElementById("root");
if (el) {
  const params = new URLSearchParams(window.location.search);
  const userId = Number(params.get("userId")) || 1;
  mount(el, { userId });
}
