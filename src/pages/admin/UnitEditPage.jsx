// src/pages/admin/UnitEditPage.jsx
import React, { useState, Suspense, lazy } from "react";
import {
  Container, Typography, Paper, TextField, Button, Box, Grid, Snackbar,
} from "@mui/material";
import { UnitEditProvider, useUnitEdit } from "./UnitEditProvider";

// Lazy modal imports (components/admin/*)
const VocabularyModal   = lazy(() => import("../../components/admin/VocabularyModal"));
const GrammarModal      = lazy(() => import("../../components/admin/GrammarModal"));
const ConversationModal = lazy(() => import("../../components/admin/ConversationModal"));
const PracticeModal     = lazy(() => import("../../components/admin/PracticeModal"));
const SubstitutionModal = lazy(() => import("../../components/admin/SubstitutionModal"));
const SummaryModal      = lazy(() => import("../../components/admin/SummaryModal"));
const JsonModal         = lazy(() => import("../../components/admin/JsonModal"));

function BasicInfoCard() {
  const {
    editId, unitId, setUnitId, title, setTitle, theme, setTheme,
    goals, setGoals, objectives, setObjectives,
  } = useUnitEdit();

  const addGoal = () => {
    const next = [...goals, ""];
    setGoals(next); setObjectives(next);
  };
  const changeGoal = (i, v) => {
    const next = [...goals]; next[i] = v;
    setGoals(next); setObjectives(next);
  };
  const delGoal = (i) => {
    const next = goals.filter((_, idx) => idx !== i);
    setGoals(next); setObjectives(next);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>기본 정보</Typography>
      <TextField
        label="유닛 번호" type="number" value={unitId}
        onChange={(e) => setUnitId(Number(e.target.value))}
        fullWidth sx={{ mb: 2 }} disabled={!!editId}
      />
      <TextField label="제목" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="주제" value={theme} onChange={(e) => setTheme(e.target.value)} fullWidth sx={{ mb: 2 }} />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>학습 목표</Typography>
      {goals.map((g, i) => (
        <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
          <TextField fullWidth value={g} onChange={(e) => changeGoal(i, e.target.value)} />
          <Button onClick={() => delGoal(i)} color="error" sx={{ ml: 1 }}>삭제</Button>
        </Box>
      ))}
      <Button onClick={addGoal}>+ 목표 추가</Button>
      {!!objectives?.length && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          (참고) objectives는 goals와 동기화되어 저장됩니다.
        </Typography>
      )}
    </Paper>
  );
}

function SectionLaunchers({ onOpen }) {
  const sections = [
    { key: "vocab", label: "단어 관리" },
    { key: "grammar", label: "문법 관리" },
    { key: "conv", label: "대화 관리" },
    { key: "practice", label: "연습 문제 관리 & 확장 표현" },
    { key: "subs", label: "교체연습 (다중 슬롯)" },
    { key: "summary", label: "요약 관리" },
    { key: "json", label: "JSON 직접 편집 (전체)" },
  ];
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>섹션 열기</Typography>
      <Grid container spacing={1}>
        {sections.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.key}>
            <Button fullWidth variant="outlined" onClick={() => onOpen(s.key)}>{s.label}</Button>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

function SaveBar() {
  const { saveForm } = useUnitEdit();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const handleSave = async () => {
    try { await saveForm(); setMsg("저장 완료"); }
    catch (e) { console.error(e); setMsg("저장 실패 (콘솔 확인)"); }
    setOpen(true);
  };
  return (
    <Box textAlign="right" sx={{ my: 2 }}>
      <Button variant="contained" onClick={handleSave}>저장</Button>
      <Snackbar open={open} autoHideDuration={2500} onClose={() => setOpen(false)} message={msg} />
    </Box>
  );
}

function UnitEditPageInner() {
  const [openKey, setOpenKey] = useState(null);
  const close = () => setOpenKey(null);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>유닛 편집</Typography>
      <BasicInfoCard />
      <SectionLaunchers onOpen={setOpenKey} />
      <SaveBar />

      <Suspense fallback={null}>
        {openKey === "vocab"   && <VocabularyModal open onClose={close} />}
        {openKey === "grammar" && <GrammarModal open onClose={close} />}
        {openKey === "conv"    && <ConversationModal open onClose={close} />}
        {openKey === "practice"&& <PracticeModal open onClose={close} />}
        {openKey === "subs"    && <SubstitutionModal open onClose={close} />}
        {openKey === "summary" && <SummaryModal open onClose={close} />}
        {openKey === "json"    && <JsonModal open onClose={close} />}
      </Suspense>
    </Container>
  );
}

export default function UnitEditPage() {
  return (
    <UnitEditProvider>
      <UnitEditPageInner />
    </UnitEditProvider>
  );
}
