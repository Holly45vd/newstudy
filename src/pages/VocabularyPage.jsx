// src/pages/VocabularyPage.jsx (UX/UI Upgrade v2.2 — 카드 간결화, 한자 크기↓, 굵기 고정)
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
  const parts = String(text).split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{ padding: 0, backgroundColor: "transparent", color: "#1976d2" }}
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

const STORAGE_KEY = "vocab_page_prefs_v2_2";

export default function VocabularyPage() {
  const { id } = useParams();

  // data
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // speech
  const { speak, voices } = useSpeechSynthesis();

  // UI state
  const [debouncedQuery, query, setQuery] = useDebouncedState("", 250);
  const [view, setView] = useState("card"); // card | compact
  const [show, setShow] = useState({ pinyin: true, pron: true, meaning: true });

  // --- 보이스 강제 로딩 (안드로이드 대응) ---
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

  // --- 중국어 보이스 선택기 ---
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

  // --- 데이터 로드 + 로컬 환경설정 복구 ---
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUnitById(id);
        setUnit(data);
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
    const prefs = { view, show };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [view, show]);

  // --- 검색 필터링만 (정렬 제거) ---
  const list = useMemo(() => {
    const src = unit?.vocabulary || [];
    const q = (debouncedQuery || "").trim().toLowerCase();
    if (!q) return src;
    return src.filter((v) =>
      [v.hanzi, v.pinyin, v.pronunciation, v.meaning]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [unit, debouncedQuery]);

  // --- 안전 발화 ---
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

  // 유틸: 멀티라인 클램프
  const clampSx = (lines = 2) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  });

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
            placeholder="한자 / 병음 / 발음 / 뜻 검색"
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
              {list.map((vocab, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${vocab.hanzi}-${index}`}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      width: "100%",
                      textAlign: "left",
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: 0,           // 그림자 제거
                      "&:hover": { boxShadow: 0, bgcolor: "background.default" }, // 과한 hover 제거
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      {/* 상단: 한자 + 액션 */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography
                          sx={{
                            lineHeight: 1.1,
                            wordBreak: "keep-all",
                            // 한자: 크기 축소 + 반응형. 굵기(두께) 항상 보통
                            fontSize: "clamp(22px, 4vw, 34px)",
                            fontWeight: 400,
                            letterSpacing: 0,
                          }}
                        >
                          <Highlight text={vocab.hanzi} query={debouncedQuery} />
                        </Typography>
                        <Tooltip title="듣기">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleSpeak(vocab.hanzi)}
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
                          title={vocab.pinyin}
                        >
                          <Highlight text={vocab.pinyin} query={debouncedQuery} />
                        </Typography>
                      )}
                      {show.pron && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ opacity: 0.9, ...clampSx(1), fontWeight: 400 }}
                          title={vocab.pronunciation}
                        >
                          <Highlight text={vocab.pronunciation} query={debouncedQuery} />
                        </Typography>
                      )}

                      {/* 하단: 의미 */}
                      {show.meaning && (
                        <Typography variant="body2" sx={{ mt: 1.1, ...clampSx(2), fontWeight: 400 }} title={vocab.meaning}>
                          <Highlight text={vocab.meaning} query={debouncedQuery} />
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            // --- 콤팩트 테이블 뷰(정렬/복사 제거) ---
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
                  {list.map((vocab, i) => (
                    <TableRow key={`${vocab.hanzi}-${i}`} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 400, fontSize: "clamp(18px, 2.2vw, 22px)" }}>
                          <Highlight text={vocab.hanzi} query={debouncedQuery} />
                        </Typography>
                      </TableCell>
                      {show.pinyin && (
                        <TableCell>
                          <Typography noWrap title={vocab.pinyin} sx={{ fontWeight: 400 }}>
                            <Highlight text={vocab.pinyin} query={debouncedQuery} />
                          </Typography>
                        </TableCell>
                      )}
                      {show.pron && (
                        <TableCell>
                          <Typography color="text.secondary" noWrap title={vocab.pronunciation} sx={{ fontWeight: 400 }}>
                            <Highlight text={vocab.pronunciation} query={debouncedQuery} />
                          </Typography>
                        </TableCell>
                      )}
                      {show.meaning && (
                        <TableCell>
                          <Typography noWrap title={vocab.meaning} sx={{ fontWeight: 400 }}>
                            <Highlight text={vocab.meaning} query={debouncedQuery} />
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Tooltip title="듣기">
                          <IconButton size="small" onClick={() => handleSpeak(vocab.hanzi)}>
                            <VolumeUpIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Box>
    </Box>
  );
}
