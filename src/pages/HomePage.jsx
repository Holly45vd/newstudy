// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Skeleton,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Navbar from "../components/Navbar";

function UnitCard({ unit, onClick }) {
  const idNum = Number(unit.id);
  const Icon = idNum <= 10 ? SchoolIcon : MenuBookIcon;

  return (
    <Card
      elevation={3}
      sx={{
        borderRadius: 3,
        transition: "transform .18s ease, box-shadow .18s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ textAlign: "center", py: 3 }}>
          <Icon color={idNum <= 10 ? "primary" : "secondary"} sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6" fontWeight={700} noWrap>
            {unit.title || `유닛 ${unit.id}`}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
            noWrap
            title={unit.theme}
          >
            {unit.theme || "주제 없음"}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function UnitSkeleton() {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ textAlign: "center", py: 3 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mx: "auto", mb: 1 }} />
        <Skeleton width="70%" sx={{ mx: "auto" }} />
        <Skeleton width="50%" sx={{ mx: "auto", mt: 1 }} />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const snap = await getDocs(collection(db, "units"));
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // 숫자형 정렬(문자 id에도 안전)
        const sorted = data.sort((a, b) => {
          const ax = Number(a.id);
          const bx = Number(b.id);
          if (Number.isNaN(ax) || Number.isNaN(bx)) {
            return String(a.id).localeCompare(String(b.id), "ko");
          }
          return ax - bx;
        });

        setUnits(sorted);
      } catch (e) {
        console.error("유닛 불러오기 오류:", e);
        setErr("유닛 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchUnits();
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return units;
    return units.filter((u) => {
      const t1 = String(u.title || `유닛 ${u.id}`).toLowerCase();
      const t2 = String(u.theme || "").toLowerCase();
      return t1.includes(keyword) || t2.includes(keyword) || String(u.id).includes(keyword);
    });
  }, [q, units]);

  return (
    <>
      <Navbar />
      {/* AppBar 보정 마진 */}
      <Box sx={{ mt: 10 }}>
        <Container maxWidth="lg" sx={{ py: 5 }}>
          {/* 헤더 */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" component="h1" fontWeight={800}>
              중국어 학습 유닛
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              2번부터 21번까지 순차 학습 · 단어 · 문법 · 회화 · 연습문제
            </Typography>
          </Box>

          {/* 검색 */}
          <Box sx={{ maxWidth: 460, mx: "auto", mb: 4 }}>
            <TextField
              fullWidth
              size="medium"
              placeholder="유닛 번호/제목/주제로 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* 에러 */}
          {err && (
            <Box sx={{ maxWidth: 640, mx: "auto", mb: 3 }}>
              <Alert severity="error">{err}</Alert>
            </Box>
          )}

          {/* 그리드 */}
          <Grid container spacing={3}>
            {loading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} key={`sk-${i}`}>
                    <UnitSkeleton />
                  </Grid>
                ))
              : filtered.length > 0
              ? filtered.map((unit) => (
                  <Grid item xs={12} sm={6} md={4} key={unit.id}>
                    <UnitCard unit={unit} onClick={() => navigate(`/units/${unit.id}`)} />
                  </Grid>
                ))
              : (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <Typography variant="h6" fontWeight={700}>
                      검색 결과가 없습니다
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      다른 키워드로 다시 시도해 보세요.
                    </Typography>
                  </Box>
                </Grid>
              )}
          </Grid>
        </Container>
      </Box>
    </>
  );
}
