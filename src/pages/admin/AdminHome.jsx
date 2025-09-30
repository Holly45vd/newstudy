// src/pages/admin/AdminHome.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchUnits } from "../../firebase/firebaseFirestore";
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function AdminHome() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const data = await fetchUnits();
        setUnits(data);
      } catch (error) {
        console.error("유닛 불러오기 오류:", error);
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
        유닛 데이터를 관리하고 JSON을 업데이트할 수 있습니다.
      </Typography>

      {/* 새 유닛 등록 */}
      <Box my={3} textAlign="right">
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/admin/unit-edit")}
        >
          새 유닛 등록
        </Button>
      </Box>

      {/* 유닛 목록 */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
          현재 저장된 유닛
        </Typography>
        {loading ? (
          <Box textAlign="center" py={3}>
            <CircularProgress />
          </Box>
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
                    onClick={() => navigate(`/admin/unit-edit?id=${unit.id}`)}
                  >
                    수정
                  </Button>
                }
              >
                <ListItemText
                  primary={`Unit ${unit.id} — ${unit.title || "제목 없음"}`}
                  secondary={`주제: ${unit.theme || "주제 없음"}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* JSON 관리 버튼 */}
      <Typography variant="h6" gutterBottom>
        JSON 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        각 파트를 선택해 JSON 데이터를 개별 저장/수정합니다.
      </Typography>
      <Grid container spacing={2}>
        {[
          { name: "단어 관리", path: "/admin/vocabulary-edit", color: "purple" },
          { name: "문법 관리", path: "/admin/grammar-edit", color: "green" },
          { name: "대표 문장 관리", path: "/admin/sentence-edit", color: "blue" },
          { name: "회화 관리", path: "/admin/conversation-edit", color: "orange" },
          { name: "연습 문제 관리", path: "/admin/practice-edit", color: "red" },
          { name: "요약 관리", path: "/admin/summary-edit", color: "grey" },
        ].map((item, idx) => (
          <Grid item xs={6} sm={4} key={idx}>
            <Button
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: item.color,
                "&:hover": { backgroundColor: `${item.color}.dark` },
              }}
              onClick={() => navigate(item.path)}
            >
              {item.name}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
