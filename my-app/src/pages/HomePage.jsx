// src/pages/HomePage.jsx
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
import Navbar from "../components/Navbar";

export default function HomePage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Firestore 데이터 불러오기
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "units"));

        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 유닛 번호 기준으로 오름차순 정렬
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

  // 로딩 중일 때 스피너 표시
  if (loading) {
    return (
      <>
        <Navbar />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="60vh"
        >
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      {/* === 상단 고정 네비게이션 === */}
      <Navbar />

      {/* === 본문 === */}
      <Box sx={{ mt: 10 }}> {/* AppBar 높이만큼 자동 여백 */}
        <Container maxWidth="lg" sx={{ py: 5 }}>
          {/* 타이틀 */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            fontWeight="bold"
          >
            중국어 학습 유닛
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            color="text.secondary"
            mb={4}
          >
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
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/units/${unit.id}`)}>
                    <CardContent sx={{ textAlign: "center", py: 3 }}>
                      {/* 아이콘 */}
                      {Number(unit.id) <= 10 ? (
                        <SchoolIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      ) : (
                        <MenuBookIcon
                          color="secondary"
                          sx={{ fontSize: 40, mb: 1 }}
                        />
                      )}

                      {/* 유닛 제목 */}
                      <Typography variant="h6" fontWeight="bold">
                        {unit.title || `유닛 ${unit.id}`}
                      </Typography>

                      {/* 주제 설명 */}
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        {unit.theme || "주제 없음"}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}
