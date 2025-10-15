// src/components/admin/JsonModal.jsx
import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Snackbar,
} from "@mui/material";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

export default function JsonModal({ open, onClose }) {
  const { jsonInput, setJsonInput, saveJSON } = useUnitEdit();
  const [msg, setMsg] = useState("");
  const [openSnack, setOpenSnack] = useState(false);

  const handleSave = async () => {
    try { await saveJSON(); setMsg("JSON 저장 완료"); }
    catch (e) { console.error(e); setMsg("JSON 저장 실패"); }
    setOpenSnack(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>JSON 직접 편집 (전체)</DialogTitle>
      <DialogContent dividers>
        <TextField
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          fullWidth multiline rows={16}
          sx={{ fontFamily: "monospace" }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleSave}>JSON 저장</Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
      <Snackbar open={openSnack} autoHideDuration={2500} onClose={() => setOpenSnack(false)} message={msg} />
    </Dialog>
  );
}
