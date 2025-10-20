// src/components/admin/VocabularyModal.jsx — v4.1-fix
// Fix: unit의 ID 배열 필드 자동 감지(vocabIds 우선, 없으면 wordIds)
//      추가/삭제/리네임 시 해당 필드 정확히 갱신(순서 유지)
//      화면 로드·표시도 유닛 배열 순서 보장

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Container, Grid, Paper, Stack, TextField, Typography, Button,
  Chip, IconButton, Tooltip, Alert, Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";

import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

// 기존 헬퍼: /words upsert, words 조회
import {
  fetchWordsByIds,
  upsertWord,
} from "../../firebase/firebaseFirestore";

// 👉 유닛 필드 직접 업데이트용(Firestore v9)
import { db } from "../../firebase/firebaseConfig";
import {
  doc, getDoc, updateDoc,
} from "firebase/firestore";

// ===== 유틸 =====
const NEW_ITEM_TEMPLATE = {
  zh: "",
  pinyin: "",
  ko: "",
  pos: "",
  tags: [],
  sentence: "",
  sentencePinyin: "",
  sentenceKo: "",
  sentenceKoPronunciation: "", // 신키
  grammar: [],
  extensions: [{ zh: "", pinyin: "", ko: "", koPron: "" }],
  keyPoints: [],
  pronunciation: [], // [{label,pinyin,ko,tone}]
};

/** 스키마 보정: 구키→신키 치환 */
const fixWordSchema = (raw = {}) => {
  const w = { ...raw };

  // id/zh 보완
  if (!w.zh && (w.hanzi || w.id)) w.zh = w.hanzi || w.id;

  // 문장 한국어 발음
  if (w.sentenceKoPronunciation == null && w.sentencePron != null) {
    w.sentenceKoPronunciation = w.sentencePron;
  }

  // 확장 예문 키 보정
  if (Array.isArray(w.extensions)) {
    w.extensions = w.extensions.map((e) => {
      const ex = { ...(e || {}) };
      if (ex.koPron == null && ex.pron != null) ex.koPron = ex.pron;
      return ex;
    });
  }

  return w;
};

// ID 추출(여러 스키마 대응)
const getId = (v = {}) => String(v.id ?? v.zh ?? v.hanzi ?? "").trim();

// 배열을 유닛의 id 순서대로 정렬
const orderByIds = (ids = [], words = []) => {
  const map = new Map(words.map(w => [getId(w), w]));
  const out = [];
  const seen = new Set();
  for (const id of ids.map(String)) {
    if (seen.has(id)) continue;
    const w = map.get(id);
    if (w) { out.push(w); seen.add(id); }
  }
  return out;
};

// ===== 유닛 배열 필드 조작(직접 Firestore 업데이트) =====
async function readUnitIds(unitId, fieldKey) {
  const ref = doc(db, "units", String(unitId));
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const arr = Array.isArray(data?.[fieldKey]) ? data[fieldKey] : [];
  return { ref, data, arr };
}

async function addIdsToUnit(unitId, fieldKey, newIds = []) {
  const { ref, arr } = await readUnitIds(unitId, fieldKey);
  const base = arr.map(String);
  const extra = newIds.map(String).filter(id => !base.includes(id));
  const next = [...base, ...extra];
  if (extra.length > 0) {
    await updateDoc(ref, { [fieldKey]: next, updatedAt: Date.now() });
  }
  return next;
}

async function removeIdFromUnit(unitId, fieldKey, targetId) {
  const { ref, arr } = await readUnitIds(unitId, fieldKey);
  const next = arr.map(String).filter(id => id !== String(targetId));
  if (next.length !== arr.length) {
    await updateDoc(ref, { [fieldKey]: next, updatedAt: Date.now() });
  }
  return next;
}

// 리네임(교체): 기존 위치를 유지하면서 wasId → newId로 교체
async function replaceIdInUnit(unitId, fieldKey, wasId, newId) {
  const { ref, arr } = await readUnitIds(unitId, fieldKey);
  const ids = arr.map(String);
  const i = ids.indexOf(String(wasId));
  if (i === -1) {
    // 기존에 없으면 append
    const appended = [...ids, String(newId)];
    await updateDoc(ref, { [fieldKey]: appended, updatedAt: Date.now() });
    return appended;
  }
  // 자리 유지 교체, 중복 방지
  const next = ids.slice();
  next[i] = String(newId);
  for (let k = next.length - 1; k >= 0; k--) {
    if (k !== i && next[k] === String(newId)) next.splice(k, 1);
  }
  await updateDoc(ref, { [fieldKey]: next, updatedAt: Date.now() });
  return next;
}

export default function VocabularyModal({ open, onClose }) {
  // UnitEditProvider에서 unitId / unit 제공
  const {
    unitId: editUnitId,
    unit,              // { ..., vocabIds?:[], wordIds?:[] }
    reloadUnit,        // optional
  } = useUnitEdit();

  // 🔑 유닛 배열 필드 자동 감지
  const idsField = useMemo(() => {
    if (Array.isArray(unit?.vocabIds)) return "vocabIds";
    if (Array.isArray(unit?.wordIds)) return "wordIds";
    // 기본은 vocabIds로 운용
    return "vocabIds";
  }, [unit]);

  const unitIds = useMemo(() => {
    const arr = Array.isArray(unit?.[idsField]) ? unit[idsField] : [];
    return arr.map(String);
  }, [unit, idsField]);

  // 화면 상태
  const [message, setMessage] = useState(null);
  const [query, setQuery] = useState("");
  const [words, setWords] = useState([]); // /words에서 로드된 단어 목록

  // JSON 인라인 편집
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonMeta, setJsonMeta] = useState({ index: -1, originalId: "" });

  // ===== 로딩 =====
  const loadWords = useCallback(async () => {
    try {
      const fetched = unitIds.length ? await fetchWordsByIds(unitIds) : [];
      // 유닛의 배열 순서대로 재정렬
      setWords(orderByIds(unitIds, fetched));
    } catch (e) {
      console.error(e);
      setWords([]);
    }
  }, [unitIds]);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setQuery("");
    setJsonOpen(false);
    loadWords();
  }, [open, loadWords]);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return words;
    const h = (x) => (x || "").toString().toLowerCase();
    return words.filter((v) => {
      const zh = v.zh ?? v.hanzi ?? v.id ?? v.cn;
      const tags = Array.isArray(v.tags) ? v.tags.join(" ") : "";
      let pronStr = "";
      if (typeof v.pronunciation === "string") pronStr = v.pronunciation;
      else if (Array.isArray(v.pronunciation) && v.pronunciation.length) {
        pronStr = v.pronunciation[0]?.ko || v.pronunciation[0]?.pinyin || "";
      }
      return [
        zh, v.pinyin, v.ko ?? v.meaning, v.pos, tags,
        v.sentence, v.sentencePinyin, v.sentenceKo, pronStr,
      ].filter(Boolean).some((x) => h(x).includes(q));
    });
  }, [words, query]);

  // 항목 클릭 → JSON 모달
  const openJsonEditor = (idx, v) => {
    const wordId = getId(v);
    setJsonMeta({ index: idx, originalId: wordId });
    setJsonText(JSON.stringify(v, null, 2));
    setJsonOpen(true);
  };

  // 새 단어 추가
  const openNewItemEditor = () => {
    setJsonMeta({ index: -1, originalId: "" });
    setJsonText(JSON.stringify(NEW_ITEM_TEMPLATE, null, 2));
    setJsonOpen(true);
  };

  // JSON 저장(신규/수정 → /words upsert + unit.<idsField> 연결)
  const onSaveJson = async () => {
    try {
      const parsedRaw = JSON.parse(jsonText);
      if (!parsedRaw || typeof parsedRaw !== "object") {
        throw new Error("올바른 JSON 객체가 아닙니다.");
      }
      const parsed = fixWordSchema(parsedRaw);
      const newId = getId(parsed);
      if (!newId) throw new Error("wordId(zh/hanzi/id) 중 하나는 필수입니다.");

      // 1) /words upsert
      await upsertWord(newId, parsed);

      // 2) unit 연결/교체 (정확한 필드에 반영)
      const wasId = jsonMeta.originalId;
      if (!wasId) {
        await addIdsToUnit(editUnitId, idsField, [newId]); // 신규
      } else if (wasId !== newId) {
        await replaceIdInUnit(editUnitId, idsField, wasId, newId); // 리네임
      } else {
        // 동일 ID면 연결 변경 없음
      }

      setMessage({ type: "success", text: "저장 완료" });
      setJsonOpen(false);

      // 화면 갱신
      await loadWords();
      if (typeof reloadUnit === "function") await reloadUnit();
    } catch (e) {
      setMessage({ type: "error", text: `JSON 저장 실패: ${e.message}` });
    }
  };

  // 삭제: unit 연결만 제거(문서 보존)
  const onDelete = async (v) => {
    const wordId = getId(v);
    if (!wordId) return;
    if (!window.confirm(`${wordId} 단어를 이 유닛에서 제거할까요? (/words 문서는 보존됩니다)`)) return;
    try {
      await removeIdFromUnit(editUnitId, idsField, wordId);
      setMessage({ type: "success", text: "유닛에서 제거 완료" });
      await loadWords();
      if (typeof reloadUnit === "function") await reloadUnit();
    } catch (e) {
      setMessage({ type: "error", text: e?.message || "제거 실패" });
    }
  };

  // JSON 복사
  const onCopyJson = async (v) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(v, null, 2));
      setMessage({ type: "success", text: "JSON이 클립보드에 복사되었습니다." });
    } catch {
      setMessage({ type: "error", text: "복사 실패: 브라우저 권한을 확인하세요." });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>단어 관리 (유닛) — /words 저장 + unit.{idsField} 연결</DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* 상단 바 */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="새 단어 추가(템플릿으로 시작)">
                <span>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNewItemEditor} sx={{ textTransform: "none" }}>
                    새 단어
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="목록 새로고침">
                <span>
                  <IconButton onClick={loadWords}><RefreshIcon /></IconButton>
                </span>
              </Tooltip>
            </Stack>
            <TextField
              placeholder="검색: 한자/병음/뜻/예문/품사/태그"
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Stack>

          {message && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}

          {/* 단어 목록 */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  단어 목록 ({filtered.length} / {words.length}) — 필드: <b>{idsField}</b>
                </Typography>

                <Stack spacing={1}>
                  {filtered.map((v) => {
                    const name = getId(v) || "item";
                    return (
                      <Stack
                        key={name}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          "&:hover": { background: "#fafafa", cursor: "pointer" },
                        }}
                        onClick={() => openJsonEditor(words.indexOf(v), v)}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 700, minWidth: 80 }}>
                            {v.zh ?? v.hanzi ?? v.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(v.pinyin || "").trim()} — {(v.ko ?? v.meaning ?? "").trim()}
                          </Typography>
                          {v.pos && <Chip size="small" label={v.pos} sx={{ ml: 1 }} />}
                          {(v.tags || []).map((t) => (
                            <Chip key={t} size="small" variant="outlined" label={t} sx={{ ml: 0.5 }} />
                          ))}
                        </Stack>

                        <Stack direction="row" spacing={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="JSON 복사">
                            <IconButton size="small" onClick={() => onCopyJson(v)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="JSON 편집">
                            <IconButton size="small" onClick={() => openJsonEditor(words.indexOf(v), v)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="유닛에서 제거(연결만 삭제)">
                            <IconButton size="small" onClick={() => onDelete(v)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    );
                  })}

                  {filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      결과가 없습니다.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      {/* JSON 편집 모달(단일 항목) */}
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              JSON 편집 — {jsonMeta.index >= 0 ? jsonMeta.originalId : "새 단어"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            multiline
            minRows={18}
            fullWidth
            InputProps={{
              sx: {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            * <b>zh/hanzi/id</b> 중 하나는 반드시 있어야 합니다. 저장 시 /words에 반영되고 현재 유닛(<b>{idsField}</b>)에 연결됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)} sx={{ textTransform: "none" }}>
            닫기
          </Button>
          <Button variant="contained" onClick={onSaveJson} sx={{ textTransform: "none" }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 우측 하단 알림 */}
      {message && (
        <Box sx={{ position: "fixed", inset: "auto 24px 24px auto", zIndex: 1300 }}>
          <Alert severity={message.type} onClose={() => setMessage(null)} variant="filled" sx={{ boxShadow: 2 }}>
            {message.text}
          </Alert>
        </Box>
      )}
    </Dialog>
  );
}
