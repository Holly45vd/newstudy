// src/pages/GrammarPage.jsx
import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

export default function GrammarPage() {
  const { id } = useParams();
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { speak } = useSpeechSynthesis();

  useEffect(() => {
    const fetchGrammar = async () => {
      try {
        const docRef = doc(db, "units", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data().grammar || [];
          const fixedData = data.map((item) => ({
            ...item,
            example: item.example || {
              chinese: "",
              pinyin: "",
              pronunciation: "",
              meaning: "",
            },
          }));
          setGrammarList(fixedData);
        } else {
          setGrammarList([]);
        }
      } catch (error) {
        console.error("문법 데이터 불러오기 오류:", error);
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
      <Container maxWidth="md" sx={{ mt: 2 }}>
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
                    <Typography variant="h6" className="chinese-text" gutterBottom>
                      {item.rule}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {item.description}
                    </Typography>

                    {item.example && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: "#f9f9f9", borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="subtitle2" gutterBottom>
                            예문
                          </Typography>
                          <IconButton
                            color="primary"
                            onClick={() => speak({ text: item.example.chinese, lang: "zh-CN" })}
                          >
                            <VolumeUpIcon />
                          </IconButton>
                        </Box>
                        <Typography variant="body1" className="chinese-text2">
                          중국어: {item.example.chinese}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Pinyin:</strong> {item.example.pinyin}
                        </Typography>
                        <Typography variant="body1">
                          <strong>발음:</strong> {item.example.pronunciation}
                        </Typography>
                        <Typography variant="body1">
                          <strong>뜻:</strong> {item.example.meaning}
                        </Typography>
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
