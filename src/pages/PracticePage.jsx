// src/pages/PracticePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography, Card, CardContent, Button, Box, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Stack, Chip, Divider,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

// 공백/문장부호 무시 비교
const normalize = (s = "") =>
  s.replace(/\s+/g, "").replace(/[，。！？,.!?；;：:、“”"‘’'（）()]/g, "").trim();

// 중국어 문장 → 글자 토큰 배열 (문장부호 제거)
const zhToCharTokens = (s = "") => {
  const cleaned = s.replace(/[，。！？,.!?；;：:、“”"‘’'（）()\s]/g, "");
  return cleaned.split("").filter(Boolean);
};

// 배열 섞기
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function PracticePage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);

  // 통합 reorder 상태: { idx: { selected, remaining } }
  const [reorders, setReorders] = useState({});
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");

  // 확장표현 뜻 토글
  const [showMeanings, setShowMeanings] = useState(false);

  // react-speech-kit
  const { speak, voices } = useSpeechSynthesis();

  // (A) 안드로이드 보이스 웜업/재시도
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    synth.getVoices(); // 1차 호출
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const v = synth.getVoices();
      if (v && v.length) clearInterval(t);
      if (tries >= 5) clearInterval(t); // 총 ~1.5s
    }, 300);
    return () => clearInterval(t);
  }, []);

  // (B) 중국어/한국어 보이스 선택기: zh/ko + 이름 키워드 + 우선순위
  const pickVoice = useCallback((list, langPrefix) => {
    const arr = Array.isArray(list) ? list : [];
    const kwMap = {
      zh: ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語"],
      ko: ["korean", "한국어", "조선말"],
    };
    const kws = kwMap[langPrefix] || [];
    const cands = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const langMatch =
        lang.startsWith(langPrefix) ||
        (langPrefix === "zh" && (lang.includes("cmn") || lang.includes("yue"))); // cmn=Mandarin, yue=Cantonese
      const nameMatch = kws.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });

    // 우선순위: 중국 표준 > 대만 표준 > 홍콩/기타
    const scoreZh = (L) => {
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };

    return cands
      .sort((a, b) => {
        const La = (a.lang || "").toLowerCase();
        const Lb = (b.lang || "").toLowerCase();
        if (langPrefix === "zh") return scoreZh(Lb) - scoreZh(La);
        return 0; // ko는 정렬 불필요
      })[0] || null;
  }, []);

  // react-speech-kit 목록이 비면 네이티브로 보강
  const zhVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return list.find((v) => v.lang === "zh-CN") || pickVoice(list, "zh") || null;
  }, [voices, pickVoice]);

  const koVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return list.find((v) => v.lang === "ko-KR") || pickVoice(list, "ko") || null;
  }, [voices, pickVoice]);

  // 안전 발화: 큐 정리 → react-speech-kit 우선 → 네이티브 폴백
  const safeSpeak = useCallback((text, opts) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (synth) synth.cancel();

      const { voice, lang, rate = 0.95, pitch = 1.0, volume = 1.0 } = opts || {};
      if (voice) {
        // react-speech-kit 경로
        speak({ text, voice, rate, pitch, volume });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        // 네이티브 폴백
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang || "zh-CN";
        u.rate = rate;
        u.pitch = pitch;
        u.volume = volume;
        synth.speak(u);
      } else {
        console.warn("TTS 미지원 또는 보이스 없음");
      }
    } catch (e) {
      console.error("TTS 오류:", e);
    }
  }, [speak]);

  const speakZh = (text, rate = 0.95) =>
    safeSpeak(text, { voice: zhVoice, lang: "zh-CN", rate });

  const speakKo = (text, rate = 1.0) =>
    safeSpeak(text, { voice: koVoice, lang: "ko-KR", rate });

  // writing → reorder 변환
  const convertWritingToReorder = (writing = []) =>
    writing.map((w) => {
      const answer = w.answer_zh || "";
      const items = shuffle(zhToCharTokens(answer));
      return { items, answer, hint_ko: w.prompt_ko || "" };
    });

  // 초기화
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchUnitById(id);
      setUnit(data);

      // 새 구조(object) 전제: writing을 변환해 reorder와 통합
      if (data?.practice && !Array.isArray(data.practice)) {
        const fromWriting = convertWritingToReorder(data.practice.writing || []);
        const merged = [...(data.practice.reorder || []), ...fromWriting];

        const init = {};
        merged.forEach((r, idx) => {
          init[idx] = { selected: [], remaining: [...r.items] };
        });
        setReorders(init);
      } else {
        setReorders({});
      }
    };
    loadData();
  }, [id]);

  if (!unit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
        <CircularProgress />
      </Box>
    );
  }

  // 결과 모달
  const openResult = (text) => {
    setResult(text);
    setOpen(true);
    speakKo(text);
  };
  const handleClose = () => setOpen(false);
  const playAnswerVoice = () => speakKo(result);

  // 토큰 고르기/리셋
  const handlePickToken = (qIdx, token) => {
    setReorders((prev) => {
      const cur = prev[qIdx];
      if (!cur) return prev;
      return {
        ...prev,
        [qIdx]: {
          selected: [...cur.selected, token],
          remaining: cur.remaining.filter((t) => t !== token),
        },
      };
    });
  };
  const handleResetReorder = (qIdx, items) => {
    setReorders((prev) => ({ ...prev, [qIdx]: { selected: [], remaining: [...items] } }));
  };

  // 1) 읽기: 뜻 & 발음(재생)만
  const renderReading = (reading = []) => {
    if (!reading.length) return null;
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          읽기 (뜻 & 발음)
        </Typography>
        {reading.map((item, idx) => (
          <Card key={idx} sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography className="chinese-text2" sx={{ fontSize: "1.05rem" }}>
                  {item.zh}
                </Typography>
                <IconButton size="small" color="primary" onClick={() => speakZh(item.zh)}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography color="text.secondary">뜻: {item.ko}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // 2) 문장 만들기: reorder + writing(변환) 통합
  const renderUnifiedReorder = (practiceObj) => {
    if (!practiceObj || Array.isArray(practiceObj)) return null;
    const fromWriting = convertWritingToReorder(practiceObj.writing || []);
    const merged = [...(practiceObj.reorder || []), ...fromWriting];
    if (!merged.length) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          문장 만들기 (클릭해서 순서 맞추기)
        </Typography>

        {merged.map((r, idx) => {
          const state = reorders[idx] || { selected: [], remaining: [...r.items] };
          const built = state.selected.join(" ");

          return (
            <Card key={idx} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent>
                {/* 힌트(한국어 문장) */}
                {r.hint_ko && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    힌트: {r.hint_ko}
                  </Typography>
                )}

                {/* 선택된 토큰 */}
                <Box sx={{ mb: 1, minHeight: 48 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {state.selected.map((t, i) => (
                      <Chip key={`${t}-${i}`} label={t} />
                    ))}
                  </Stack>
                </Box>

                {/* 남은 토큰 */}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  {state.remaining.map((t, i) => (
                    <Chip
                      key={`${t}-${i}`}
                      label={t}
                      variant="outlined"
                      clickable
                      onClick={() => handlePickToken(idx, t)}
                    />
                  ))}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="contained"
                    onClick={() =>
                      openResult(
                        normalize(built) === normalize(r.answer)
                          ? "정답입니다! 🎉"
                          : `틀렸습니다. 😢 (정답: ${r.answer})`
                      )
                    }
                  >
                    제출
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={() => handleResetReorder(idx, r.items)}
                  >
                    초기화
                  </Button>
                  <IconButton color="primary" onClick={() => speakZh(r.answer)}>
                    <VolumeUpIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  // 3) 확장표현: 한자 + 병음 + 한국어 발음 + (토글)뜻
  const renderExtension = (ext = []) => {
    if (!ext.length) return null;
    return (
      <Box sx={{ mt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">확장 표현</Typography>
          <IconButton onClick={() => setShowMeanings((v) => !v)}>
            {showMeanings ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Stack>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={1.2}>
              {ext.map((e, i) => (
                <Box key={i}>
                  {/* 한자 + 재생 */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography className="chinese-text2" sx={{ fontSize: "1.05rem" }}>
                      {e.zh} 
                    </Typography>
                    <IconButton size="small" color="primary" onClick={() => speakZh(e.zh)}>
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* 병음 */}
                  {!!e.py && (
                    <Typography variant="body2">
                      <strong>Pinyin:</strong> {e.py}
                    </Typography>
                  )}

                  {/* 한국어 발음 */}
                  {!!e.pron && (
                    <Typography variant="body2">
                      <strong>발음:</strong> {e.pron}
                    </Typography>
                  )}

                  {/* 뜻: 토글 */}
                  {showMeanings && (
                    <Typography variant="body2" color="text.secondary">
                      {e.ko}
                    </Typography>
                  )}

                  {i < ext.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const practice = unit.practice;

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          연습 문제
        </Typography>

        {/* 1) 읽기(뜻 & 발음) */}
        {!Array.isArray(practice) && renderReading(practice.reading || [])}

        {/* 2) 문장 만들기(배열): writing을 전부 배열형으로 변환 후 통합 */}
        {!Array.isArray(practice) && renderUnifiedReorder(practice)}

        {/* 3) 확장표현: 병음/한국어 발음 포함 */}
        {!Array.isArray(practice) && renderExtension(practice.extension_phrases || [])}

        {/* 결과 모달 */}
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>{result.startsWith("정답") ? "✅ 정답" : "❌ 오답"}</DialogTitle>
          <DialogContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1">{result}</Typography>
            <IconButton color="primary" onClick={playAnswerVoice}>
              <VolumeUpIcon />
            </IconButton>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary" variant="contained">
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
