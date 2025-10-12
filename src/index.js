import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

// 개발(dev)에는 베이스네임 사용 X, 빌드(prod)에서만 PUBLIC_URL 적용
const basename =
  process.env.NODE_ENV === "production" && process.env.PUBLIC_URL
    ? process.env.PUBLIC_URL
    : "/";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>
);
