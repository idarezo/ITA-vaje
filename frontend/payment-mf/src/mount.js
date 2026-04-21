import { createRoot } from "react-dom/client";
import App from "./App";

export function mount(el, props = {}) {
  const root = createRoot(el);
  root.render(<App {...props} />);
  return () => root.unmount();
}
