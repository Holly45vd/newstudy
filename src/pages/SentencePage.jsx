// src/pages/SentencePage.jsx
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

export default function SentencePage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const { speak, voices } = useSpeechSynthesis();

  const chineseVoice = voices.find((voice) => voice.lang === "zh-CN");

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

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          문장 연습
        </Typography>
        <Grid container spacing={2}>
          {unit.sentences.map((s, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body1" className="chinese-text2">
                      {s.chinese}
                    </Typography>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() =>
                        speak({ text: s.chinese, voice: chineseVoice, rate: 0.9 })
                      }
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Box>
                  <Typography>{s.pinyin}</Typography>
                  <Typography color="text.secondary">{s.pronunciation}</Typography>
                  <Typography>{s.meaning}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
