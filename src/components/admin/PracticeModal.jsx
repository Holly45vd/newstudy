// src/components/admin/PracticeModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, IconButton, Divider, Typography, Snackbar, Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

const ensureObj = (p) =>
  Array.isArray(p)
    ? { reading: [], writing: [], reorder: [], extension_phrases: [], substitution: [] }
    : p || { reading: [], writing: [], reorder: [], extension_phrases: [], substitution: [] };

export default function PracticeModal({ open, onClose }) {
  const { practice, setPractice, savePartFromState, savePartWithJSON, buildPartFromState } = useUnitEdit();
  const isNew = practice && !Array.isArray(practice);
  const [jsonStr, setJsonStr] = useState("{}");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) {
      const part = buildPartFromState("practice");
      // 이 모달은 substitution까지 포함된 practice 전체를 대상으로 저장
      setJsonStr(JSON.stringify(part, null, 2));
    }
  }, [open, buildPartFromState]);

  const saveCurrent = async () => {
    try { await savePartFromState("practice"); setSnack("연습(practice) 저장 완료"); }
    catch (e) { console.error(e); setSnack("연습 저장 실패"); }
  };
  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("practice", parsed);
      setPractice(parsed);
      setSnack("연습(JSON) 저장 완료");
    } catch (e) { console.error(e); setSnack("JSON 파싱/저장 실패"); }
  };

  // Legacy array UI
  if (!isNew) {
    const addLegacy = () => setPractice([...(practice || []), { question: "", options: [], answer: "" }]);
    const updLegacy = (i, field, v) => { const next = [...practice]; next[i][field] = field === "options" ? (v || "").split(",").map((s) => s.trim()) : v; setPractice(next); };
    const delLegacy = (i) => setPractice(practice.filter((_, idx) => idx !== i));

    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>연습 문제 (레거시)</DialogTitle>
        <DialogContent dividers>
          {(practice || []).map((p, i) => (
            <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
              <Grid item xs={12}><TextField label="문제" value={p.question || ""} onChange={(e) => updLegacy(i, "question", e.target.value)} fullWidth /></Grid>
              <Grid item xs={12}><TextField label="옵션(쉼표)" value={(p.options || []).join(",")} onChange={(e) => updLegacy(i, "options", e.target.value)} fullWidth /></Grid>
              <Grid item xs={12}><TextField label="정답" value={p.answer || ""} onChange={(e) => updLegacy(i, "answer", e.target.value)} fullWidth /></Grid>
              <Grid item xs={12}><IconButton onClick={() => delLegacy(i)} color="error"><DeleteIcon /></IconButton></Grid>
            </Grid>
          ))}
          <Button onClick={addLegacy}>+ 문제 추가</Button>

          <Divider sx={{ my: 2 }} />
          <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

          <Divider sx={{ my: 2 }} />
          <TextField
            label="이 파트 JSON 편집 (practice 전체)"
            value={jsonStr}
            onChange={(e) => setJsonStr(e.target.value)}
            fullWidth multiline rows={12} sx={{ fontFamily: "monospace" }}
          />
          <Box sx={{ mt: 1 }}>
            <Button variant="contained" onClick={saveJSONPart}>JSON으로 저장</Button>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
        <Snackbar open={!!snack} autoHideDuration={2200} onClose={() => setSnack("")} message={snack} />
      </Dialog>
    );
  }

  // New structure UI
  const ensure = () => setPractice((p) => ensureObj(p));
  const addReading = () => { ensure(); setPractice((p) => ({ ...p, reading: [...(p.reading || []), { zh: "", ko: "" }] })); };
  const updReading = (i, f, v) => setPractice((p) => { const arr = [...(p.reading || [])]; arr[i][f] = v; return { ...p, reading: arr }; });
  const delReading = (i) => setPractice((p) => ({ ...p, reading: (p.reading || []).filter((_, idx) => idx !== i) }));

  const addWriting = () => { ensure(); setPractice((p) => ({ ...p, writing: [...(p.writing || []), { prompt_ko: "", answer_zh: "" }] })); };
  const updWriting = (i, f, v) => setPractice((p) => { const arr = [...(p.writing || [])]; arr[i][f] = v; return { ...p, writing: arr }; });
  const delWriting = (i) => setPractice((p) => ({ ...p, writing: (p.writing || []).filter((_, idx) => idx !== i) }));

  const addReorder = () => { ensure(); setPractice((p) => ({ ...p, reorder: [...(p.reorder || []), { items: [], answer: "", hint_ko: "" }] })); };
  const updReorder = (i, f, v) => setPractice((p) => { const arr = [...(p.reorder || [])]; arr[i][f] = f === "items" ? (v || "").split(",").map((s) => s.trim()) : v; return { ...p, reorder: arr }; });
  const delReorder = (i) => setPractice((p) => ({ ...p, reorder: (p.reorder || []).filter((_, idx) => idx !== i) }));

  const addExt = () => { ensure(); setPractice((p) => ({ ...p, extension_phrases: [...(p.extension_phrases || []), { zh: "", py: "", pron: "", ko: "" }] })); };
  const updExt = (i, f, v) => setPractice((p) => { const arr = [...(p.extension_phrases || [])]; arr[i][f] = v; return { ...p, extension_phrases: arr }; });
  const delExt = (i) => setPractice((p) => ({ ...p, extension_phrases: (p.extension_phrases || []).filter((_, idx) => idx !== i) }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>연습 문제 & 확장 표현</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1">읽기</Typography>
        {(practice.reading || []).map((r, i) => (
          <Grid container spacing={1} key={`rd-${i}`} sx={{ mb: 1 }}>
            <Grid item xs={6}><TextField label="zh" value={r.zh || ""} onChange={(e) => updReading(i, "zh", e.target.value)} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="ko" value={r.ko || ""} onChange={(e) => updReading(i, "ko", e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><IconButton onClick={() => delReading(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={addReading}>+ 읽기 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">쓰기</Typography>
        {(practice.writing || []).map((w, i) => (
          <Grid container spacing={1} key={`wr-${i}`} sx={{ mb: 1 }}>
            <Grid item xs={6}><TextField label="prompt_ko" value={w.prompt_ko || ""} onChange={(e) => updWriting(i, "prompt_ko", e.target.value)} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="answer_zh" value={w.answer_zh || ""} onChange={(e) => updWriting(i, "answer_zh", e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><IconButton onClick={() => delWriting(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={addWriting}>+ 쓰기 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">배열</Typography>
        {(practice.reorder || []).map((r, i) => (
          <Grid container spacing={1} key={`re-${i}`} sx={{ mb: 1 }}>
            <Grid item xs={5}><TextField label="items(쉼표)" value={(r.items || []).join(",")} onChange={(e) => updReorder(i, "items", e.target.value)} fullWidth /></Grid>
            <Grid item xs={5}><TextField label="answer" value={r.answer || ""} onChange={(e) => updReorder(i, "answer", e.target.value)} fullWidth /></Grid>
            <Grid item xs={2}><TextField label="hint_ko" value={r.hint_ko || ""} onChange={(e) => updReorder(i, "hint_ko", e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><IconButton onClick={() => delReorder(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={addReorder}>+ 배열 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">확장 표현</Typography>
        {(practice.extension_phrases || []).map((e, i) => (
          <Grid container spacing={1} key={`ex-${i}`} sx={{ mb: 1 }}>
            <Grid item xs={3}><TextField label="zh" value={e.zh || ""} onChange={(ev) => updExt(i, "zh", ev.target.value)} fullWidth /></Grid>
            <Grid item xs={3}><TextField label="py" value={e.py || ""} onChange={(ev) => updExt(i, "py", ev.target.value)} fullWidth /></Grid>
            <Grid item xs={3}><TextField label="pron" value={e.pron || ""} onChange={(ev) => updExt(i, "pron", ev.target.value)} fullWidth /></Grid>
            <Grid item xs={3}><TextField label="ko" value={e.ko || ""} onChange={(ev) => updExt(i, "ko", ev.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><IconButton onClick={() => delExt(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={addExt}>+ 확장 표현 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장 (practice 전체)</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (practice 전체)"
          value={jsonStr}
          onChange={(e) => setJsonStr(e.target.value)}
          fullWidth multiline rows={12} sx={{ fontFamily: "monospace" }}
        />
        <Box sx={{ mt: 1 }}>
          <Button variant="contained" onClick={saveJSONPart}>JSON으로 저장</Button>
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
      <Snackbar open={!!snack} autoHideDuration={2200} onClose={() => setSnack("")} message={snack} />
    </Dialog>
  );
}
