// src/components/admin/SubstitutionModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Grid, TextField,  IconButton, Divider, Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

const norm = (sp) => {
  if (!sp)
    return {
      title: "",
      pattern: "",
      slots: [],
      items: {},
      pron_pattern: "",
      pron_dict: [],
      meaning_pattern: "",
      meaning_dict: [],
      meaning: ""
    };
  const items = {};
  if (sp.items && typeof sp.items === "object") {
    Object.keys(sp.items).forEach((k) => {
      items[k] = (sp.items[k] || []).map((it) => ({
        hanzi: it.hanzi || "",
        pinyin: it.pinyin || "",
        pron: it.pron || it.pronunciation || "",
        meaning: it.meaning || it.ko || "",
      }));
    });
  }
  return {
    title: sp.title || "",
    pattern: sp.pattern || "",
    slots: Array.isArray(sp.slots) ? sp.slots : [],
    items,
    pron_pattern: sp.pron_pattern || "",
    pron_dict: Array.isArray(sp.pron_dict) ? sp.pron_dict : [],
    meaning_pattern: sp.meaning_pattern || "",
    meaning_dict: Array.isArray(sp.meaning_dict) ? sp.meaning_dict : [],
    meaning: sp.meaning || sp.meaning_ko || sp.ko || sp.translation || "",
  };
};

export default function SubstitutionModal({ open, onClose }) {
  const { practice, setPractice, savePartFromState, savePartWithJSON, buildPartFromState } = useUnitEdit();
  const p = practice && !Array.isArray(practice) ? practice : { substitution: [] };
  const [jsonStr, setJsonStr] = useState("[]");
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (open) {
      setJsonStr(JSON.stringify(buildPartFromState("practice.substitution"), null, 2));
    }
  }, [open, buildPartFromState]);

  const basePrev = (prev) =>
    (prev && !Array.isArray(prev) ? prev : { reading: [], writing: [], reorder: [], extension_phrases: [], substitution: [] });

  const addPattern = () =>
    setPractice((prev) => ({
      ...basePrev(prev),
      substitution: [
        ...(p.substitution || []),
        { title: "", pattern: "", slots: [], items: {}, pron_pattern: "", pron_dict: [], meaning_pattern: "", meaning_dict: [], meaning: "" }
      ]
    }));

  const updField = (si, field, val) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      arr[si] = { ...sp, [field]: val };
      return { ...basePrev(prev), substitution: arr };
    });

  const addSlot = (si) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      const k = `slot${(sp.slots?.length || 0) + 1}`;
      sp.slots = [...(sp.slots || []), k];
      sp.items = { ...(sp.items || {}), [k]: [] };
      arr[si] = sp;
      return { ...basePrev(prev), substitution: arr };
    });

  const renameSlot = (si, oldKey, newKey) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      const slots = sp.slots.map((s) => (s === oldKey ? newKey : s));
      const items = { ...sp.items };
      if (items[oldKey]) {
        items[newKey] = items[oldKey];
        delete items[oldKey];
      }
      arr[si] = { ...sp, slots, items };
      return { ...basePrev(prev), substitution: arr };
    });

  const delSlot = (si, key) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      sp.slots = (sp.slots || []).filter((s) => s !== key);
      const items = { ...(sp.items || {}) };
      delete items[key];
      arr[si] = { ...sp, items };
      return { ...basePrev(prev), substitution: arr };
    });

  const addItem = (si, key) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      sp.items[key] = [...(sp.items[key] || []), { hanzi: "", pinyin: "", pron: "", meaning: "" }];
      arr[si] = sp;
      return { ...basePrev(prev), substitution: arr };
    });

  const updItem = (si, key, ii, field, val) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      const list = [...(sp.items[key] || [])];
      list[ii] = { ...list[ii], [field]: val };
      sp.items[key] = list;
      arr[si] = sp;
      return { ...basePrev(prev), substitution: arr };
    });

  const delItem = (si, key, ii) =>
    setPractice((prev) => {
      const arr = [...(p.substitution || [])];
      const sp = norm(arr[si]);
      sp.items[key] = (sp.items[key] || []).filter((_, idx) => idx !== ii);
      arr[si] = sp;
      return { ...basePrev(prev), substitution: arr };
    });

  const delPattern = (si) =>
    setPractice((prev) => ({ ...basePrev(prev), substitution: (p.substitution || []).filter((_, idx) => idx !== si) }));

  const saveCurrent = async () => {
    try {
      await savePartFromState("practice.substitution");
      setSnack("교체연습 저장 완료");
    } catch (e) {
      console.error(e);
      setSnack("교체연습 저장 실패");
    }
  };

  const saveJSONPart = async () => {
    try {
      const parsed = JSON.parse(jsonStr);
      await savePartWithJSON("practice.substitution", parsed);
      setPractice((prev) => ({ ...basePrev(prev), substitution: parsed }));
      setSnack("교체연습(JSON) 저장 완료");
    } catch (e) {
      console.error(e);
      setSnack("JSON 파싱/저장 실패");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>교체연습 (다중 슬롯)</DialogTitle>
      <DialogContent dividers>
        {(p.substitution || []).map((s, si) => {
          const sp = norm(s);
          return (
            <Box key={`sub-${si}`} sx={{ mb: 2, border: "1px solid #eee", p: 2, borderRadius: 1 }}>
              <TextField
                label="title"
                value={sp.title || ""}
                onChange={(e) => updField(si, "title", e.target.value)}
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="pattern"
                value={sp.pattern || ""}
                onChange={(e) => updField(si, "pattern", e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="meaning (패턴 한국어: 예) 너 {object} 있어?"
                value={sp.meaning || ""}
                onChange={(e) => updField(si, "meaning", e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />

              {(sp.slots || []).map((slotKey) => (
                <Box key={slotKey} sx={{ border: "1px dashed #bbb", p: 1.5, mb: 2, borderRadius: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={8}>
                      <TextField
                        label="슬롯 이름"
                        fullWidth
                        value={slotKey}
                        onChange={(e) => renameSlot(si, slotKey, e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4} textAlign="right">
                      <Button color="error" onClick={() => delSlot(si, slotKey)}>슬롯 삭제</Button>
                    </Grid>
                  </Grid>

                  {(sp.items?.[slotKey] || []).map((it, ii) => (
                    <Grid container spacing={1} key={`itm-${si}-${slotKey}-${ii}`} sx={{ mt: 1 }}>
                      <Grid item xs={3}>
                        <TextField label="한자" value={it.hanzi || ""} onChange={(e) => updItem(si, slotKey, ii, "hanzi", e.target.value)} fullWidth />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField label="병음" value={it.pinyin || ""} onChange={(e) => updItem(si, slotKey, ii, "pinyin", e.target.value)} fullWidth />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField label="발음" value={it.pron || ""} onChange={(e) => updItem(si, slotKey, ii, "pron", e.target.value)} fullWidth />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField label="뜻" value={it.meaning || ""} onChange={(e) => updItem(si, slotKey, ii, "meaning", e.target.value)} fullWidth />
                      </Grid>
                      <Grid item xs={12}>
                        <IconButton onClick={() => delItem(si, slotKey, ii)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Button size="small" onClick={() => addItem(si, slotKey)}>+ 교체어 추가</Button>
                </Box>
              ))}
              <Button size="small" onClick={() => addSlot(si)}>+ 슬롯 추가</Button>
              <IconButton onClick={() => delPattern(si)} color="error" sx={{ ml: 1 }}>
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        })}
        <Button onClick={addPattern}>+ 교체연습 추가</Button>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={saveCurrent}>현재 값으로 저장</Button>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="이 파트 JSON 편집 (practice.substitution)"
          value={jsonStr}
          onChange={(e) => setJsonStr(e.target.value)}
          fullWidth
          multiline
          rows={12}
          sx={{ fontFamily: "monospace" }}
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
