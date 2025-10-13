// src/pages/VocabularyPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Box,
  IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function VocabularyPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);

  // react-speech-kit
  const { speak, voices } = useSpeechSynthesis();

  // 1) 보이스 강제 로딩 폴백 (안드로이드용)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const { speechSynthesis } = window;
    // 초기 한 번 호출로 엔진 웜업
    speechSynthesis.getVoices();

    // 짧게 여러 번 재시도 (총 ~1.5s)
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const v = speechSynthesis.getVoices();
      if (v && v.length) clearInterval(id);
      if (tries >= 5) clearInterval(id);
    }, 300);

    return () => clearInterval(id);
  }, []);

  // 2) 중국어 보이스 선택기 (폭넓게 매칭 + 우선순위)
  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語", "國語(臺灣)"];

    const candidates = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const langMatch = lang.startsWith("zh") || lang.includes("cmn"); // Mandarin
      const nameMatch = kw.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });

    const score = (v) => {
      const L = (v.lang || "").toLowerCase();
      // Mandarin(중국) > Mandarin(대만) > 홍콩/광둥
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };

    return candidates.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchUnitById(id);
      setUnit(data);
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

  // 3) 안전 발화: react-speech-kit 우선, 실패 시 네이티브 폴백
  const handleSpeak = async (text) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (synth) synth.cancel(); // 이전 큐 정리

      // 최신 보이스 리스트 확보 (react-speech-kit의 voices가 비어 있으면 네이티브 조회)
      const nativeVoices = synth?.getVoices?.() || [];
      const voiceList = nativeVoices.length ? nativeVoices : voices;

      const zhVoice =
        voiceList?.find((v) => v.lang === "zh-CN") ||
        pickChineseVoice(voiceList);

      if (zhVoice) {
        // react-speech-kit 경로
        speak({
          text,
          voice: zhVoice,
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        // 네이티브 폴백: 보이스 없을 때도 lang을 강제 지정
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN"; // 표준 중국어
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
        synth.speak(u);
      } else {
        console.warn("TTS 미지원 또는 보이스 없음");
      }
    } catch (e) {
      console.error("TTS 오류:", e);
    }
  };

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          단어 학습 (Unit {id})
        </Typography>

        <Grid container spacing={2}>
          {unit.vocabulary && unit.vocabulary.length > 0 ? (
            unit.vocabulary.map((vocab, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    textAlign: "center",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "translateY(-3px)" },
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <Typography variant="h6" className="chinese-text">
                        {vocab.hanzi}
                      </Typography>
                      <IconButton
                        color="primary"
                        onClick={() => handleSpeak(vocab.hanzi)}
                        aria-label="중국어로 듣기"
                      >
                        <VolumeUpIcon />
                      </IconButton>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary">
                      {vocab.pinyin}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vocab.pronunciation}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {vocab.meaning}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography align="center" color="text.secondary">
                단어 데이터가 없습니다.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
