// src/pages/admin/EverydayAdmin.jsx — v4.0 (words 정규화 + dailies 참조)
import React, { useEffect, useMemo, useState } from "react";
import {
  Container, Grid, Paper, Stack, TextField, Typography, Button,
  Chip, Divider, IconButton, Tooltip, Alert, Box, Dialog,
  DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio
 } from "@mui/material";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import {
  // 새 스키마 전용 API
  listDailies,
  fetchWordsByIds,
  upsertWord,
  setDailyWords,
  deleteEverydayWord,       // 날짜에서 연결만 제거(단어는 /words 유지)
  importEverydayGroupsBulk, // [{"date","words":[...]}] → /words upsert + /dailies 세팅
} from "../../firebase/firebaseFirestore";

// ----- 폼 기본값 -----
const emptyForm = {
  date: "",           // YYYY-MM-DD
  zh: "",
  pinyin: "",
  ko: "",
  pos: "",
  tags: "",           // 콤마 구분 입력 → 저장 시 배열로 변환
  sentence: "",
  sentencePinyin: "",
  sentenceKo: "",
  sentenceKoPronunciation: "", // ✅ 새 스키마: 문장 한국어 발음(구: sentencePron)

  grammar: `[
  { "term": "구조", "pinyin": "", "pron": "", "desc": "" }
]`,
  extensions: `[
  { "zh": "", "pinyin": "", "ko": "", "koPron": "" }
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

  // [{ date, wordIds:[], words:[...] }]
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");

  // JSON 인라인 편집 모달
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonMeta, setJsonMeta] = useState({ date: "", originalId: "" }); // originalId = 원래 단어ID(보통 zh)

  // 일괄 업로드
  const [bulkJson, setBulkJson] = useState("");

  // ----- 공통 유틸 -----
  const fixWordSchema = (raw = {}) => {
    const w = { ...raw };

    // 최상단/문장 발음 키 보정
    if (w.sentenceKoPronunciation == null && w.sentencePron != null) {
      w.sentenceKoPronunciation = w.sentencePron;
    }

    // 확장 예문 발음 키 보정
    if (Array.isArray(w.extensions)) {
      w.extensions = w.extensions.map((e) => {
        const ex = { ...(e || {}) };
        if (ex.koPron == null && ex.pron != null) ex.koPron = ex.pron;
        return ex;
      });
    }

    return w;
  };

  const parseJSON = (text, fallback) => {
    try {
      const v = JSON.parse(text || "null");
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  // ----- 데이터 로딩 -----
  const load = async () => {
    setLoading(true);
    try {
      // 1) 날짜 문서들
      const ds = await listDailies(); // [{date, wordIds:[]}, ...] 최신 날짜 우선 정렬됨
      // 2) 각 날짜의 단어 조회
      const result = [];
      for (const d of ds) {
        const ids = Array.isArray(d.wordIds) ? d.wordIds : [];
        const words = ids.length ? await fetchWordsByIds(ids) : [];
        result.push({ date: d.date, wordIds: ids, words });
      }
      setGroups(result);
    } catch (e) {
      setMessage({ type: "error", text: e?.message || "로드 실패" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ----- 필터 -----
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

  // ----- 저장 -----
  const onSave = async () => {
    setMessage(null);
    try {
      if (!form.date) throw new Error("날짜(YYYY-MM-DD)를 입력하세요.");
      if (!form.zh) throw new Error("중국어 단어(zh)를 입력하세요.");

      // 1) /words upsert
      const payload = fixWordSchema({
        zh: form.zh.trim(),
        pinyin: form.pinyin.trim(),
        ko: form.ko.trim(),
        pos: form.pos.trim(),
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        sentence: form.sentence.trim(),
        sentencePinyin: form.sentencePinyin.trim(),
        sentenceKo: form.sentenceKo.trim(),
        sentenceKoPronunciation: form.sentenceKoPronunciation.trim(),
        grammar: parseJSON(form.grammar, []),
        extensions: parseJSON(form.extensions, []),
        keyPoints: parseJSON(form.keyPoints, []),
        pronunciation: parseJSON(form.pronunciation, []),
      });

      const wordId = String(payload.id || payload.zh);
      if (!wordId) throw new Error("wordId를 결정할 수 없습니다(zh가 필요).");

      await upsertWord(wordId, payload);

      // 2) 해당 날짜의 wordIds에 포함되도록 보장
      const target = groups.find((g) => g.date === form.date);
      const curIds = target?.wordIds || [];
      const nextIds = Array.from(new Set([...(curIds || []), wordId]));
      await setDailyWords(form.date, nextIds);

      setMessage({ type: "success", text: "저장 완료" });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message || "저장 실패" });
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
      sentenceKoPronunciation: w.sentenceKoPronunciation || w.sentencePron || "", // ✅ 폴백 허용

      grammar: JSON.stringify(w.grammar || [], null, 2),
      // ✅ 확장 예문은 koPron 키를 권장(구키 pron 폴백은 저장 시 fixWordSchema에서 처리)
      extensions: JSON.stringify(
        Array.isArray(w.extensions)
          ? w.extensions.map((e) => ({ ...e, koPron: e.koPron ?? e.pron ?? "" }))
          : [],
        null,
        2
      ),
      keyPoints: JSON.stringify(w.keyPoints || [], null, 2),
      pronunciation: JSON.stringify(w.pronunciation || [], null, 2),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (date, wordId) => {
    if (!window.confirm(`${date} / ${wordId} 연결을 삭제할까요? (단어 자체는 /words에 남습니다)`)) return;
    try {
      await deleteEverydayWord(date, wordId); // 날짜의 wordIds에서만 제거
      setMessage({ type: "success", text: "삭제 완료" });
      await load();
      if (form.date === date && form.zh === wordId) setForm(emptyForm);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  // ----- JSON 인라인 편집 -----
  const openJsonEditor = (date, word) => {
    const wordId = String(word.id || word.zh);
    setJsonMeta({ date, originalId: wordId });
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
      const parsedRaw = JSON.parse(jsonText);
      if (!parsedRaw || typeof parsedRaw !== "object") throw new Error("올바른 JSON 객체가 아닙니다.");
      const parsed = fixWordSchema(parsedRaw);

      // upsert (/words)
      const newId = String(parsed.id || parsed.zh || "");
      if (!newId) throw new Error("필드 'zh' 또는 'id'는 필수입니다.");

      await upsertWord(newId, parsed);

      // 리네임 감지 → 해당 날짜의 wordIds에서 교체
      if (newId !== jsonMeta.originalId) {
        const g = groups.find((x) => x.date === jsonMeta.date);
        const curIds = g?.wordIds || [];
        const nextIds = Array.from(new Set([newId, ...curIds.filter((x) => x !== jsonMeta.originalId)]));
        await setDailyWords(jsonMeta.date, nextIds);
      } else {
        // 같은 ID라도 updatedAt 반영
        const g = groups.find((x) => x.date === jsonMeta.date);
        await setDailyWords(jsonMeta.date, g?.wordIds || []);
      }

      setMessage({ type: "success", text: "JSON 저장 완료" });
      setJsonOpen(false);
      await load();
    } catch (e) {
      setMessage({ type: "error", text: `JSON 저장 실패: ${e.message}` });
    }
  };

  // ----- 일괄 업로드 -----
  const onBulkImport = async () => {
    setMessage(null);
    try {
      if (!bulkJson.trim()) throw new Error("업로드할 JSON 배열을 입력하세요.");
      const arr = JSON.parse(bulkJson);
      if (!Array.isArray(arr)) throw new Error("최상위가 배열이어야 합니다.");
      setLoading(true);
      await importEverydayGroupsBulk(arr);
      setMessage({ type: "success", text: "일괄 업로드 완료" });
      setBulkJson("");
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };


     // ==== 포맷 템플릿 모달 ====
  const [tplOpen, setTplOpen] = useState(false);
  const [tplMode, setTplMode] = useState("group"); // "group" | "word"
  const [tplText, setTplText] = useState("");

  // 표준 템플릿 상수
  const TEMPLATE_GROUP = `[
  {
    "date": "YYYY-MM-DD",
    "words": [
      {
        "id": "단어(한자)",
        "pinyin": "병음",
        "meta": { "updatedAt": { "type": "firestore/timestamp/1.0", "seconds": 0, "nanoseconds": 0 } },
        "koPronunciation": "한국식 발음",
        "pronunciation": [ { "tone": "성조", "pinyin": "세부 병음", "ko": "세부 한글 발음", "label": "단어" } ],
        "sentence": "예문 (중국어)",
        "sentencePinyin": "예문 병음",
        "sentenceKo": "예문 한국어 번역",
        "sentenceKoPronunciation": "예문 한국어 발음",
        "sourceUrl": "https://...",
        "pos": "품사",
        "tags": ["태그1", "태그2"],
        "ko": "단어 뜻 (한국어)",
        "zh": "단어 (중국어 원형)",
        "keyPoints": ["포인트1","포인트2"],
        "grammar": [ { "term": "문법 용어", "desc": "설명", "structure": "구조 예" } ],
        "extensions": [
          { "zh": "확장 예문1", "pinyin": "병음1", "ko": "번역1", "koPron": "발음1" },
          { "zh": "확장 예문2", "pinyin": "병음2", "ko": "번역2", "koPron": "발음2" }
        ]
      }
    ]
  }
]`;

  const TEMPLATE_WORD = `{
  "id": "단어(한자)",
  "pinyin": "병음",
  "meta": { "updatedAt": { "type": "firestore/timestamp/1.0", "seconds": 0, "nanoseconds": 0 } },
  "koPronunciation": "한국식 발음",
  "pronunciation": [ { "tone": "성조", "pinyin": "세부 병음", "ko": "세부 한글 발음", "label": "단어" } ],
  "sentence": "예문 (중국어)",
  "sentencePinyin": "예문 병음",
  "sentenceKo": "예문 한국어 번역",
  "sentenceKoPronunciation": "예문 한국어 발음",
  "sourceUrl": "https://...",
  "pos": "품사",
  "tags": ["태그1","태그2"],
  "ko": "단어 뜻 (한국어)",
  "zh": "단어 (중국어 원형)",
  "keyPoints": ["포인트1","포인트2"],
  "grammar": [ { "term": "문법 용어", "desc": "설명", "structure": "구조 예" } ],
  "extensions": [
    { "zh": "확장 예문1", "pinyin": "병음1", "ko": "번역1", "koPron": "발음1" }
  ]
}`;

  const initTemplate = (mode = "group") => {
    setTplMode(mode);
    setTplText(mode === "group" ? TEMPLATE_GROUP : TEMPLATE_WORD);
    setTplOpen(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: "success", text: "클립보드에 복사했습니다." });
    } catch {
      setMessage({ type: "error", text: "복사 실패: 브라우저 권한을 확인하세요." });
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
           <Button
           variant="outlined"
           onClick={() => initTemplate("group")}
           sx={{ textTransform: "none" }}
         >
           포맷 붙여넣기
         </Button>
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
              <TextField
                label="문장 한국어 발음(sentenceKoPronunciation)"
                value={form.sentenceKoPronunciation}
                onChange={onChange("sentenceKoPronunciation")}
              />

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

          {/* 일괄 업로드(배열 → Firestore) */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              일괄 업로드 (배열 붙여넣기)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              형식: [{"{"}date:"YYYY-MM-DD", words:[{"{"}zh:"伞", ...{"}"}]{"}"}] — 기존 샘플 배열 그대로 사용 가능
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
                        key={`${g.date}-${w.id || w.zh}`}
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
                          <Tooltip title="연결 삭제(이 날짜에서만)">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wid = String(w.id || w.zh);
                                onDelete(g.date, wid);
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
              JSON 편집 — {jsonMeta.date} / {jsonMeta.originalId}
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
            * 저장 시 <strong>zh</strong> 또는 <strong>id</strong>가 바뀌면 해당 날짜의 wordIds가 자동 교체됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)} sx={{ textTransform: "none" }}>닫기</Button>
          <Button variant="contained" onClick={onSaveJson} sx={{ textTransform: "none" }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

       {/* 포맷 붙여넣기 모달 */}
      <Dialog open={tplOpen} onClose={() => setTplOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              데일리쿠키 포맷 붙여넣기
            </Typography>
            <RadioGroup
              row
              value={tplMode}
              onChange={(e) => {
                const mode = e.target.value;
                setTplMode(mode);
                setTplText(mode === "group" ? TEMPLATE_GROUP : TEMPLATE_WORD);
              }}
            >
              <FormControlLabel value="group" control={<Radio />} label="그룹(여러 단어/날짜 포함)" />
              <FormControlLabel value="word" control={<Radio />} label="단어(한 개)" />
            </RadioGroup>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • 그룹 모드: <code>[{"{ date, words:[...] }"}]</code> 배열 → <strong>일괄 업로드</strong>에 바로 사용<br/>
            • 단어 모드: <code>{"{ ...word }"}</code> 객체 → <strong>좌측 폼 auto-fill</strong> 또는 <strong>/words upsert</strong>에 사용
          </Typography>
          <TextField
            value={tplText}
            onChange={(e) => setTplText(e.target.value)}
            multiline
            minRows={16}
            fullWidth
            placeholder="여기에 템플릿 또는 당신의 JSON을 붙여넣으세요"
            InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<FileCopyIcon />}
            onClick={() => copyToClipboard(tplText)}
            sx={{ textTransform: "none" }}
          >
            복사
          </Button>
          {tplMode === "group" ? (
            <Button
              variant="outlined"
              onClick={() => {
                // 붙여넣은 텍스트를 일괄 업로드 입력창으로 전송
                setBulkJson(tplText);
                setTplOpen(false);
                setMessage({ type: "success", text: "일괄 업로드 입력창에 삽입했습니다." });
              }}
              sx={{ textTransform: "none" }}
            >
              일괄 업로드로 보내기
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => {
                // 단어 객체를 파싱해서 좌측 폼에 자동 채움
                try {
                  const w = JSON.parse(tplText);
                  const fixed = fixWordSchema(w);
                  setForm((f) => ({
                    ...f,
                    zh: fixed.zh || fixed.id || "",
                    pinyin: fixed.pinyin || "",
                    ko: fixed.ko || "",
                    pos: fixed.pos || "",
                    tags: (fixed.tags || []).join(", "),
                    sentence: fixed.sentence || "",
                    sentencePinyin: fixed.sentencePinyin || "",
                    sentenceKo: fixed.sentenceKo || "",
                    sentenceKoPronunciation: fixed.sentenceKoPronunciation || fixed.sentencePron || "",
                    grammar: JSON.stringify(fixed.grammar || [], null, 2),
                    extensions: JSON.stringify(
                      Array.isArray(fixed.extensions)
                        ? fixed.extensions.map((e) => ({ ...e, koPron: e.koPron ?? e.pron ?? "" }))
                        : [],
                      null,
                      2
                    ),
                    keyPoints: JSON.stringify(fixed.keyPoints || [], null, 2),
                    pronunciation: JSON.stringify(fixed.pronunciation || [], null, 2),
                  }));
                  setTplOpen(false);
                  setMessage({ type: "success", text: "폼에 자동 입력했습니다. 날짜만 지정 후 저장하세요." });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } catch (e) {
                  setMessage({ type: "error", text: `JSON 파싱 실패: ${e.message}` });
                }
              }}
              sx={{ textTransform: "none" }}
            >
              폼에 채우기
            </Button>
          )}
          <Button onClick={() => setTplOpen(false)} sx={{ textTransform: "none" }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
