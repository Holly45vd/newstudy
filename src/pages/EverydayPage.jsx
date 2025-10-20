// src/pages/EverydayPage.jsx — v4.2
// 변경점: fetchWordsByIds 결과를 dailies.wordIds 순서대로 재정렬(Stable ordering)
//        + 중복 제거, 날짜 없는 그룹 제외(이전 요청 반영)

import React, { useMemo, useState, useEffect } from "react";
import {
  Container, Typography, TextField, Box, Chip, Card, CardContent, Stack, Divider, IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import WordDetailModal from "../components/WordDetailModal";
import { listDailies, fetchWordsByIds } from "../firebase/firebaseFirestore";
import { useSpeechSynthesis } from "react-speech-kit";

// ✅ 병음 옆 한국어 발음 추출 헬퍼
const getKoPron = (w) => {
  if (!w) return "";
  if (w.koPronunciation) return String(w.koPronunciation).trim();
  if (Array.isArray(w.pronunciation)) {
    const exact = w.pronunciation.find((p) => p?.label && p.label === w.zh && p.ko);
    if (exact?.ko) return String(exact.ko).trim();
    const first = w.pronunciation[0]?.ko;
    if (first) return String(first).trim();
  }
  return "";
};

// ✅ 키 추출(여러 스키마 대응)
const getId = (w) => String(w?.id ?? w?.docId ?? w?._id ?? w?.zh ?? "");

// ✅ 모달 호환 매핑(신규 스키마 우선, 구키 폴백)
const mapToModalWord = (v = {}) => {
  const zh = v.zh ?? v.hanzi ?? v.id ?? v.cn ?? "";
  const pinyin = v.pinyin ?? v.py ?? "";
  const ko = v.ko ?? v.meaning ?? "";
  const sentence = v.sentence ?? v.exampleZh ?? v.example_zh ?? "";
  const sentencePinyin = v.sentencePinyin ?? v.examplePy ?? v.example_pinyin ?? "";
  const sentenceKo = v.sentenceKo ?? v.exampleKo ?? v.example_ko ?? "";
  const sentenceKoPronunciation =
    v.sentenceKoPronunciation ?? v.sentencePron ?? v.sentencePronunciation ?? "";
  const extensions = Array.isArray(v.extensions)
    ? v.extensions.map((e) => ({ ...e, koPron: e.koPron ?? e.pron ?? "" }))
    : [];
  const pronunciation = Array.isArray(v.pronunciation) ? v.pronunciation : [];
  const grammar = Array.isArray(v.grammar) ? v.grammar : [];
  const keyPoints = Array.isArray(v.keyPoints) ? v.keyPoints : [];
  const pos = v.pos ?? "";
  const tags = Array.isArray(v.tags) ? v.tags : [];

  return {
    zh,
    pinyin,
    ko,
    sentence,
    sentencePinyin,
    sentenceKo,
    sentenceKoPronunciation,
    sentencePron: sentenceKoPronunciation,
    extensions,
    pronunciation,
    grammar,
    keyPoints,
    pos,
    tags,
    koPronunciation: v.koPronunciation ?? v.koPron ?? "",
  };
};

// ✅ IDs 순서대로 결과를 재정렬 + 중복 제거
const orderWordsByIds = (ids = [], words = []) => {
  const idStrs = ids.map((x) => String(x));
  const map = new Map(words.map((w) => [getId(w), w]));
  const seen = new Set();
  const ordered = [];

  for (const id of idStrs) {
    if (seen.has(id)) continue; // 같은 ID 중복 방지
    const w = map.get(id);
    if (w) {
      ordered.push(w);
      seen.add(id);
    }
  }

  // 만약 ids에 없지만 불러온 단어가 추가로 있다면(예외 상황), 맨 뒤에 붙이지 않음 → dailies 정의를 신뢰
  return ordered;
};

export default function EverydayPage() {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [days, setDays] = useState([]); // [{ date, words }]
  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const { speak, voices } = useSpeechSynthesis();

  // 중국어 음성 엔진 (Simplified Chinese)
  const chineseVoice = useMemo(() => {
    const list = voices && voices.length ? voices : window.speechSynthesis?.getVoices?.() || [];
    const score = (v) => {
      const n = (v.name || "").toLowerCase();
      const l = (v.lang || "").toLowerCase();
      let s = 0;
      if (l.startsWith("zh")) s += 5;
      if (l.includes("cmn")) s += 2;
      if (l.includes("zh-cn") || l.includes("cmn-hans")) s += 2;
      if (/chinese|中文|普通话|国语/.test(n)) s += 2;
      return s;
    };
    return [...list].sort((a, b) => score(b) - score(a))[0] || null;
  }, [voices]);

  // ✅ 새 스키마 로드: dailies → wordIds → /words (ID 순서 보장)
  useEffect(() => {
    (async () => {
      try {
        const groups = await listDailies(); // [{date, wordIds:[]}]
        const out = [];
        const hasDate = (d) => typeof d === "string" && d.trim().length > 0;

        for (const g of groups) {
          if (!hasDate(g?.date)) continue; // 날짜 없는 그룹 스킵
          const ids = Array.isArray(g.wordIds) ? g.wordIds : [];
          if (ids.length === 0) {
            out.push({ date: g.date, words: [] });
            continue;
          }

          const fetched = await fetchWordsByIds(ids);
          const words = orderWordsByIds(ids, Array.isArray(fetched) ? fetched : []);
          out.push({ date: g.date, words });
        }

        // 최신 날짜 우선
        out.sort((a, b) => (a.date < b.date ? 1 : -1));
        setDays(out);
      } catch (e) {
        console.error(e);
        setDays([]);
      }
    })();
  }, []);

  const allPos = useMemo(() => {
    const s = new Set();
    (days || []).forEach((d) => (d.words || []).forEach((w) => w.pos && s.add(w.pos)));
    return Array.from(s).sort();
  }, [days]);

  const allTags = useMemo(() => {
    const s = new Set();
    (days || []).forEach((d) =>
      (d.words || []).forEach((w) => (w.tags || []).forEach((t) => s.add(t)))
    );
    return Array.from(s).sort();
  }, [days]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasDate = (d) => typeof d === "string" && d.trim().length > 0;

    return (days || [])
      .filter((d) => hasDate(d?.date))
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
    setSelectedWord(mapToModalWord(w));
    setOpen(true);
  };

  const handleSpeak = (text) => {
    if (!text) return;
    speak({ text, voice: chineseVoice, rate: 1 });
  };

  return (
    <Container maxWidth="md" sx={{ pb: 8 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        매일 단어
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
                    key={`${day.date}-${getId(w)}-${idx}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "minmax(96px, 1fr) minmax(0, 3fr) auto",
                      "@media (max-width:600px)": {
                        gridTemplateColumns: "1fr",
                        rowGap: 6,
                      },
                      gap: 1,
                      alignItems: "center",
                      "&:hover": { backgroundColor: "#fafafa" },
                      "@media (hover: none)": { "&:hover": { backgroundColor: "transparent" } },
                      p: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    {/* 중국어 + 스피커 */}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography sx={{ cursor: "pointer" }} onClick={() => onSelectWord(w)}>
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
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
                    >
                      {(w.pinyin || "").trim()}
                      {(() => {
                        const koP = getKoPron(w);
                        return koP ? ` ${koP}` : "";
                      })()}
                      {" — "}
                      {(w.ko || "").trim()}
                    </Typography>

                    {/* 품사 & 태그 */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                      sx={{ flexWrap: "wrap", rowGap: 0.5 }}
                    >
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

      <WordDetailModal open={open} onClose={() => setOpen(false)} word={selectedWord} />
    </Container>
  );
}
