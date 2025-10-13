// src/pages/ConversationPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography, Card, CardContent, CircularProgress, Box, Stack, Avatar, IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function ConversationPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const { speak, voices } = useSpeechSynthesis();

  // (A) 안드로이드 보이스 웜업/재시도
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const v = synth.getVoices();
      if (v && v.length) clearInterval(t);
      if (tries >= 5) clearInterval(t);
    }, 300);
    return () => clearInterval(t);
  }, []);

  // (B) 중국어 보이스 선택기: zh/cmn/이름 키워드 + 우선순위(중국 > 대만 > 홍콩/광둥)
  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語"];
    const cands = arr.filter((v) => {
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
      if (L.includes("zh-hk") || L.includes("yue")) return 1; // 광둥어는 최하
      return 0;
    };
    return cands.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  // react-speech-kit 목록이 비어있으면 네이티브로 보강하여 선택
  const chineseVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return (
      list.find((v) => v.lang === "zh-CN") ||
      pickChineseVoice(list) ||
      null
    );
  }, [voices, pickChineseVoice]);

  // 안전 발화: 큐 정리 → 보이스 있으면 speak(), 없으면 네이티브 폴백
  const handleSpeak = useCallback((text, rate = 0.95) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (synth) synth.cancel();

      if (chineseVoice) {
        speak({
          text,
          voice: chineseVoice,
          rate,
          pitch: 1.0,
          volume: 1.0,
        });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = rate;
        u.pitch = 1.0;
        u.volume = 1.0;
        synth.speak(u);
      } else {
        console.warn("TTS 미지원 또는 보이스 없음");
      }
    } catch (e) {
      console.error("TTS 오류:", e);
    }
  }, [chineseVoice, speak]);

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

  const lines = Array.isArray(unit.conversation) ? unit.conversation : [];

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          대화 연습
        </Typography>

        {lines.length === 0 ? (
          <Typography color="text.secondary">대화 데이터가 없습니다.</Typography>
        ) : (
          <Stack spacing={2}>
            {lines.map((line, index) => (
              <Box key={index} display="flex" alignItems="flex-start" gap={2}>
                <Avatar
                  sx={{
                    bgcolor: line.speaker === "A" ? "primary.main" : "secondary.main",
                    width: 32,
                    height: 32,
                    fontSize: 14,
                  }}
                >
                  {line.speaker || "?"}
                </Avatar>

                <Card elevation={2} sx={{ bgcolor: "grey.50", flex: 1, borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography className="chinese-text2" variant="body1">
                        {line.chinese}
                      </Typography>
                      <IconButton
                        color="primary"
                        onClick={() => handleSpeak(line.chinese)}
                        aria-label="중국어 대사 듣기"
                      >
                        <VolumeUpIcon />
                      </IconButton>
                    </Box>
                    {!!line.pinyin && (
                      <Typography variant="body2" color="text.secondary">
                        {line.pinyin}
                      </Typography>
                    )}
                    {!!line.pronunciation && (
                      <Typography variant="body2">{line.pronunciation}</Typography>
                    )}
                    {!!line.meaning && (
                      <Typography variant="body2" color="text.secondary">
                        {line.meaning}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
