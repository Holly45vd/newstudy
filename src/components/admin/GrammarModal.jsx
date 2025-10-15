// src/components/admin/GrammarModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Grid, Switch, FormControlLabel, TextField, IconButton, Divider, Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

export default function GrammarModal({ open, onClose }) {
  const { grammar, setGrammar, savePartFromState, savePartWithJSON, buildPartFromState } = useUnitEdit();
  const [jsonStr, setJsonStr] = useState("[]");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) setJsonStr(JSON.stringify(buildPartFromState("grammar"), null, 2));
  }, [open, buildPartFromState]);

  const addGrammar = () =>
    setGrammar([
      ...grammar,
      {
        rule: "", description: "",
        example: { chinese: "", pinyin: "", pronunciation: "", meaning: "" },
        title: "", summary: "", notes: [], examples: [],
        __mode: "new",
      },
    ]);

  const toggleMode = (i) => { const next = [...grammar]; next[i].__mode = next[i].__mode === "new" ? "old" : "new"; setGrammar(next); };
  const updateField = (i, field, value) => { const next = [...grammar]; next[i][field] = value; setGrammar(next); };
  const updateExampleOld = (i, field, value) => { const next = [...grammar]; next[i].example = next[i].example || {}; next[i].example[field] = value; setGrammar(next); };
  const updateNotes = (i, s) => { const next = [...grammar]; next[i].notes = (s || "").split(",").map(x=>x.trim()).filter(Boolean); setGrammar(next); };
  const addExampleNew = (i) => { const next = [...grammar]; next[i].examples = next[i].examples || []; next[i].examples.push({ zh: "", py: "", pronunciation: "", ko: "" }); setGrammar(next); };
  const updateExampleNew = (gi, ei, field, value) => { const next = [...grammar]; next[gi].examples[ei][field] = value; setGrammar(next); };
  const remove = (i) => setGrammar(grammar.filter((_, idx) => idx !== i));

  const saveCurrent = async () => {
    try { await savePartFromState("grammar"); setSnack("문법 저장 완료"); }
    catch (e) { console.error(e); setSnack("문법 저장 실패"); }
  };
  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("grammar", parsed);
      setGrammar(parsed);
      setSnack("문법(JSON) 저장 완료");
    } catch (e) { console.error(e); setSnack("JSON 파싱/저장 실패"); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>문법 관리</DialogTitle>
      <DialogContent dividers>
        {grammar.map((g, i) => {
          const mode = g.__mode || (g.title || g.summary || g.examples ? "new" : "old");
          return (
            <Box key={i} sx={{ mb: 2, border: "1px solid #eee", p: 2, borderRadius: 1 }}>
              <FormControlLabel control={<Switch checked={mode === "new"} onChange={() => toggleMode(i)} />} label={mode === "new" ? "신형" : "구형"} />
              {mode === "new" ? (
                <>
                  <TextField label="title" value={g.title || ""} onChange={(e) => updateField(i, "title", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="summary" value={g.summary || ""} onChange={(e) => updateField(i, "summary", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="notes(쉼표)" value={(g.notes || []).join(",")} onChange={(e) => updateNotes(i, e.target.value)} fullWidth sx={{ mb: 2 }} />
                  {(g.examples || []).map((ex, ei) => (
                    <Grid container spacing={1} key={ei} sx={{ mb: 1 }}>
                      <Grid item xs={3}><TextField label="zh" value={ex.zh || ""} onChange={(e) => updateExampleNew(i, ei, "zh", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="py" value={ex.py || ""} onChange={(e) => updateExampleNew(i, ei, "py", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="pronunciation" value={ex.pronunciation || ""} onChange={(e) => updateExampleNew(i, ei, "pronunciation", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="ko" value={ex.ko || ""} onChange={(e) => updateExampleNew(i, ei, "ko", e.target.value)} fullWidth /></Grid>
                    </Grid>
                  ))}
                  <Button size="small" onClick={() => addExampleNew(i)}>+ 예문 추가</Button>
                </>
              ) : (
                <>
                  <TextField label="rule" value={g.rule || ""} onChange={(e) => updateField(i, "rule", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="description" value={g.description || ""} onChange={(e) => updateField(i, "description", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
                      <Grid item xs={3} key={field}>
                        <TextField label={`example.${field}`} value={g.example?.[field] || ""} onChange={(e) => updateExampleOld(i, field, e.target.value)} fullWidth />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
              <IconButton onClick={() => remove(i)} color="error" sx={{ mt: 1 }}><DeleteIcon /></IconButton>
            </Box>
          );
        })}
        <Button onClick={addGrammar}>+ 문법 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (grammar)"
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
