// src/main.jsx
import { render } from "preact";
import App from "./App"; // pastikan App adalah default export
import './index.css'; 

render(<App />, document.getElementById("app"));
