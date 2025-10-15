// src/components/admin/VocabularyModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, Chip, IconButton, Divider, Snackbar, Box,  // ← Box 추가
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

const toTagsArray = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const toTagsString = (tags) => (Array.isArray(tags) ? tags.join(",") : (tags || ""));

export default function VocabularyModal({ open, onClose }) {
  const { vocabulary, setVocabulary, buildPartFromState, savePartFromState, savePartWithJSON } = useUnitEdit();
  const [jsonStr, setJsonStr] = useState("[]");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) setJsonStr(JSON.stringify(buildPartFromState("vocabulary"), null, 2));
  }, [open, buildPartFromState]);

  const addVocab = () =>
    setVocabulary([
      ...vocabulary,
      { hanzi: "", pinyin: "", pronunciation: "", meaning: "", pos: "", tags: [] },
    ]);

  const updateVocab = (i, field, value) => {
    const next = [...vocabulary];
    if (field === "tags") next[i].tags = toTagsArray(value);
    else next[i][field] = value;
    setVocabulary(next);
  };

  const deleteVocab = (i) => setVocabulary(vocabulary.filter((_, idx) => idx !== i));

  const saveCurrent = async () => {
    try { await savePartFromState("vocabulary"); setSnack("단어 저장 완료"); }
    catch (e) { console.error(e); setSnack("단어 저장 실패"); }
  };
  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("vocabulary", parsed);
      setVocabulary(parsed);
      setSnack("단어(JSON) 저장 완료");
    } catch (e) {
      console.error(e); setSnack("JSON 파싱/저장 실패");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>단어 관리</DialogTitle>
      <DialogContent dividers>
        {vocabulary.map((v, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={2}><TextField label="한자" value={v.hanzi || ""} onChange={(e) => updateVocab(i, "hanzi", e.target.value)} fullWidth /></Grid>
            <Grid item xs={2}><TextField label="Pinyin" value={v.pinyin || ""} onChange={(e) => updateVocab(i, "pinyin", e.target.value)} fullWidth /></Grid>
            <Grid item xs={2}><TextField label="발음" value={v.pronunciation || ""} onChange={(e) => updateVocab(i, "pronunciation", e.target.value)} fullWidth /></Grid>
            <Grid item xs={3}><TextField label="뜻" value={v.meaning || ""} onChange={(e) => updateVocab(i, "meaning", e.target.value)} fullWidth /></Grid>
            <Grid item xs={1.5}><TextField label="품사(pos)" value={v.pos || ""} onChange={(e) => updateVocab(i, "pos", e.target.value)} fullWidth /></Grid>
            <Grid item xs={1.5}><TextField label="태그(쉼표)" value={toTagsString(v.tags)} onChange={(e) => updateVocab(i, "tags", e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}>
              {(v.tags || []).map((t, idx) => <Chip key={idx} label={t} size="small" sx={{ mr: .5, mt: .5 }} />)}
              <IconButton onClick={() => deleteVocab(i)} color="error" sx={{ ml: 1 }}><DeleteIcon /></IconButton>
            </Grid>
          </Grid>
        ))}
        <Button onClick={addVocab}>+ 단어 추가</Button>

        <Divider sx={{ my: 2 }} />

        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (vocabulary)"
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
