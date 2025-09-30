// src/components/tabs/UnitTabs.jsx
import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AppBar, Tabs, Tab } from "@mui/material";

const tabs = [
  { label: "홈", path: "" },
  { label: "단어", path: "vocabulary" },
  { label: "문법", path: "grammar" },
  { label: "문장", path: "sentence" },
  { label: "대화", path: "conversation" },
  { label: "연습", path: "practice" },
  { label: "요약", path: "summary" },
];

export default function UnitTabs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 URL에 맞게 탭 선택값 결정
  const currentPath = location.pathname.split("/").pop();
  const currentIndex = tabs.findIndex((tab) => tab.path === currentPath || (currentPath === id && tab.path === ""));

  const handleChange = (event, newValue) => {
    navigate(`/units/${id}/${tabs[newValue].path}`);
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={2}
      sx={{
        top: "64px", // 네브바 높이만큼 아래로 떨어뜨리기
        zIndex: 90,
      }}
    >
      <Tabs
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>
    </AppBar>
  );
}
