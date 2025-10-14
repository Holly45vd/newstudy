import React, { useEffect, useMemo, useState } from "react";
import {
  Container, Grid, Paper, Stack, TextField, Typography, Button,
  Chip, Divider, IconButton, Tooltip, Alert, Box, Dialog,
  DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  upsertEverydayWord,
  listEverydayWordsGroupedByDate,
  deleteEverydayWord,
  importEverydayGroupsBulk,            // ✅ 일괄 업로드 추가
} from "../../firebase/firebaseFirestore";

const emptyForm = {
  date: "",       // YYYY-MM-DD
  zh: "",
  pinyin: "",
  ko: "",
  pos: "",
  tags: "",       // 콤마 구분 입력 → 저장 시 배열 변환
  sentence: "",
  sentencePinyin: "",
  sentenceKo: "",
  grammar: `[
  { "term": "구조", "structure": "", "note": "" }
]`,
  extensions: `[
  { "zh": "", "pinyin": "", "ko": "" }
]`,
  keyPoints: `[
  "핵심 포인트 예시"
]`,
  pronunciation: `[
  { "label": "", "pinyin": "", "ko": "", "tone": "" }
]`,
};

export default function EverydayAdmin() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [groups, setGroups] = useState([]); // [{date, words:[...]}]
  const [query, setQuery] = useState("");   // 한국어/중국어/병음 검색

  // JSON 인라인 편집 모달 상태
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonMeta, setJsonMeta] = useState({ date: "", originalZh: "" }); // 리네임 감지용

  // ✅ 일괄 업로드 상태
  const [bulkJson, setBulkJson] = useState("");

   const load = async () => {
    setLoading(true);
    try {
      const data = await listEverydayWordsGroupedByDate();
      setGroups(Array.isArray(data) ? data : []); // ✅ 방어
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    const h = (x) => (x || "").toString().toLowerCase();

    return groups
      .map((g) => ({
        ...g,
        words: g.words.filter(
          (w) =>
            h(w.zh).includes(q) ||
            h(w.pinyin).includes(q) ||
            h(w.ko).includes(q)
        ),
      }))
      .filter((g) => g.words.length > 0);
  }, [groups, query]);

  const onChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const parseJSON = (field, fallback) => {
    try {
      const obj = JSON.parse(form[field] || "null");
      return obj ?? fallback;
    } catch {
      return fallback;
    }
  };

  const onSave = async () => {
    setMessage(null);
    try {
      if (!form.date) throw new Error("날짜(YYYY-MM-DD)를 입력하세요.");
      if (!form.zh) throw new Error("중국어 단어(zh)를 입력하세요.");

      const payload = {
        zh: form.zh.trim(),
        pinyin: form.pinyin.trim(),
        ko: form.ko.trim(),
        pos: form.pos.trim(),
        tags: form.tags
          ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        sentence: form.sentence.trim(),
        sentencePinyin: form.sentencePinyin.trim(),
        sentenceKo: form.sentenceKo.trim(),
        grammar: parseJSON("grammar", []),
        extensions: parseJSON("extensions", []),
        keyPoints: parseJSON("keyPoints", []),
        pronunciation: parseJSON("pronunciation", []),
      };

      await upsertEverydayWord(form.date, payload);
      setMessage({ type: "success", text: "저장 완료" });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  const onSelectWord = (date, w) => {
    setForm({
      date,
      zh: w.zh || "",
      pinyin: w.pinyin || "",
      ko: w.ko || "",
      pos: w.pos || "",
      tags: (w.tags || []).join(", "),
      sentence: w.sentence || "",
      sentencePinyin: w.sentencePinyin || "",
      sentenceKo: w.sentenceKo || "",
      grammar: JSON.stringify(w.grammar || [], null, 2),
      extensions: JSON.stringify(w.extensions || [], null, 2),
      keyPoints: JSON.stringify(w.keyPoints || [], null, 2),
      pronunciation: JSON.stringify(w.pronunciation || [], null, 2),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (date, zh) => {
    if (!window.confirm(`${date} / ${zh} 단어를 삭제할까요?`)) return;
    try {
      await deleteEverydayWord(date, zh);
      setMessage({ type: "success", text: "삭제 완료" });
      await load();
      if (form.date === date && form.zh === zh) setForm(emptyForm);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  // === JSON 인라인 편집 ===
  const openJsonEditor = (date, word) => {
    setJsonMeta({ date, originalZh: word.zh });
    setJsonText(JSON.stringify(word, null, 2));
    setJsonOpen(true);
  };

  const copyJson = async (word) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(word, null, 2));
      setMessage({ type: "success", text: "JSON이 클립보드에 복사되었습니다." });
    } catch (e) {
      setMessage({ type: "error", text: "복사 실패: 브라우저 권한을 확인하세요." });
    }
  };

  const onSaveJson = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") throw new Error("올바른 JSON 객체가 아닙니다.");
      if (!parsed.zh) throw new Error("필드 'zh'는 필수입니다.");
      const renamed = parsed.zh !== jsonMeta.originalZh;

      await upsertEverydayWord(jsonMeta.date, parsed);
      if (renamed) await deleteEverydayWord(jsonMeta.date, jsonMeta.originalZh);

      setMessage({ type: "success", text: "JSON 저장 완료" });
      setJsonOpen(false);
      await load();
    } catch (e) {
      setMessage({ type: "error", text: `JSON 저장 실패: ${e.message}` });
    }
  };

  // ✅ 일괄 업로드 핸들러
  const onBulkImport = async () => {
    setMessage(null);
    try {
      if (!bulkJson.trim()) throw new Error("업로드할 JSON 배열을 입력하세요.");
      const groups = JSON.parse(bulkJson);
      if (!Array.isArray(groups)) throw new Error("최상위가 배열이어야 합니다.");
      setLoading(true);
      await importEverydayGroupsBulk(groups);
      setMessage({ type: "success", text: "일괄 업로드 완료" });
      setBulkJson("");
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>중국어 공부 관리 (Everyday)</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            placeholder="검색: 중국어/병음/뜻(한국어)"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Tooltip title="새로고침">
            <span>
              <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* 좌측: 작성/수정 폼 */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              등록/수정
            </Typography>
            <Stack spacing={1.5}>
              <TextField label="날짜 YYYY-MM-DD" value={form.date} onChange={onChange("date")} />
              <Stack direction="row" spacing={1.5}>
                <TextField label="중국어(zh)" value={form.zh} onChange={onChange("zh")} fullWidth />
                <TextField label="병음(pinyin)" value={form.pinyin} onChange={onChange("pinyin")} fullWidth />
              </Stack>
              <TextField label="뜻(ko)" value={form.ko} onChange={onChange("ko")} />
              <Stack direction="row" spacing={1.5}>
                <TextField label="품사(pos)" value={form.pos} onChange={onChange("pos")} fullWidth />
                <TextField label="태그(tags, 콤마 구분)" value={form.tags} onChange={onChange("tags")} fullWidth />
              </Stack>

              <Divider />

              <Typography variant="body2" color="text.secondary">예문</Typography>
              <TextField label="문장 (zh)" value={form.sentence} onChange={onChange("sentence")} />
              <TextField label="문장 병음" value={form.sentencePinyin} onChange={onChange("sentencePinyin")} />
              <TextField label="문장 한국어" value={form.sentenceKo} onChange={onChange("sentenceKo")} />

              <Divider />

              <Typography variant="body2" color="text.secondary">문법/확장(JSON)</Typography>
              <TextField label="grammar (JSON 배열)" value={form.grammar} onChange={onChange("grammar")} multiline minRows={4} />
              <TextField label="extensions (JSON 배열)" value={form.extensions} onChange={onChange("extensions")} multiline minRows={3} />
              <TextField label="keyPoints (JSON 배열)" value={form.keyPoints} onChange={onChange("keyPoints")} multiline minRows={3} />
              <TextField label="pronunciation (JSON 배열)" value={form.pronunciation} onChange={onChange("pronunciation")} multiline minRows={3} />

              <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  sx={{ textTransform: "none" }}
                  disabled={loading}
                >
                  저장
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setForm(emptyForm)}
                  sx={{ textTransform: "none" }}
                >
                  새로 입력
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* ✅ 일괄 업로드(배열 → Firestore) */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              일괄 업로드 (배열 붙여넣기)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              형식: [{"{"}date:"YYYY-MM-DD", words:[{"{"}zh:"伞", ...{"}"}]{"}"}] — <b>StudyPage의 sampleData 그대로 OK</b>
            </Typography>
            <TextField
              label="groups JSON 배열"
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              multiline
              minRows={8}
              fullWidth
            />
            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <Button
                variant="contained"
                onClick={onBulkImport}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                일괄 업로드
              </Button>
              <Button
                variant="outlined"
                onClick={() => setBulkJson("")}
                sx={{ textTransform: "none" }}
              >
                지우기
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* 우측: 날짜별 목록 */}
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              날짜별 단어 목록
            </Typography>

            <Stack spacing={2}>
              {filteredGroups.map((g) => (
                <Box key={g.date} sx={{ border: "1px solid #eee", borderRadius: 2, p: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">{g.date}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    {g.words.map((w) => (
                      <Stack
                        key={`${g.date}-${w.zh}`}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          "&:hover": { background: "#fafafa", cursor: "pointer" },
                        }}
                        onClick={() => onSelectWord(g.date, w)}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 700, minWidth: 80 }}>{w.zh}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {w.pinyin} — {w.ko}
                          </Typography>
                          {w.pos && <Chip size="small" label={w.pos} sx={{ ml: 1 }} />}
                          {(w.tags || []).map((t) => (
                            <Chip key={t} size="small" variant="outlined" label={t} sx={{ ml: 0.5 }} />
                          ))}
                        </Stack>

                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Tooltip title="JSON 복사">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyJson(w);
                              }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="JSON 편집">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openJsonEditor(g.date, w);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(g.date, w.zh);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}

              {filteredGroups.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  결과가 없습니다.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* JSON 편집 모달 */}
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              JSON 편집 — {jsonMeta.date} / {jsonMeta.originalZh}
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
            InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 13 } }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            * 저장 시 <strong>zh</strong>가 변경되면 문서가 자동으로 리네임됩니다(기존 ID 삭제 → 새 ID 생성).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)} sx={{ textTransform: "none" }}>닫기</Button>
          <Button variant="contained" onClick={onSaveJson} sx={{ textTransform: "none" }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
