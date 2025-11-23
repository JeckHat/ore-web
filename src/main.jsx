// src/main.jsx
import { render, h } from "preact";
import Router from "preact-router";
import App from "./App";
import Ore from "./Ore";
import Orb from "./Orb";
import './index.css'; 

render(
    <Router>
        <App path="/" />
        <Ore path="/ore" />
        <Orb path="/orb" />
    </Router>,
    document.getElementById("app")
);
