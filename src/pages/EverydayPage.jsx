// src/pages/EverydayPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Container, Typography, TextField, Box, Chip, Card, CardContent, Stack, Divider, IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import WordDetailModal from "../components/WordDetailModal";
import { listEverydayWordsFlat } from "../firebase/firebaseFirestore";
import { useSpeechSynthesis } from "react-speech-kit";

// ✅ 병음 옆 한국어 발음 추출 헬퍼
const getKoPron = (w) => {
  if (!w) return "";
  if (w.koPronunciation) return String(w.koPronunciation).trim();
  if (Array.isArray(w.pronunciation)) {
    const exact = w.pronunciation.find(p => p?.label && p.label === w.zh && p.ko);
    if (exact?.ko) return String(exact.ko).trim();
    const first = w.pronunciation[0]?.ko;
    if (first) return String(first).trim();
  }
  return "";
};

export default function EverydayPage() {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [days, setDays] = useState([]); // [{date, words:[...]}]
  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const { speak, voices } = useSpeechSynthesis();

  // 중국어 음성 엔진 (Simplified Chinese)
  const chineseVoice = useMemo(() => {
    if (!voices || voices.length === 0) return null;
    // zh-CN, zh-TW 계열 음성 우선
    return voices.find(v => v.lang.startsWith("zh")) || voices[0];
  }, [voices]);

  useEffect(() => {
    (async () => {
      try {
        const flat = await listEverydayWordsFlat();
        const byDate = flat.reduce((acc, w) => {
          const k = w.date || "unknown";
          (acc[k] ||= []).push(w);
          return acc;
        }, {});
        const grouped = Object.entries(byDate)
          .map(([date, words]) => ({ date, words }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setDays(grouped);
      } catch (e) {
        console.error(e);
        setDays([]);
      }
    })();
  }, []);

  const allPos = useMemo(() => {
    const s = new Set();
    (days || []).forEach(d => (d.words || []).forEach(w => w.pos && s.add(w.pos)));
    return Array.from(s).sort();
  }, [days]);

  const allTags = useMemo(() => {
    const s = new Set();
    (days || []).forEach(d => (d.words || []).forEach(w => (w.tags || []).forEach(t => s.add(t))));
    return Array.from(s).sort();
  }, [days]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (days || [])
      .map((d) => ({
        ...d,
        words: (d.words || []).filter((w) => {
          const h = (x) => (x || "").toString().toLowerCase();
          const matchesQuery =
            !q || h(w.zh).includes(q) || h(w.pinyin).includes(q) || h(w.ko).includes(q);
          const matchesPos = !posFilter || w.pos === posFilter;
          const matchesTag = !tagFilter || (w.tags || []).includes(tagFilter);
          return matchesQuery && matchesPos && matchesTag;
        }),
      }))
      .filter((d) => d.words.length > 0);
  }, [days, query, posFilter, tagFilter]);

  const onSelectWord = (w) => {
    setSelectedWord(w);
    setOpen(true);
  };

  const handleSpeak = (text) => {
    if (!text) return;
    speak({ text, voice: chineseVoice, rate: 1 });
  };

  return (
    <Container maxWidth="md" sx={{ pb: 8 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>

      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        매일 정리한 단어를 검색/필터링하고, 단어를 클릭하면 상세를 확인하세요.
      </Typography>

      {/* 검색/필터 */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="검색: 중국어/병음/뜻(한국어)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          fullWidth
        />

        {/* 품사 */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ overflowX: "auto", pb: 0.5 }}
        >
          <Typography variant="body2" sx={{ mr: 1, minWidth: 52 }}>
            품사
          </Typography>
          <Chip
            label="전체"
            variant={!posFilter ? "filled" : "outlined"}
            onClick={() => setPosFilter(null)}
          />
          {allPos.map((p) => (
            <Chip
              key={p}
              label={p}
              variant={posFilter === p ? "filled" : "outlined"}
              onClick={() => setPosFilter(posFilter === p ? null : p)}
            />
          ))}
        </Stack>

        {/* 태그 */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ overflowX: "auto", pb: 0.5 }}
        >
          <Typography variant="body2" sx={{ mr: 1, minWidth: 52 }}>
            태그
          </Typography>
          <Chip
            label="전체"
            variant={!tagFilter ? "filled" : "outlined"}
            onClick={() => setTagFilter(null)}
          />
          {allTags.map((t) => (
            <Chip
              key={t}
              label={t}
              variant={tagFilter === t ? "filled" : "outlined"}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            />
          ))}
        </Stack>
      </Stack>

      {/* 날짜별 카드 */}
      <Stack spacing={2}>
        {filtered.map((day) => (
          <Card key={day.date} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {day.date}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={1.25}>
                {day.words.map((w, idx) => (
                  <Box
                    key={`${day.date}-${w.zh}-${idx}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr auto",
                      gap: 1,
                      alignItems: "center",
                      "&:hover": { backgroundColor: "#fafafa" },
                      p: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    {/* 중국어 + 스피커 */}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography sx={{  cursor: "pointer" }} onClick={() => onSelectWord(w)}>
                        {w.zh}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleSpeak(w.zh)}
                        sx={{ p: 0.3 }}
                        title="중국어 발음 듣기"
                      >
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    {/* 병음 + 한글 발음 + 뜻 */}
                    <Typography variant="body2" color="text.secondary">
                      {(w.pinyin || "").trim()}
                      {(() => {
                        const koP = getKoPron(w);
                        return koP ? ` ${koP}` : "";
                      })()}
                      {" — "}
                      {(w.ko || "").trim()}
                    </Typography>

                    {/* 품사 & 태그 */}
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {w.pos && <Chip size="small" label={w.pos} />}
                      {(w.tags || []).map((t) => (
                        <Chip key={t} size="small" variant="outlined" label={t} />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            해당 조건에 맞는 단어가 없어요.
          </Typography>
        )}
      </Stack>

      <WordDetailModal
        open={open}
        onClose={() => setOpen(false)}
        word={selectedWord}
      />
    </Container>
  );
}
