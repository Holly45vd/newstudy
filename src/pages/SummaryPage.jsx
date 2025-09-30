// src/pages/SummaryPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
} from "@mui/material";
import UnitTabs from "../components/tabs/UnitTabs";

export default function SummaryPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);

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
      {/* 상단 탭 */}
      <UnitTabs />

      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          학습 요약 (Unit {id})
        </Typography>

        {/* 핵심 단어 */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            핵심 단어
          </Typography>
          {unit.summary?.vocabulary && unit.summary.vocabulary.length > 0 ? (
            <List dense>
              {unit.summary.vocabulary.map((word, index) => (
                <ListItem key={index}>
                  <ListItemText primary={word} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">핵심 단어가 없습니다.</Typography>
          )}
        </Paper>

        {/* 핵심 문법 */}
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            핵심 문법
          </Typography>
          {unit.summary?.grammar && unit.summary.grammar.length > 0 ? (
            <List dense>
              {unit.summary.grammar.map((g, index) => (
                <ListItem key={index}>
                  <ListItemText primary={g} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">핵심 문법이 없습니다.</Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
