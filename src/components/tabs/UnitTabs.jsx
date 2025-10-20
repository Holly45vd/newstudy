// src/components/tabs/UnitTabs.jsx
import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  AppBar,
  Tabs,
  Tab,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";

/** 섹션 탭 정의 */
const tabs = [
  { label: "홈", path: "" },
  { label: "단어", path: "vocabulary" },
  { label: "문법", path: "grammar" },
  { label: "교체", path: "sentence" },
  { label: "대화", path: "conversation" },
  { label: "연습", path: "practice" },
  { label: "요약", path: "summary" },
];

/**
 * UnitTabs with unit dropdown
 * @param {Object} props
 * @param {Array<string|number>} [props.unitOptions] - 유닛 드롭다운 항목 (예: [1,2,3] 또는 ["1","2"])
 */
export default function UnitTabs({ unitOptions }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 섹션(path) 계산
  const pathParts = location.pathname.split("/").filter(Boolean); // ["units", ":id", "vocabulary"]
  const last = pathParts[pathParts.length - 1] || "";
  const isAtUnitRoot = last === id || last === "units"; // /units/:id
  const sectionPath = isAtUnitRoot ? "" : last;

  // 탭 인덱스 계산
  const currentIndex =
    tabs.findIndex((t) => t.path === sectionPath) === -1
      ? 0
      : tabs.findIndex((t) => t.path === sectionPath);

  // 탭 변경 -> 같은 유닛에서 섹션만 이동
  const handleTabChange = (_e, newIndex) => {
    navigate(`/units/${id}/${tabs[newIndex].path}`);
  };

  // 유닛 옵션 준비 (prop 없으면 1~30 기본)
  const defaultUnits = Array.from({ length: 25 }, (_, i) => String(i + 1));
  const options = (unitOptions && unitOptions.length ? unitOptions : defaultUnits).map(String);

  // 현재 id가 옵션에 없으면 포함시켜 UI 오류 방지
  if (id && !options.includes(String(id))) options.unshift(String(id));

  // 유닛 변경 -> 현재 섹션(sectionPath) 유지
  const handleUnitChange = (e) => {
    const nextUnitId = e.target.value;
    navigate(`/units/${nextUnitId}/${sectionPath}`);
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={2}
      sx={{
        top: "64px", // 상단 네비 높이 보정
        zIndex: 90,
      }}
    >
      {/* Tabs + Dropdown을 한 줄에 배치 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
        }}
      >
        <Tabs
          value={currentIndex}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1, minWidth: 0 }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>

        {/* 요약 옆 유닛 드롭다운 */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            labelId="unit-select-label"
            value={String(id || "")}
            onChange={handleUnitChange}
            MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
          >
            {options.map((u) => (
              <MenuItem key={u} value={u}>
                Unit {u}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </AppBar>
  );
}
