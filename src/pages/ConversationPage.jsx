// src/pages/ConversationPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Box,
  Stack,
  Avatar,
  IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import UnitTabs from "../components/tabs/UnitTabs";
import { speakSafe, warmUpVoices } from "../lib/ttsHelper";

export default function ConversationPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);

  // 보이스 웜업 (마운트 시 1회)
  useEffect(() => {
    warmUpVoices();
  }, []);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchUnitById(id);
      setUnit(data);
    };
    loadData();
  }, [id]);

  // 안전 발화 (중국어)
  const handleSpeak = useCallback((text) => {
    speakSafe(text, { lang: "zh", rate: 0.95 });
  }, []);

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
        <Typography variant="h5" gutterBottom>
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
                  }}
                >
                  {line.speaker || "?"}
                </Avatar>

                <Card elevation={2} sx={{ bgcolor: "grey.50", flex: 1, borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography  variant="body1">
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
                        {line.pinyin} / {line.pronunciation}
                      </Typography>
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
