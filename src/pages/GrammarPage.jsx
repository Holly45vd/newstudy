// src/pages/GrammarPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function GrammarPage() {
  const { id } = useParams();
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { speak, voices } = useSpeechSynthesis();

  // zh-CN 우선, 없으면 zh-* 허용
  const chineseVoice = useMemo(() => {
    return (
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => (v.lang || "").toLowerCase().startsWith("zh")) ||
      null
    );
  }, [voices]);

  const handleSpeak = (text, rate = 0.9) => {
    if (!text) return;
    speak({ text, voice: chineseVoice || null, lang: "zh-CN", rate });
  };

  // ---- 정규화 함수: 어떤 스키마든 title/summary/notes/examples로 맞춘다
  const normalizeGrammarArray = (rawArr) => {
    return rawArr
      .map((item) => {
        // 1) 제목
        const title = item.title || item.rule || "";

        // 2) 설명
        const summary = item.summary || item.description || "";

        // 3) 노트
        const notes = Array.isArray(item.notes)
          ? item.notes
          : item.notes
          ? [String(item.notes)]
          : [];

        // 4) 예문: examples(배열) 우선, 없으면 example(단일)
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
          examples = [
            {
              chinese: ex.chinese || ex.zh || "",
              pinyin: ex.pinyin || ex.py || "",
              meaning: ex.meaning || ex.ko || "",
              pronunciation: ex.pronunciation || "",
            },
          ];
        }

        return { title, summary, notes, examples };
      })
      // 최소한 title/summary/examples 중 하나라도 있어야 표시
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

        // ---- 디버그: 원본 출력
        console.log("[Grammar] raw from Firestore:", raw);

        // grammar가 배열이 아닐 수도 있음(Map으로 들어간 경우)
        if (!Array.isArray(raw) && raw && typeof raw === "object") {
          raw = Object.values(raw); // {0:{},1:{}} 형태 지원
        }

        if (!Array.isArray(raw)) {
          console.warn("[Grammar] grammar가 배열이 아닙니다. 빈 배열로 처리합니다.");
          setGrammarList([]);
          return;
        }

        // ---- 정규화
        const normalized = normalizeGrammarArray(raw);

        // ---- 디버그: 정규화 결과 출력
        console.log("[Grammar] normalized:", normalized);

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
                    {/* 제목 */}
                    {!!item.title && (
                      <Typography variant="h6" className="chinese-text" gutterBottom>
                        {item.title}
                      </Typography>
                    )}

                    {/* 요약 */}
                    {!!item.summary && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.summary}
                      </Typography>
                    )}

                    {/* 노트 */}
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

                    {/* 예문 */}
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
