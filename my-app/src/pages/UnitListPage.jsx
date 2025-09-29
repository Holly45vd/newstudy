// src/pages/UnitListPage.jsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";

export default function  UnitListPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "units"));

        // Firestore 데이터 가져오기
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 유닛 번호 순으로 정렬 (문자열 → 숫자 변환 후 오름차순)
        const sortedData = data.sort((a, b) => Number(a.id) - Number(b.id));

        setUnits(sortedData);
      } catch (error) {
        console.error("유닛 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );
  } 

  return (
     <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* 타이틀 */}
      <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
        중국어 학습 유닛
      </Typography>
      <Typography variant="subtitle1" align="center" color="text.secondary" mb={4}>
        2번부터 21번까지 순서대로 학습하며 단어, 문법, 회화, 연습문제를 익히세요.
      </Typography>

      {/* 유닛 카드 목록 */}
      <Grid container spacing={3}>
        {units.map((unit) => (
          <Grid item xs={12} sm={6} md={4} key={unit.id}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                transition: "transform 0.2s ease",
                "&:hover": { transform: "translateY(-5px)" },
              }}
            >
              <CardActionArea onClick={() => navigate(`/units/${unit.id}`)}>
                <CardContent sx={{ textAlign: "center" }}>
                  {/* 아이콘 */}
                  {Number(unit.id) <= 10 ? (
                    <SchoolIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  ) : (
                    <MenuBookIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  )}

                  {/* 유닛 제목 */}
                  <Typography variant="h6" fontWeight="bold">
                    {unit.title || `유닛 ${unit.id}`}
                  </Typography>

                  {/* 주제 설명 */}
                  <Typography variant="body2" color="text.secondary">
                    {unit.theme || "주제 없음"}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
