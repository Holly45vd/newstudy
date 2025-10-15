// src/pages/VocabularyPage.jsx (v3.1 — 매일단어 포맷 완전 통합: 리스트/검색/모달 전부 호환)
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  Divider,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";
import WordDetailModal from "../components/WordDetailModal";

// ---------- 유틸 ----------
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

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = String(text ?? "").split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        query && p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ padding: 0, backgroundColor: "transparent", color: "#1976d2" }}>
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const STORAGE_KEY = "vocab_page_prefs_v3_1";

/// mapToEverydayWord 함수만 교체
const mapToEverydayWord = (v = {}) => {
  const zh = v.hanzi ?? v.zh ?? v.id ?? "";
  const pinyin = v.pinyin ?? v.py ?? "";
  const ko = v.meaning ?? v.ko ?? "";
  const koPronunciation = v.koPronunciation ?? v.koPron ?? v.pron_korean ?? "";
  const pos = v.pos ?? v.partOfSpeech ?? "";
  const tags = Array.isArray(v.tags) ? v.tags : [];

  // 예문
  const sentence = v.sentence ?? v.exampleZh ?? v.example_zh ?? "";
  const sentencePinyin = v.sentencePinyin ?? v.examplePy ?? v.example_pinyin ?? "";
  const sentenceKo = v.sentenceKo ?? v.exampleKo ?? v.example_ko ?? "";
  const sentencePron = v.sentencePron ?? v.sentencePronunciation ?? ""; // ✅ 한국어 발음 추가

  // 확장/문법/발음
  const grammar = Array.isArray(v.grammar) ? v.grammar : [];
  const extensions = Array.isArray(v.extensions) ? v.extensions : [];
  const keyPoints = Array.isArray(v.keyPoints) ? v.keyPoints : [];
  const pronunciation =
    Array.isArray(v.pronunciation)
      ? v.pronunciation
      : Array.isArray(v.pronunciation_items)
      ? v.pronunciation_items
      : [];

  return {
    zh,
    pinyin,
    ko,
    koPronunciation,
    pos,
    tags,
    sentence,
    sentencePinyin,
    sentenceKo,
    sentencePron,       // ✅ 모달로 넘겨줌
    grammar,
    extensions,         // 확장 예문은 각 항목의 pron을 WordDetailModal에서 그대로 사용
    keyPoints,
    pronunciation,
  };
};


/** 리스트/검색/표시에 쓰는 파생 필드 (매일단어/기존 포맷 모두 커버) */
const deriveDisplay = (v = {}) => {
  const zh = v.hanzi ?? v.zh ?? v.id ?? v.cn ?? "";
  const pinyin = v.pinyin ?? v.py ?? "";
  const meaning = v.meaning ?? v.ko ?? "";
  const pos = v.pos ?? "";
  const tags = Array.isArray(v.tags) ? v.tags : [];

  let pron = "";
  if (typeof v.pronunciation === "string") {
    pron = v.pronunciation;
  } else if (Array.isArray(v.pronunciation) && v.pronunciation.length) {
    const p0 = v.pronunciation[0];
    pron = (p0?.ko || p0?.pinyin || "").toString();
  } else if (Array.isArray(v.pronunciation_items) && v.pronunciation_items.length) {
    const p0 = v.pronunciation_items[0];
    pron = (p0?.ko || p0?.pinyin || "").toString();
  } else if (typeof v.pronunciation_korean === "string") {
    pron = v.pronunciation_korean;
  }

  return { zh, pinyin, meaning, pron, pos, tags };
};

export default function VocabularyPage() {
  const { id } = useParams();

  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { speak, voices } = useSpeechSynthesis();

  const [debouncedQuery, query, setQuery] = useDebouncedState("", 250);
  const [view, setView] = useState("card"); // card | compact
  const [show, setShow] = useState({ pinyin: true, pron: true, meaning: true });

  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const { speechSynthesis } = window;
    speechSynthesis.getVoices();
    let tries = 0;
    const intv = setInterval(() => {
      tries += 1;
      const v = speechSynthesis.getVoices();
      if (v && v.length) clearInterval(intv);
      if (tries >= 5) clearInterval(intv);
    }, 300);
    return () => clearInterval(intv);
  }, []);

  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語", "國語(臺灣)"];
    const candidates = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const langMatch = lang.startsWith("zh") || lang.includes("cmn");
      const nameMatch = kw.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });
    const score = (v) => {
      const L = (v.lang || "").toLowerCase();
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };
    return candidates.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUnitById(id);
        setUnit(data || {});
      } catch (e) {
        setError(e?.message || "데이터 로드 실패");
      } finally {
        setLoading(false);
      }
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.view) setView(p.view);
        if (p.show) setShow(p.show);
      }
    } catch {}
    load();
  }, [id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, show }));
  }, [view, show]);

  const list = useMemo(() => {
    const src = unit?.vocabulary || [];
    const q = (debouncedQuery || "").trim().toLowerCase();
    if (!q) return src;
    const pick = (x) => (x ?? "").toString().toLowerCase();

    return src.filter((v) => {
      const d = deriveDisplay(v);
      const searchable = [
        d.zh, d.pinyin, d.pron, d.meaning, d.pos, (d.tags || []).join(" "),
        v.sentence, v.exampleZh, v.exampleKo, v.examplePy, v.sentenceKo, v.sentencePinyin,
      ].filter(Boolean);
      return searchable.some((x) => pick(x).includes(q));
    });
  }, [unit, debouncedQuery]);

  const handleSpeak = useCallback(
    (text) => {
      if (!text) return;
      const synth = window?.speechSynthesis;
      const defaultRate = 1.0;
      const defaultPitch = 1.0;
      try {
        if (synth) synth.cancel();
        const nativeVoices = synth?.getVoices?.() || [];
        const voiceList = nativeVoices.length ? nativeVoices : voices;
        const zhVoice = voiceList?.find((v) => v.lang === "zh-CN") || pickChineseVoice(voiceList);

        if (zhVoice) {
          speak({ text, voice: zhVoice, rate: defaultRate, pitch: defaultPitch, volume: 1.0 });
        } else if (synth && "SpeechSynthesisUtterance" in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "zh-CN";
          u.rate = defaultRate;
          u.pitch = defaultPitch;
          u.volume = 1.0;
          synth.speak(u);
        }
      } catch (e) {
        console.error("TTS 오류:", e);
      }
    },
    [voices, pickChineseVoice, speak]
  );

  const resetFilters = () => {
    setQuery("");
    setView("card");
    setShow({ pinyin: true, pron: true, meaning: true });
  };

  const clampSx = (lines = 2) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  });

  const openDetail = (vocab) => {
    const mapped = mapToEverydayWord(vocab);
    setSelectedWord(mapped);
    setOpen(true);
  };

  return (
    <Box>
      <UnitTabs />

      {/* 헤더/컨트롤 바 */}
      <Box
        p={2}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Typography variant="h5" sx={{ mr: 1 }}>
            단어 학습 (Unit {id})
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <TextField
            size="small"
            placeholder="한자 / 병음 / 발음 / 뜻 / 예문 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <ToggleButtonGroup
            size="small"
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="card">카드</ToggleButton>
            <ToggleButton value="compact">콤팩트</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="필터 초기화">
            <IconButton onClick={resetFilters}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* 표시 항목 토글 */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          mt={1.5}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneIcon fontSize="small" />
            <Chip
              size="small"
              label={`병음 ${show.pinyin ? "ON" : "OFF"}`}
              variant={show.pinyin ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))}
            />
            <Chip
              size="small"
              label={`발음 ${show.pron ? "ON" : "OFF"}`}
              variant={show.pron ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))}
            />
            <Chip
              size="small"
              label={`뜻 ${show.meaning ? "ON" : "OFF"}`}
              variant={show.meaning ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))}
            />
          </Stack>

          <Divider flexItem sx={{ display: { xs: "none", md: "block" }, mx: 1 }} />
        </Stack>
      </Box>

      {/* 본문 */}
      <Box p={2}>
        {loading && (
          <Grid container spacing={2}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4} lg={3}>
                <Card variant="outlined" sx={{ borderRadius: 2, width: "100%" }}>
                  <CardContent>
                    <Skeleton variant="text" height={32} width="60%" />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="50%" />
                    <Skeleton variant="rounded" height={20} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {error && !loading && (
          <Box textAlign="center" py={6}>
            <Typography color="error" gutterBottom>
              데이터 로드에 실패했습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              네트워크 상태를 확인하거나, 잠시 후 다시 시도하세요.
            </Typography>
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }} variant="outlined">
              새로고침
            </Button>
          </Box>
        )}

        {!loading && !error && (!unit?.vocabulary || unit.vocabulary.length === 0) && (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">단어 데이터가 없습니다.</Typography>
          </Box>
        )}

        {!loading && !error && list.length > 0 && (
          view === "card" ? (
            <Grid container spacing={2}>
              {list.map((vocab, index) => {
                const d = deriveDisplay(vocab);
                const key = `${d.zh}-${index}`;
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        width: "100%",
                        textAlign: "left",
                        p: 1,
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: 0,
                        "&:hover": { boxShadow: 0, bgcolor: "background.default" },
                        cursor: "pointer",
                      }}
                      onClick={() => openDetail(vocab)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        {/* 상단: 한자 + 액션 */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography
                            sx={{
                              lineHeight: 1.1,
                              wordBreak: "keep-all",
                              fontSize: "clamp(22px, 4vw, 34px)",
                              fontWeight: 400,
                              letterSpacing: 0,
                            }}
                          >
                            <Highlight text={d.zh} query={debouncedQuery} />
                          </Typography>
                          <Tooltip title="듣기">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleSpeak(d.zh); }}
                              aria-label="중국어로 듣기"
                            >
                              <VolumeUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>

                        {/* 중단: 보조 정보 */}
                        {show.pinyin && (
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ mt: 1, ...clampSx(1), fontWeight: 400 }}
                            title={d.pinyin}
                          >
                            <Highlight text={d.pinyin} query={debouncedQuery} />
                          </Typography>
                        )}
                        {show.pron && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ opacity: 0.9, ...clampSx(1), fontWeight: 400 }}
                            title={d.pron}
                          >
                            <Highlight text={d.pron} query={debouncedQuery} />
                          </Typography>
                        )}

                        {/* 하단: 의미 */}
                        {show.meaning && (
                          <Typography variant="body2" sx={{ mt: 1.1, ...clampSx(2), fontWeight: 400 }} title={d.meaning}>
                            <Highlight text={d.meaning} query={debouncedQuery} />
                          </Typography>
                        )}

                        {/* 보조: 품사/태그(있을 때) */}
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.5 }}>
                          {d.pos && <Chip size="small" label={d.pos} />}
                          {(d.tags || []).map((t) => (
                            <Chip key={t} size="small" variant="outlined" label={t} />
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            // --- 콤팩트 테이블 뷰 ---
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "background.default" } }}>
                    <TableCell sx={{ width: 140 }}>한자</TableCell>
                    {show.pinyin && <TableCell sx={{ width: 220 }}>병음</TableCell>}
                    {show.pron && <TableCell>발음</TableCell>}
                    {show.meaning && <TableCell>뜻</TableCell>}
                    <TableCell align="right" sx={{ width: 80 }}>듣기</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((vocab, i) => {
                    const d = deriveDisplay(vocab);
                    const key = `${d.zh}-${i}`;
                    return (
                      <TableRow key={key} hover sx={{ cursor: "pointer" }} onClick={() => openDetail(vocab)}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 400, fontSize: "clamp(18px, 2.2vw, 22px)" }}>
                            <Highlight text={d.zh} query={debouncedQuery} />
                          </Typography>
                        </TableCell>
                        {show.pinyin && (
                          <TableCell>
                            <Typography noWrap title={d.pinyin} sx={{ fontWeight: 400 }}>
                              <Highlight text={d.pinyin} query={debouncedQuery} />
                            </Typography>
                          </TableCell>
                        )}
                        {show.pron && (
                          <TableCell>
                            <Typography color="text.secondary" noWrap title={d.pron} sx={{ fontWeight: 400 }}>
                              <Highlight text={d.pron} query={debouncedQuery} />
                            </Typography>
                          </TableCell>
                        )}
                        {show.meaning && (
                          <TableCell>
                            <Typography noWrap title={d.meaning} sx={{ fontWeight: 400 }}>
                              <Highlight text={d.meaning} query={debouncedQuery} />
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="듣기">
                            <IconButton size="small" onClick={() => handleSpeak(d.zh)}>
                              <VolumeUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Box>

      {/* 상세 팝업: 매일단어 포맷 모달 재사용 */}
      <WordDetailModal open={open} onClose={() => setOpen(false)} word={selectedWord} />
    </Box>
  );
}
