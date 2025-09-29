import React, { useEffect, useState } from "react";
import { useParams, Outlet } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import UnitTabs from "../components/tabs/UnitTabs";

export default function UnitDetailPage() {
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
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* 상단 고정 탭 */}
      <UnitTabs />

      {/* === 본문 === */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {unit.title || `유닛 ${id}`}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {unit.theme || "주제 없음"}
          </Typography>

          <Box mt={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              학습 목표
            </Typography>
            <List dense>
              {unit.goals?.map((goal, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemText primary={`• ${goal}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>

        {/* 하위 페이지 */}
        <Outlet />
      </Container>
    </Box>
  );
}
