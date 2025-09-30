// src/pages/PracticePage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function PracticePage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);

  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(""); // 정답/오답 텍스트

  const { speak } = useSpeechSynthesis(); // 음성 기능 hook

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

  // 정답 확인
  const checkAnswer = (questionIndex, answer) => {
    const correctAnswer = unit.practice[questionIndex].answer;
    const isCorrect = answer === correctAnswer;

    const resultText = isCorrect ? "정답입니다! 🎉" : `틀렸습니다. 😢 (정답: ${correctAnswer})`;

    setResult(resultText);
    setOpen(true);

    // 모달 열릴 때 자동으로 음성 출력
    speak({
      text: resultText,
      lang: "ko-KR", // 한국어 음성
      rate: 1,
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  // 수동으로 다시 재생하는 함수
  const playAnswerVoice = () => {
    speak({
      text: result,
      lang: "ko-KR",
      rate: 1,
    });
  };

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          연습 문제
        </Typography>

        {unit.practice.map((q, index) => (
          <Card key={index} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography gutterBottom>{q.question}</Typography>
              {q.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1, fontSize: "1.2rem" }}
                  onClick={() => checkAnswer(index, opt)}
                >
                  {opt}
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* 정답/오답 모달 */}
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>
            {result.startsWith("정답") ? "✅ 정답" : "❌ 오답"}
          </DialogTitle>
          <DialogContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1">{result}</Typography>
            {/* 음성 버튼 */}
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
