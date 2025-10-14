// src/components/WordDetailModal.jsx
import React, { useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, Chip, Button, Divider, Box, IconButton
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

/** 중국어 음성 강제 선택 + 재생 (react-speech-kit 대신 순수 Web Speech API) */
function useChineseTTS() {
  const voices = useMemo(() => {
    // 일부 브라우저는 getVoices()가 초기엔 빈 배열일 수 있음.
    // 하지만 호출 자체는 문제없고, 이후 다시 눌렀을 때 로드됨.
    return window.speechSynthesis?.getVoices?.() || [];
  }, []);

  const pickChineseVoice = () => {
    const list = window.speechSynthesis?.getVoices?.() || voices || [];
    // lang이 zh로 시작하는 음성 우선
    return (
      list.find((v) => v.lang?.toLowerCase?.().startsWith("zh")) ||
      list.find((v) => /chinese|mandarin|zh/i.test(v.name || "")) ||
      null
    );
  };

  const speakZh = (text) => {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; // ✅ 중국어 강제
    const v = pickChineseVoice();
    if (v) u.voice = v;
    u.rate = 1;
    try {
      window.speechSynthesis.cancel(); // 겹침 방지
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS speak error:", e);
    }
  };

  return speakZh;
}

export default function WordDetailModal({ open, onClose, word }) {
  const speakZh = useChineseTTS();

  if (!word) return null;

  const {
    zh,
    pinyin,
    ko,
    koPronunciation, // ← 단어의 한국어 발음(예: 'sǎn' -> '산')을 여기에 넣어두면 병음 옆에 표시됨
    koPron,          // koPron도 허용(둘 중 하나 쓰면 됨)
    pos,
    tags = [],
    sentence,
    sentencePinyin,
    sentenceKo,
    sentenceKoPronunciation, // 문장 병음의 한국어 발음(선택)
    grammar = [],
    extensions = [], // [{zh, pinyin, ko, koPronunciation}]
    keyPoints = [],
    pronunciation = [], // [{label, pinyin, ko(한국어 발음), tone}]
  } = word;

  // 단어 한국어 발음 값 합치기
  const wordKoPron = koPronunciation || koPron || "";

  const renderPinyinWithKoPron = (pin, koPron) => {
    if (!pin) return null;
    return (
      <Typography color="text.secondary">
        [{pin}{koPron ? ` ${koPron}` : ""}]
      </Typography>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* ===== 제목 영역 ===== */}
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {/* 중국어 + 스피커 */}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h6" >
              {zh}
            </Typography>
            <IconButton size="small" onClick={() => speakZh(zh)} sx={{ p: 0.3 }}>
              <VolumeUpIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* (병음 한국어발음) : 뜻 */}
          <Typography variant="body1" color="text.secondary">
            ({pinyin}{wordKoPron ? ` ${wordKoPron}` : ""}) : {ko}
          </Typography>

          {pos && <Chip size="small" label={pos} />}
          <Stack direction="row" spacing={0.5}>
            {tags.map((t) => (
              <Chip key={t} size="small" variant="outlined" label={t} />
            ))}
          </Stack>
        </Stack>
      </DialogTitle>

      {/* ===== 본문 ===== */}
      <DialogContent dividers>
        {/* --- 문장 --- */}
        {sentence && (
          <>
            <Typography variant="subtitle1" sx={{  mb: 1 }}>
              문장
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography>{sentence}</Typography>
                <IconButton size="small" onClick={() => speakZh(sentence)} sx={{ p: 0.3 }}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* 병음 + 한국어 발음(있을 때) */}
              {renderPinyinWithKoPron(sentencePinyin, sentenceKoPronunciation)}

              {sentenceKo && (
                <Typography color="text.secondary">{sentenceKo}</Typography>
              )}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 문법 설명 --- */}
        {grammar.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{mb: 1 }}>
              문법 설명
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {grammar.map((g, idx) => (
                <Box key={idx}>
                  <Typography sx={{  display: "inline" }}>
                    {g.term}
                  </Typography>
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
            <Typography variant="subtitle1" sx={{  mb: 1 }}>
              예문 확장
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {extensions.map((ex, i) => {
                const exKoPron = ex.koPronunciation || ex.koPron || "";
                return (
                  <Box key={i}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography>{ex.zh}</Typography>
                      <IconButton size="small" onClick={() => speakZh(ex.zh)} sx={{ p: 0.3 }}>
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    {renderPinyinWithKoPron(ex.pinyin, exKoPron)}
                    {ex.ko && (
                      <Typography color="text.secondary">{ex.ko}</Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* --- 핵심 포인트 --- */}
        {keyPoints.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{  mb: 1 }}>
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
            <Typography variant="subtitle1" sx={{  mb: 1 }}>
              발음 정리
            </Typography>
            <Stack spacing={0.5}>
              {pronunciation.map((p, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                  <Typography>
                    {p.label} — {p.pinyin}
                    {p.ko ? ` ${p.ko}` : ""} {/* ← 한국어 발음 필드(p.ko) 함께 표시 */}
                    {p.tone ? ` / 성조 ${p.tone}` : ""}
                  </Typography>
                  <IconButton size="small" onClick={() => speakZh(p.label)} sx={{ p: 0.3 }}>
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
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
