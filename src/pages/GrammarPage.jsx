// src/pages/GrammarPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  Container, Typography, Card, CardContent, CircularProgress, Grid,
  Box, IconButton, List, ListItem, ListItemText, Divider,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function GrammarPage() {
  const { id } = useParams();
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);

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
      if (tries >= 5) clearInterval(t); // 최대 ~1.5s
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

  // 기존 zh-CN 고정 로직 → 안전 선택 로직으로 대체
  const chineseVoice = useMemo(() => {
    // react-speech-kit이 준 목록이 비어있으면 네이티브로 보강
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return (
      list.find((v) => v.lang === "zh-CN") ||
      pickChineseVoice(list) ||
      null
    );
  }, [voices, pickChineseVoice]);

  // 안전 발화: 큐 정리 → 보이스 있으면 speak(), 없으면 네이티브 폴백
  const handleSpeak = (text, rate = 1.0) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (synth) synth.cancel();

      if (chineseVoice) {
        speak({
          text,
          voice: chineseVoice,
          rate,               // 0.9~1.1 범위 권장
          pitch: 1.0,
          volume: 1.0,
        });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";     // 폴백 강제
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
  };

  // ---- 정규화 함수 그대로 유지
  const normalizeGrammarArray = (rawArr) => {
    return rawArr
      .map((item) => {
        const title = item.title || item.rule || "";
        const summary = item.summary || item.description || "";
        const notes = Array.isArray(item.notes)
          ? item.notes
          : item.notes
          ? [String(item.notes)]
          : [];
        let examples = [];
        if (Array.isArray(item.examples)) {
          examples = item.examples.map((ex) => ({
            chinese: ex.chinese || ex.zh || "",
            pinyin: ex.pinyin || ex.py || "",
            meaning: ex.meaning || ex.ko || "",
            pronunciation: ex.pronunciation || "",
          }));
        } else if (item.example) {
          const ex = item.example;
          examples = [{
            chinese: ex.chinese || ex.zh || "",
            pinyin: ex.pinyin || ex.py || "",
            meaning: ex.meaning || ex.ko || "",
            pronunciation: ex.pronunciation || "",
          }];
        }
        return { title, summary, notes, examples };
      })
      .filter(
        (g) =>
          (g.title && g.title.trim() !== "") ||
          (g.summary && g.summary.trim() !== "") ||
          (Array.isArray(g.examples) && g.examples.length > 0)
      );
  };

  useEffect(() => {
    const fetchGrammar = async () => {
      try {
        const ref = doc(db, "units", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          console.warn(`[Grammar] units/${id} 문서가 없습니다.`);
          setGrammarList([]);
          return;
        }
        const data = snap.data();
        let raw = data.grammar;
        if (!Array.isArray(raw) && raw && typeof raw === "object") {
          raw = Object.values(raw);
        }
        if (!Array.isArray(raw)) {
          console.warn("[Grammar] grammar가 배열이 아닙니다. 빈 배열로 처리합니다.");
          setGrammarList([]);
          return;
        }
        const normalized = normalizeGrammarArray(raw);
        setGrammarList(normalized);
      } catch (e) {
        console.error("문법 데이터 불러오기 오류:", e);
        setGrammarList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGrammar();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <UnitTabs />
      <Container maxWidth="md" sx={{ mt: 2, mb: 6 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          문법 학습
        </Typography>

        {grammarList.length === 0 ? (
          <Typography align="center" color="text.secondary">
            문법 데이터가 없습니다.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {grammarList.map((item, index) => (
              <Grid item xs={12} key={index}>
                <Card elevation={3} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    {!!item.title && (
                      <Typography variant="h6" className="chinese-text" gutterBottom>
                        {item.title}
                      </Typography>
                    )}
                    {!!item.summary && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.summary}
                      </Typography>
                    )}
                    {!!item.notes?.length && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          주의사항
                        </Typography>
                        <List dense sx={{ pt: 0 }}>
                          {item.notes.map((n, i) => (
                            <ListItem key={i} sx={{ py: 0 }}>
                              <ListItemText
                                primaryTypographyProps={{ variant: "body2" }}
                                primary={`• ${n}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                    {!!item.examples?.length && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: "#f9f9f9", borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          예문
                        </Typography>
                        {item.examples.map((ex, i) => (
                          <Box key={i} sx={{ mb: i < item.examples.length - 1 ? 1.5 : 0 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="body1" className="chinese-text2">
                                {ex.chinese}
                              </Typography>
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleSpeak(ex.chinese)}
                                aria-label="중국어 예문 듣기"
                              >
                                <VolumeUpIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            {!!ex.pinyin && (
                              <Typography variant="body2">
                                <strong>Pinyin:</strong> {ex.pinyin}
                              </Typography>
                            )}
                            {!!ex.pronunciation && (
                              <Typography variant="body2">
                                <strong>발음:</strong> {ex.pronunciation}
                              </Typography>
                            )}
                            {!!ex.meaning && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>뜻:</strong> {ex.meaning}
                              </Typography>
                            )}
                            {i < item.examples.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
