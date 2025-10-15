// src/components/WordDetailModal.jsx — v4.3.1
// - pinyinKorean named import로 수정
// - 문장/예문 확장: koPron 없으면 병음 → 한국어 발음 자동 변환
// - sourceUrl 표시 + Web Speech API

import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, Chip, Button, Divider, Box, IconButton, Link
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

// ✅ 병음 → 한국어 발음 변환기 (named export)
import { freeTextPinyinToKorean } from "../lib/pinyinKorean";

// ===== 중국어 음성 재생 =====
function useChineseTTS() {
  const pickChineseVoice = () => {
    const list = (typeof window !== "undefined" && window.speechSynthesis?.getVoices?.()) || [];
    return (
      list.find((v) => v.lang?.toLowerCase?.().startsWith("zh")) ||
      list.find((v) => /chinese|mandarin|中文|普通话|國語|国语/i.test(v.name || "")) ||
      null
    );
  };

  const speakZh = (text) => {
    if (!text || typeof window === "undefined") return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      const v = pickChineseVoice();
      if (v) u.voice = v;
      u.rate = 1;
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(u);
    } catch (e) {
      console.warn("TTS speak error:", e);
    }
  };

  return speakZh;
}

// ===== 최상단 koPron 선택(여러 스키마 폴백) =====
function pickKoPronTop(word) {
  if (word?.koPronunciation) return String(word.koPronunciation).trim();
  if (word?.koPron) return String(word.koPron).trim();
  const arr = Array.isArray(word?.pronunciation) ? word.pronunciation : [];
  const exact = arr.find((p) => p?.label && p.label === word?.zh && p?.ko);
  if (exact?.ko) return String(exact.ko).trim();
  const first = arr[0]?.ko;
  if (first) return String(first).trim();
  return "";
}

// ===== 병음+한글발음 출력 공용 렌더러 =====
function PinyinLine({ pinyin, koPron }) {
  if (!pinyin) return null;
  return (
    <Typography color="text.secondary">
      [{pinyin}{koPron ? ` ${koPron}` : ""}]
    </Typography>
  );
}

export default function WordDetailModal({ open, onClose, word }) {
  const speakZh = useChineseTTS();
  if (!word) return null;

  // ---------- 안전 폴백/정규화 ----------
  const zh = word.zh ?? word.hanzi ?? word.id ?? "";
  const pinyin = word.pinyin ?? "";
  const ko = word.ko ?? word.meaning ?? "";
  const pos = word.pos ?? "";
  const tags = Array.isArray(word.tags) ? word.tags : [];
  const sourceUrl = word.sourceUrl || word.source || "";

  // 문장/예문
  const sentence = word.sentence ?? word.exampleZh ?? word.example_zh ?? "";
  const sentencePinyin = word.sentencePinyin ?? word.examplePy ?? word.example_pinyin ?? "";
  const sentenceKo = word.sentenceKo ?? word.exampleKo ?? word.example_ko ?? "";
  let sentenceKoPronunciation =
    word.sentenceKoPronunciation ?? word.sentencePron ?? word.sentencePronunciation ?? "";

  // ✅ 문장 koPron 자동 변환(병음이 있고 koPron 비었을 때)
  if (!sentenceKoPronunciation && sentencePinyin) {
    try { sentenceKoPronunciation = freeTextPinyinToKorean(sentencePinyin) || ""; } catch {}
  }

  const grammar = Array.isArray(word.grammar) ? word.grammar : [];

  // ✅ 예문 확장: pron/koPron/koPronunciation 폴백 + 자동 변환
  const extensions = Array.isArray(word.extensions)
    ? word.extensions.map((ex) => {
        const base = {
          zh: ex?.zh ?? "",
          pinyin: ex?.pinyin ?? "",
          ko: ex?.ko ?? "",
        };
        let koPron = ex?.koPron ?? ex?.koPronunciation ?? ex?.pron ?? "";
        if (!koPron && base.pinyin) {
          try { koPron = freeTextPinyinToKorean(base.pinyin) || ""; } catch {}
        }
        return { ...base, koPron };
      })
    : [];

  const keyPoints = Array.isArray(word.keyPoints) ? word.keyPoints : [];
  const pronunciation = Array.isArray(word.pronunciation)
    ? word.pronunciation
    : Array.isArray(word.pronunciation_items)
    ? word.pronunciation_items
    : [];

  const wordKoPron = pickKoPronTop(word);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* ===== 제목 영역 ===== */}
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {/* 중국어 + 스피커 */}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h6">{zh}</Typography>
            <IconButton size="small" onClick={() => speakZh(zh)} sx={{ p: 0.3 }}>
              <VolumeUpIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* (병음 한국어발음) : 뜻 */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
          >
            ({pinyin}{wordKoPron ? ` ${wordKoPron}` : ""}) : {ko}
          </Typography>

          {pos && <Chip size="small" label={pos} />}

          <Stack direction="row" spacing={0.5}>
            {tags.map((t) => (
              <Chip key={t} size="small" variant="outlined" label={t} />
            ))}
          </Stack>

          {!!sourceUrl && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              출처:{" "}
              <Link href={sourceUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                열기
              </Link>
            </Typography>
          )}
        </Stack>
      </DialogTitle>

      {/* ===== 본문 ===== */}
      <DialogContent dividers>
        {/* --- 문장 --- */}
        {!!sentence && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              문장
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography>{sentence}</Typography>
                <IconButton size="small" onClick={() => speakZh(sentence)} sx={{ p: 0.3 }}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* 병음 + (자동 변환된) 한국어 발음 */}
              <PinyinLine pinyin={sentencePinyin} koPron={sentenceKoPronunciation} />

              {!!sentenceKo && (
                <Typography color="text.secondary">{sentenceKo}</Typography>
              )}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 문법 설명 --- */}
        {grammar.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              문법 설명
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {grammar.map((g, idx) => (
                <Box key={idx}>
                  <Typography sx={{ display: "inline" }}>
                    {g.term}
                  </Typography>
                  {(g.pinyin || g.pron) && (
                    <Typography sx={{ display: "inline" }}>
                      {" "}({g.pinyin || ""}{g.pron ? ` ${g.pron}` : ""})
                    </Typography>
                  )}
                  {g.desc && (
                    <Typography sx={{ display: "inline", ml: 1 }}>{g.desc}</Typography>
                  )}
                  {g.structure && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      👉 구조: {g.structure}
                    </Typography>
                  )}
                  {g.note && (
                    <Typography variant="body2" color="text.secondary">
                      → {g.note}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 예문 확장 --- */}
        {extensions.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              예문 확장
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {extensions.map((ex, i) => (
                <Box key={i}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography>{ex.zh}</Typography>
                    <IconButton size="small" onClick={() => speakZh(ex.zh)} sx={{ p: 0.3 }}>
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <PinyinLine pinyin={ex.pinyin} koPron={ex.koPron} />
                  {!!ex.ko && (
                    <Typography color="text.secondary">{ex.ko}</Typography>
                  )}
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 핵심 포인트 --- */}
        {keyPoints.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              핵심 포인트
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {keyPoints.map((k, i) => (
                <Typography key={i}>• {k}</Typography>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 발음 정리 --- */}
        {pronunciation.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              발음 정리
            </Typography>
            <Stack spacing={0.5}>
              {pronunciation.map((p, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                  <Typography>
                    {p.label} — {p.pinyin}
                    {p.ko ? ` ${p.ko}` : ""}
                    {p.tone ? ` / 성조 ${p.tone}` : ""}
                  </Typography>
                  {!!p.label && (
                    <IconButton size="small" onClick={() => speakZh(p.label)} sx={{ p: 0.3 }}>
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none" }}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
