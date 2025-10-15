// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";

// === MUI & 스타일 ===
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./App.css";

// === 공통 컴포넌트 ===
import Navbar from "./components/Navbar";

// === 사용자 페이지 ===
import HomePage from "./pages/HomePage";
import UnitListPage from "./pages/UnitListPage";
import UnitDetailPage from "./pages/UnitDetailPage";
import VocabularyPage from "./pages/VocabularyPage";
import GrammarPage from "./pages/GrammarPage";
import SentencePage from "./pages/SentencePage";
import ConversationPage from "./pages/ConversationPage";
import PracticePage from "./pages/PracticePage";
import SummaryPage from "./pages/SummaryPage";
import PronunciationPage from "./pages/PronunciationPage";
import EverydayPage from "./pages/EverydayPage";

// === 관리자 페이지 ===
import AdminHome from "./pages/admin/AdminHome";
import UnitEditPage from "./pages/admin/UnitEditPage";
import EverydayAdmin from "./pages/admin/EverydayAdmin";

// === MUI 폰트 테마 설정 ===
const theme = createTheme({
  typography: {
    fontFamily: [
      "Gowun Dodum",
      "Hi Melody",
      "Orbit",
      "ZCOOL KuaiLe",
      "sans-serif",
    ].join(","),
    fontSize: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        .chinese-text { font-family: 'ZCOOL KuaiLe', sans-serif !important; font-size: 4rem !important; }
        .chinese-text2 { font-family: 'ZCOOL KuaiLe', sans-serif !important; font-size: 3rem !important; }
        .chinese-text3 { font-family: 'ZCOOL KuaiLe', sans-serif !important; font-size: 2rem !important; }
      `,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen">
        <Navbar />
        <main style={{ paddingTop: "64px" }}>
          <Routes>
            {/* 사용자 페이지 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pronunciation" element={<PronunciationPage />} />
            <Route path="/units" element={<UnitListPage />} />
            <Route path="/units/:id" element={<UnitDetailPage />} />
            <Route path="/units/:id/vocabulary" element={<VocabularyPage />} />
            <Route path="/units/:id/grammar" element={<GrammarPage />} />
            <Route path="/units/:id/sentence" element={<SentencePage />} />
            <Route path="/units/:id/conversation" element={<ConversationPage />} />
            <Route path="/units/:id/practice" element={<PracticePage />} />
            <Route path="/units/:id/summary" element={<SummaryPage />} />

            {/* 관리자 페이지 */}
            <Route path="/everyday" element={<EverydayPage />} />
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/everyday" element={<EverydayAdmin />} />
            <Route path="/admin/unit-edit" element={<UnitEditPage />} />
            {/* 특정 유닛 수정은 /admin/unit-edit?id=2 처럼 쿼리 사용 */}
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}
