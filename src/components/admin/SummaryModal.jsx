// src/components/admin/SummaryModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField, IconButton, Typography, Divider, Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

export default function SummaryModal({ open, onClose }) {
  const { summary, setSummary, savePartFromState, savePartWithJSON, buildPartFromState } = useUnitEdit();
  const [jsonStr, setJsonStr] = useState("{}");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) setJsonStr(JSON.stringify(buildPartFromState("summary"), null, 2));
  }, [open, buildPartFromState]);

  const addWord = () => setSummary({ ...summary, vocabulary: [...(summary.vocabulary || []), ""] });
  const updWord = (i, v) => { const arr=[...(summary.vocabulary||[])]; arr[i]=v; setSummary({ ...summary, vocabulary: arr }); };
  const delWord = (i) => setSummary({ ...summary, vocabulary: (summary.vocabulary || []).filter((_, idx) => idx !== i) });

  const addGr = () => setSummary({ ...summary, grammar: [...(summary.grammar || []), ""] });
  const updGr = (i, v) => { const arr=[...(summary.grammar||[])]; arr[i]=v; setSummary({ ...summary, grammar: arr }); };
  const delGr = (i) => setSummary({ ...summary, grammar: (summary.grammar || []).filter((_, idx) => idx !== i) });

  const saveCurrent = async () => {
    try { await savePartFromState("summary"); setSnack("요약 저장 완료"); }
    catch (e) { console.error(e); setSnack("요약 저장 실패"); }
  };
  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("summary", parsed);
      setSummary(parsed);
      setSnack("요약(JSON) 저장 완료");
    } catch (e) { console.error(e); setSnack("JSON 파싱/저장 실패"); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>요약 관리</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>핵심 단어</Typography>
        {(summary.vocabulary || []).map((w, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField fullWidth value={w} onChange={(e) => updWord(i, e.target.value)} />
            <IconButton onClick={() => delWord(i)} color="error"><DeleteIcon /></IconButton>
          </Box>
        ))}
        <Button onClick={addWord}>+ 단어 추가</Button>

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>핵심 문법</Typography>
        {(summary.grammar || []).map((g, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField fullWidth value={g} onChange={(e) => updGr(i, e.target.value)} />
            <IconButton onClick={() => delGr(i)} color="error"><DeleteIcon /></IconButton>
          </Box>
        ))}
        <Button onClick={addGr}>+ 문법 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (summary)"
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
