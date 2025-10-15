// src/pages/GrammarPage.jsx (UX/UI Upgrade — 검색/토글/전체펼침·접기/하이라이트/복사)
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Box,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Alert,
  Button,
  Skeleton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TuneIcon from "@mui/icons-material/Tune";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

/* ---------- 공통 유틸 ---------- */
const useDebouncedState = (initial, delay = 300) => {
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);
  return [debounced, value, setValue];
};

const escapeRegExp = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = String(text || "").split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{ padding: 0, backgroundColor: "transparent", color: "#1976d2", fontWeight: 700 }}
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/* ---------- 페이지 컴포넌트 ---------- */
export default function GrammarPage() {
  const { id } = useParams();

  // data
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // UI
  const [debouncedQuery, query, setQuery] = useDebouncedState("", 250);
  const [show, setShow] = useState({ pinyin: true, pron: true, meaning: true });
  const [expanded, setExpanded] = useState(true); // {index: true/false}

  // tts
  const { speak, voices } = useSpeechSynthesis();

  /* 음성 엔진 웜업 (안드로이드 대응) */
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const v = synth.getVoices();
      if (v?.length || tries >= 5) clearInterval(t);
    }, 300);
    return () => clearInterval(t);
  }, []);

  /* 중국어 보이스 선택 */
  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "國語(臺灣)", "粵語", "粤語"];
    const cands = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      return lang.startsWith("zh") || lang.includes("cmn") || kw.some((k) => name.includes(k.toLowerCase()));
    });
    const score = (v) => {
      const L = (v.lang || "").toLowerCase();
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };
    return cands.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  const chineseVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = native.length ? native : voices;
    return list?.find((v) => v.lang === "zh-CN") || pickChineseVoice(list || []) || null;
  }, [voices, pickChineseVoice]);

  const handleSpeak = useCallback((text) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      synth?.cancel();
      if (chineseVoice) {
        speak({ text, voice: chineseVoice, rate: 1.0, pitch: 1.0 });
      } else if (synth) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = 1.0;
        u.pitch = 1.0;
        synth.speak(u);
      }
    } catch (e) {
      console.error("TTS 오류:", e);
    }
  }, [chineseVoice, speak]);

  /* 데이터 로드 */
  useEffect(() => {
    const fetchGrammar = async () => {
      setLoading(true);
      setErr(null);
      try {
        const ref = doc(db, "units", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setGrammarList([]);
          return;
        }
        const data = snap.data();
        const rawArr = Array.isArray(data.grammar)
          ? data.grammar
          : Object.values(data.grammar || {});
        const normalized = rawArr.map((it) => ({
          title: it.title || it.rule || "",
          summary: it.summary ?? it.description ?? "",
          notes: Array.isArray(it.notes) ? it.notes : it.notes ? [String(it.notes)] : [],
          examples: Array.isArray(it.examples)
            ? it.examples.map((ex) => ({
                chinese: ex.chinese || ex.zh || "",
                pinyin: ex.pinyin || ex.py || "",
                pronunciation: ex.pronunciation || "",
                meaning: ex.meaning || ex.ko || "",
              }))
            : [],
        }));
        setGrammarList(normalized);
      } catch (e) {
        console.error(e);
        setErr("문법 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchGrammar();
  }, [id]);

  /* 필터링 */
  const filtered = useMemo(() => {
    const q = (debouncedQuery || "").trim().toLowerCase();
    if (!q) return grammarList;
    return grammarList
      .map((g) => {
        const exFiltered = (g.examples || []).filter((ex) =>
          [ex.chinese, ex.pinyin, ex.pronunciation, ex.meaning]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q))
        );
        const matchedHeader =
          [g.title, g.summary, ...(g.notes || [])]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q));
        if (matchedHeader || exFiltered.length) {
          return { ...g, examples: exFiltered.length ? exFiltered : g.examples };
        }
        return null;
      })
      .filter(Boolean);
  }, [grammarList, debouncedQuery]);

  /* 전체 펼침 / 접기 */
  const expandAll = () => {
    const next = {};
    filtered.forEach((_, i) => { next[i] = true; });
    setExpanded(next);
  };
  const collapseAll = () => setExpanded({});

  const onToggle = (i) => (_, isExpanded) =>
    setExpanded((prev) => ({ ...prev, [i]: isExpanded }));

  const resetControls = () => {
    setQuery("");
    setShow({ pinyin: true, pron: true, meaning: true });
    setExpanded({});
  };

  /* 로딩 스켈레톤 */
  if (loading) {
    return (
      <Box>
        <UnitTabs />
        <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={56} />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <UnitTabs />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
        {/* 헤더 & 컨트롤 */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            py: 2,
            mb: 2,
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <Typography variant="h5" sx={{ mr: 1 }}>
              문법 학습 (Unit {id})
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <TextField
              size="small"
              placeholder="제목 / 요약 / 주의 / 예문 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280 }}
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="병음 표시 토글">
                <Chip
                  size="small"
                  label={`병음 ${show.pinyin ? "ON" : "OFF"}`}
                  variant={show.pinyin ? "filled" : "outlined"}
                  onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))}
                />
              </Tooltip>
              <Tooltip title="발음(한글) 표시 토글">
                <Chip
                  size="small"
                  label={`발음 ${show.pron ? "ON" : "OFF"}`}
                  variant={show.pron ? "filled" : "outlined"}
                  onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))}
                />
              </Tooltip>
              <Tooltip title="뜻(한국어) 표시 토글">
                <Chip
                  size="small"
                  label={`뜻 ${show.meaning ? "ON" : "OFF"}`}
                  variant={show.meaning ? "filled" : "outlined"}
                  onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))}
                />
              </Tooltip>
            </Stack>

            <Divider flexItem sx={{ display: { xs: "none", md: "block" } }} />

            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={expandAll}>전체 펼침</Button>
              <Button size="small" onClick={collapseAll}>전체 접기</Button>
              <Tooltip title="검색/토글 초기화">
                <IconButton onClick={resetControls}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" mt={1} sx={{ color: "text.secondary" }}>
            <TuneIcon fontSize="small" />
            <Typography variant="body2">
              결과: {filtered.length}개 문법 항목
            </Typography>
          </Stack>
        </Box>

        {/* 오류 */}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        {/* 빈 상태 */}
        {!err && filtered.length === 0 && (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">문법 데이터가 없습니다.</Typography>
          </Box>
        )}

        {/* 본문 */}
        {filtered.map((item, idx) => (
          <Box key={idx} sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Accordion
              expanded={!!expanded[idx]}
              onChange={onToggle(idx)}
              sx={{ width: "100%", borderRadius: 2, "&:before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  <Highlight text={item.title} query={debouncedQuery} />
                </Typography>
              </AccordionSummary>

              <AccordionDetails>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    {item.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        <Highlight text={item.summary} query={debouncedQuery} />
                      </Typography>
                    )}

                    {item.notes?.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          주의사항
                        </Typography>
                        {item.notes.map((note, i) => (
                          <Typography key={i} variant="body2">
                            • <Highlight text={note} query={debouncedQuery} />
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {item.examples?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          예문
                        </Typography>

                        {item.examples.map((ex, i) => (
                          <Box
                            key={i}
                            sx={{
                              mb: 1.5,
                              p: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1.5,
                              bgcolor: "background.default",
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1">
                                <Highlight text={ex.chinese} query={debouncedQuery} />
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="듣기">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleSpeak(ex.chinese)}
                                  >
                                    <VolumeUpIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="복사">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const t = `${ex.chinese}${ex.pinyin ? ` (${ex.pinyin})` : ""}${
                                        ex.meaning ? ` - ${ex.meaning}` : ""
                                      }`;
                                      navigator.clipboard.writeText(t).catch(() => {});
                                    }}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>

                            {/* 보조 정보 */}
                            {show.pinyin && (
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                <strong>Pinyin:</strong>{" "}
                                <Highlight text={ex.pinyin} query={debouncedQuery} />
                                {show.pron && ex.pronunciation && (
                                  <span style={{ marginLeft: 8, color: "#666" }}>
                                    (<Highlight text={ex.pronunciation} query={debouncedQuery} />)
                                  </span>
                                )}
                              </Typography>
                            )}
                            {!show.pinyin && show.pron && ex.pronunciation && (
                              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary.main" }}>
                                <strong>발음:</strong>{" "}
                                <Highlight text={ex.pronunciation} query={debouncedQuery} />
                              </Typography>
                            )}

                            {show.meaning && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>뜻:</strong>{" "}
                                <Highlight text={ex.meaning} query={debouncedQuery} />
                              </Typography>
                            )}

                            {i < item.examples.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </AccordionDetails>
            </Accordion>
          </Box>
        ))}
      </Container>
    </Box>
  );
}
