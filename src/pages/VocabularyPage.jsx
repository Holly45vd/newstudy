// src/pages/VocabularyPage.jsx
import React, { useEffect, useState } from "react";
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

  // useSpeechSynthesis에서 voices까지 가져오기
  const { speak, voices } = useSpeechSynthesis();

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

  // 중국어 음성으로 읽기
  const handleSpeak = (text) => {
    if (!text) return;

    // zh-CN 음성 찾기
    const zhVoice = voices.find((v) => v.lang === "zh-CN");

    speak({
      text,
      voice: zhVoice || null, // zh-CN 있으면 그걸로, 없으면 기본
      lang: "zh-CN",           // fallback
    });
  };

  return (
    <Box>
      <UnitTabs /> {/* 상단 탭 */}
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
                      <IconButton color="primary" onClick={() => handleSpeak(vocab.hanzi)}>
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
