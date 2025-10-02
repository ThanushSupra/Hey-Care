// Application entry point. This bootstraps the React app and mounts it to the DOM.
// Files referenced here are foundational to client-side rendering and theming.
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Global styles and Tailwind layers (design tokens + components) live here
import "./index.css";

// Find the root DOM node created in index.html and render the React tree
createRoot(document.getElementById("root")!).render(<App />);
