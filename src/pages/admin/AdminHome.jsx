// src/pages/admin/AdminHome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUnits } from "../../firebase/firebaseFirestore";
import {
  Container, Typography, Box, Button, CircularProgress, Paper,
  List, ListItem, ListItemText,
} from "@mui/material";

export default function AdminHome() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const data = await fetchUnits();
        const arr = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
        const normalized = arr.filter(Boolean).map((u, idx) => ({
          id: (u.id ?? u.docId ?? String(idx)).toString(),
          title: u.title ?? "제목 없음",
          theme: u.theme ?? "주제 없음",
        }));
        setUnits(normalized);
      } catch (error) {
        console.error("유닛 불러오기 오류:", error);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };
    loadUnits();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        관리자 대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        유닛 데이터를 생성/수정합니다.
      </Typography>

      {/* 새 유닛 등록 */}
      <Box my={3} textAlign="right">
        <Button variant="contained" color="primary" onClick={() => navigate("/admin/unit-edit")}>
          새 유닛 등록
        </Button>
      </Box>

      {/* Everyday 링크 */}
      <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
        <Button variant="outlined" onClick={() => navigate("/admin/everyday")} sx={{ textTransform: "none" }}>
          중국어 공부 관리(Everyday)
        </Button>
      </Paper>

      {/* 유닛 목록 */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
          현재 저장된 유닛
        </Typography>

        {loading ? (
          <Box textAlign="center" py={3}><CircularProgress /></Box>
        ) : units.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography color="text.secondary">등록된 유닛이 없습니다.</Typography>
          </Box>
        ) : (
          <List>
            {units.map((unit) => (
              <ListItem
                key={unit.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/admin/unit-edit?id=${encodeURIComponent(unit.id)}`)}
                  >
                    수정
                  </Button>
                }
              >
                <ListItemText
                  primary={`Unit ${unit.id} — ${unit.title}`}
                  secondary={`주제: ${unit.theme}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
