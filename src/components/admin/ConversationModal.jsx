// src/components/admin/ConversationModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, IconButton, Divider, Snackbar, Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

export default function ConversationModal({ open, onClose }) {
  const { conversation, setConversation, savePartFromState, savePartWithJSON, buildPartFromState } = useUnitEdit();
  const [jsonStr, setJsonStr] = useState("[]");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) setJsonStr(JSON.stringify(buildPartFromState("conversation"), null, 2));
  }, [open, buildPartFromState]);

  const add = () => setConversation([ ...conversation, { speaker: "A", chinese: "", pinyin: "", pronunciation: "", meaning: "" } ]);
  const update = (i, field, v) => { const next = [...conversation]; next[i][field] = v; setConversation(next); };
  const del = (i) => setConversation(conversation.filter((_, idx) => idx !== i));

  const saveCurrent = async () => {
    try { await savePartFromState("conversation"); setSnack("대화 저장 완료"); }
    catch (e) { console.error(e); setSnack("대화 저장 실패"); }
  };
  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("conversation", parsed);
      setConversation(parsed);
      setSnack("대화(JSON) 저장 완료");
    } catch (e) { console.error(e); setSnack("JSON 파싱/저장 실패"); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>대화 관리</DialogTitle>
      <DialogContent dividers>
        {conversation.map((c, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={1}><TextField label="화자" value={c.speaker || ""} onChange={(e) => update(i, "speaker", e.target.value)} fullWidth /></Grid>
            {["chinese", "pinyin", "pronunciation", "meaning"].map((f) => (
              <Grid item xs={2.75} key={f}><TextField label={f} value={c[f] || ""} onChange={(e) => update(i, f, e.target.value)} fullWidth /></Grid>
            ))}
            <Grid item xs={0.5}><IconButton onClick={() => del(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={add}>+ 대화 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (conversation)"
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
