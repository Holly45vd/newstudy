// src/pages/GrammarPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  Container, Typography, Card, CardContent, CircularProgress,
  Box, IconButton, Divider, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function GrammarPage() {
  const { id } = useParams();
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { speak, voices } = useSpeechSynthesis();

  // 음성 초기화
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const v = synth.getVoices();
      if (v?.length || tries >= 5) clearInterval(t);
    }, 300);
    return () => clearInterval(t);
  }, []);

  // 중국어 음성 선택
  const pickChineseVoice = useCallback((list) => {
    const kw = ["chinese", "中文", "普通话", "國語", "国语"];
    const cands = list.filter(
      (v) =>
        v.lang?.toLowerCase().startsWith("zh") ||
        kw.some((k) => v.name?.toLowerCase().includes(k))
    );
    const score = (v) => {
      const L = v.lang?.toLowerCase() || "";
      if (L.includes("zh-cn")) return 3;
      if (L.includes("zh-tw")) return 2;
      if (L.includes("zh-hk")) return 1;
      return 0;
    };
    return cands.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  const chineseVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = native.length ? native : voices;
    return (
      list.find((v) => v.lang === "zh-CN") ||
      pickChineseVoice(list || []) ||
      null
    );
  }, [voices, pickChineseVoice]);

  const handleSpeak = (text) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      synth?.cancel();
      if (chineseVoice) {
        speak({ text, voice: chineseVoice, rate: 1, pitch: 1 });
      } else if (synth) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        synth.speak(u);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 문법 데이터 불러오기
  useEffect(() => {
    const fetchGrammar = async () => {
      try {
        const ref = doc(db, "units", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return setGrammarList([]);
        const data = snap.data();
        const raw = Array.isArray(data.grammar)
          ? data.grammar
          : Object.values(data.grammar || {});
        const normalized = raw.map((item) => ({
          title: item.title || item.rule || "",
          summary: item.summary || item.description || "",
          notes: Array.isArray(item.notes)
            ? item.notes
            : item.notes
            ? [String(item.notes)]
            : [],
          examples: (item.examples || []).map((ex) => ({
            chinese: ex.chinese || ex.zh || "",
            pinyin: ex.pinyin || ex.py || "",
            pronunciation: ex.pronunciation || "",
            meaning: ex.meaning || ex.ko || "",
          })),
        }));
        setGrammarList(normalized);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrammar();
  }, [id]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <UnitTabs />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
        <Typography variant="h5"  align="center" gutterBottom>
          문법 학습
        </Typography>

        {grammarList.length === 0 ? (
          <Typography align="center" color="text.secondary">
            문법 데이터가 없습니다.
          </Typography>
        ) : (
          grammarList.map((item, idx) => (
            <Box key={idx} sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <Accordion sx={{ width: "80%", borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" >
                    {item.title}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails>
                  <Card sx={{ borderRadius: 2, minHeight: "200px" }}>
                    <CardContent>
                      {item.summary && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {item.summary}
                        </Typography>
                      )}

                      {item.notes?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            주의사항
                          </Typography>
                          {item.notes.map((note, i) => (
                            <Typography key={i} variant="body2">
                              • {note}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {item.examples?.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{  mb: 1 }}>
                            예문
                          </Typography>
                          {item.examples.map((ex, i) => (
                            <Box
                              key={i}
                              sx={{
                                mb: 1.5,
                                p: 1.5,
                                border: "1px solid #eee",
                                borderRadius: 1.5,
                                background: "#fafafa",
                              }}
                            >
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1" >
                                  {ex.chinese}
                                </Typography>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSpeak(ex.chinese)}
                                >
                                  <VolumeUpIcon fontSize="small" />
                                </IconButton>
                              </Box>

                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                <strong>Pinyin:</strong> {ex.pinyin}
                                {ex.pronunciation && (
                                  <span style={{ marginLeft: 8, color: "#666" }}>
                                    ({ex.pronunciation})
                                  </span>
                                )}
                              </Typography>

                              <Typography variant="body2" color="text.secondary">
                                <strong>뜻:</strong> {ex.meaning}
                              </Typography>

                              {i < item.examples.length - 1 && (
                                <Divider sx={{ mt: 1, mb: 1 }} />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            </Box>
          ))
        )}
      </Container>
    </Box>
  );
}
