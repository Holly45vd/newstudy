// src/components/admin/VocabularyModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Container, Grid, Paper, Stack, TextField, Typography, Button,
  Chip, Divider, IconButton, Tooltip, Alert, Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import { useUnitEdit } from "../../pages/admin/UnitEditProvider";

// ===== 유틸 =====
const toTagsString = (tags) =>
  Array.isArray(tags) ? tags.join(", ") : (tags || "");

const stringify = (v, fallback = "[]") => {
  try {
    return JSON.stringify(v ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
};

// 새 단어 기본 템플릿(필수: hanzi)
// 파일 상단 NEW_ITEM_TEMPLATE만 교체
const NEW_ITEM_TEMPLATE = {
  hanzi: "",
  pinyin: "",
  meaning: "",
  pos: "",
  tags: [],
  pronunciation: "",

  // ✅ 예문
  sentence: "",
  sentencePinyin: "",
  sentenceKo: "",
  sentencePron: "",        // ✅ 한국어 발음 추가

  // ✅ 확장/문법
  grammar: [],
  extensions: [
    // 예시 한 줄 포함(붙여넣기 편하도록)
    { zh: "", pinyin: "", ko: "", pron: "" } // ✅ pron(한국어 발음) 포함
  ],
  keyPoints: [],
  pronunciation_items: [], // [{label,pinyin,ko,tone}]
};


export default function VocabularyModal({ open, onClose }) {
  const {
    vocabulary = [],
    setVocabulary,
    buildPartFromState,
    savePartFromState,
  } = useUnitEdit();

  // 알림/검색
  const [message, setMessage] = useState(null);
  const [query, setQuery] = useState("");

  // JSON 인라인 편집 모달
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonMeta, setJsonMeta] = useState({ index: -1, originalHanzi: "" });

  // 스토어에서 다시 불러오기
  const reloadFromState = useCallback(() => {
    const arr = buildPartFromState("vocabulary");
    setVocabulary(Array.isArray(arr) ? arr : []);
  }, [buildPartFromState, setVocabulary]);

  // 열릴 때 동기화
  useEffect(() => {
    if (!open) return;
    reloadFromState();
    setQuery("");
    setMessage(null);
    setJsonOpen(false);
  }, [open, reloadFromState]);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return vocabulary;
    const h = (x) => (x || "").toString().toLowerCase();
    return vocabulary.filter((v) => {
      const zh = v.hanzi ?? v.zh ?? v.id ?? v.cn;
      const tags = Array.isArray(v.tags) ? v.tags.join(" ") : "";
      const pronStr =
        typeof v.pronunciation === "string"
          ? v.pronunciation
          : Array.isArray(v.pronunciation)
          ? (v.pronunciation[0]?.ko || v.pronunciation[0]?.pinyin || "")
          : "";
      return [
        zh, v.pinyin, v.meaning ?? v.ko, v.pos, tags,
        v.sentence, v.sentencePinyin, v.sentenceKo, pronStr,
      ]
        .filter(Boolean)
        .some((x) => h(x).includes(q));
    });
  }, [vocabulary, query]);

  // 항목 클릭 → JSON 모달 열기
  const openJsonEditor = (idx, v) => {
    const name = v.hanzi || v.zh || v.id || v.cn || "";
    setJsonMeta({ index: idx, originalHanzi: name });
    setJsonText(JSON.stringify(v, null, 2));
    setJsonOpen(true);
  };

  // 새 단어 추가 → 템플릿으로 모달 열기(배열에 즉시 넣지는 않음)
  const openNewItemEditor = () => {
    setJsonMeta({ index: -1, originalHanzi: "" });
    setJsonText(JSON.stringify(NEW_ITEM_TEMPLATE, null, 2));
    setJsonOpen(true);
  };

  // onSaveJson 함수 안 try 블록에서 parsed 유효성 검사 후, setVocabulary 전에 아래 보정 로직을 추가
// (기존 onSaveJson 전체를 교체해도 됩니다)
const onSaveJson = () => {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("올바른 JSON 객체가 아닙니다.");
    }

    // cn/zh/id → hanzi 승격
    if (!parsed.hanzi && (parsed.cn || parsed.zh || parsed.id)) {
      parsed.hanzi = parsed.cn || parsed.zh || parsed.id;
      delete parsed.cn;
      delete parsed.zh;
      delete parsed.id;
    }
    if (!parsed.hanzi || typeof parsed.hanzi !== "string" || !parsed.hanzi.trim()) {
      throw new Error("필드 'hanzi'는 필수입니다.");
    }

    // ✅ 누락 필드 보정
    if (parsed.sentence && parsed.sentencePron == null) parsed.sentencePron = "";
    if (Array.isArray(parsed.extensions)) {
      parsed.extensions = parsed.extensions.map((e) => ({
        zh: e?.zh ?? "",
        pinyin: e?.pinyin ?? "",
        ko: e?.ko ?? "",
        pron: e?.pron ?? "",          // ✅ 확장 예문 한국어 발음
      }));
    }

    const idx = jsonMeta.index;
    const next = [...vocabulary];
    if (idx >= 0 && idx < next.length) next[idx] = parsed;
    else next.push(parsed);

    setVocabulary(next);
    setMessage({ type: "success", text: "JSON 저장 완료" });
    setJsonOpen(false);
  } catch (e) {
    setMessage({ type: "error", text: `JSON 저장 실패: ${e.message}` });
  }
};


  // 삭제
  const onDelete = (idx, v) => {
    const name = v.hanzi || v.zh || v.id || v.cn || "(이름 없음)";
    if (!window.confirm(`${name} 단어를 삭제할까요?`)) return;
    const next = vocabulary.filter((_, i) => i !== idx);
    setVocabulary(next);
    setMessage({ type: "success", text: "삭제 완료" });
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

  // Firestore 반영
  const onSaveAll = async () => {
    try {
      await savePartFromState("vocabulary");
      setMessage({ type: "success", text: "단어 저장 완료" });
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "단어 저장 실패" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>단어 관리 (유닛) — 항목 클릭으로 JSON 편집</DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* 상단 바 */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="새 단어 추가(템플릿으로 JSON 편집 시작)">
                <span>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openNewItemEditor} sx={{ textTransform: "none" }}>
                    새 단어
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="현재 편집 중인 배열 상태를 Firestore에 저장">
                <span>
                  <Button variant="outlined" startIcon={<SaveIcon />} onClick={onSaveAll} sx={{ textTransform: "none" }}>
                    Firestore 저장
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="스토어에서 다시 불러오기(되돌리기)">
                <span>
                  <IconButton onClick={reloadFromState}><RefreshIcon /></IconButton>
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
                  단어 목록 ({filtered.length} / {vocabulary.length})
                </Typography>

                <Stack spacing={1}>
                  {filtered.map((v, i) => {
                    const name = v.hanzi || v.zh || v.id || v.cn || "item";
                    const idx = vocabulary.indexOf(v); // 원본 인덱스
                    return (
                      <Stack
                        key={`${name}-${idx}`}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          "&:hover": { background: "#fafafa", cursor: "pointer" },
                        }}
                        onClick={() => openJsonEditor(idx, v)}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 700, minWidth: 80 }}>
                            {name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(v.pinyin || "").trim()} — {(v.meaning ?? v.ko ?? "").trim()}
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
                            <IconButton size="small" onClick={() => openJsonEditor(idx, v)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton size="small" onClick={() => onDelete(idx, v)}>
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

      {/* 하단 닫기 */}
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      {/* JSON 편집 모달(단일 항목) */}
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              JSON 편집 — {jsonMeta.index >= 0 ? `#${jsonMeta.index + 1} / ${jsonMeta.originalHanzi}` : "새 단어"}
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
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            * <b>hanzi</b>가 없으면 저장되지 않습니다. (cn/zh/id가 있으면 자동으로 hanzi로 승격)
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
          <Alert
            severity={message.type}
            onClose={() => setMessage(null)}
            variant="filled"
            sx={{ boxShadow: 2 }}
          >
            {message.text}
          </Alert>
        </Box>
      )}
    </Dialog>
  );
}
