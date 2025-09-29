// src/pages/ConversationPage.jsx
import React, { useEffect, useState } from "react";
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
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function ConversationPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const { speak } = useSpeechSynthesis();

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
      <UnitTabs /> {/* 상단 탭 */}
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          대화 연습
        </Typography>

        <Stack spacing={2}>
          {unit.conversation.map((line, index) => (
            <Box key={index} display="flex" alignItems="flex-start" gap={2}>
              <Avatar
                sx={{
                  bgcolor: line.speaker === "A" ? "primary.main" : "secondary.main",
                  width: 32,
                  height: 32,
                  fontSize: 14,
                }}
              >
                {line.speaker}
              </Avatar>

              <Card elevation={2} sx={{ bgcolor: "grey.50", flex: 1, borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography className="chinese-text2" variant="body1">
                      {line.chinese}
                    </Typography>
                    <IconButton
                      color="primary"
                      onClick={() => speak({ text: line.chinese, lang: "zh-CN" })}
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {line.pinyin}
                  </Typography>
                  <Typography variant="body2">{line.pronunciation}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {line.meaning}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
