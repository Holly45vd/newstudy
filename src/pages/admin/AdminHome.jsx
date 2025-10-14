// src/pages/admin/AdminHome.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { darken } from "@mui/material/styles";

export default function AdminHome() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const data = await fetchUnits();

        // ✅ 어떤 형태로 와도 배열로 정규화
        const arr = Array.isArray(data)
          ? data
          : data && typeof data === "object"
          ? Object.values(data)
          : [];

        // ✅ id/title/theme 방어
        const normalized = arr
          .filter(Boolean)
          .map((u, idx) => ({
            id: (u.id ?? u.docId ?? String(idx)).toString(),
            title: u.title ?? "제목 없음",
            theme: u.theme ?? "주제 없음",
          }));

        setUnits(normalized);
      } catch (error) {
        console.error("유닛 불러오기 오류:", error);
        setUnits([]); // 실패 시에도 안전하게 빈 배열
      } finally {
        setLoading(false);
      }
    };
    loadUnits();
  }, []);

  // JSON 관리 버튼 팔레트 (MUI 팔레트 기반으로 안전하게)
  const adminActions = useMemo(
    () => [
      { name: "단어 관리", path: "/admin/vocabulary-edit", color: "secondary" },
      { name: "문법 관리", path: "/admin/grammar-edit", color: "success" },
      { name: "대표 문장 관리", path: "/admin/sentence-edit", color: "info" },
      { name: "회화 관리", path: "/admin/conversation-edit", color: "warning" },
      { name: "연습 문제 관리", path: "/admin/practice-edit", color: "error" },
      { name: "요약 관리", path: "/admin/summary-edit", color: "inherit" },
    ],
    []
  );

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

            <Paper elevation={3} sx={{ mb: 4 }}>
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

      {/* JSON 관리 버튼 */}
      <Typography variant="h6" gutterBottom>
        JSON 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        각 파트를 선택해 JSON 데이터를 개별 저장/수정합니다.
      </Typography>

      <Grid container spacing={2}>
        {adminActions.map((item, idx) => (
          <Grid item xs={6} sm={4} key={idx}>
            <Button
              fullWidth
              variant="contained"
              color={
                ["inherit", "primary", "secondary", "success", "error", "info", "warning"].includes(
                  item.color
                )
                  ? item.color
                  : "primary"
              }
              sx={(theme) => ({
                // 색상 커스터마이즈가 필요하면 여기서 안전하게 다룸
                ...(item.color === "inherit" && {
                  backgroundColor: theme.palette.grey[700],
                  "&:hover": { backgroundColor: darken(theme.palette.grey[700], 0.2) },
                }),
              })}
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
