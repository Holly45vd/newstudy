// src/components/Navbar.jsx
import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" color="primary" elevation={3}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* 왼쪽 로고 */}
        <Typography
          variant="h6"
          onClick={() => navigate("/")}
          sx={{ cursor: "pointer", fontWeight: "bold" }}
        >
          StudyNote
        </Typography>

        {/* 중앙 메뉴 */}
        <Box>
          <Button color="inherit" onClick={() => navigate("/")}>
            홈
          </Button>
          <Button color="inherit" onClick={() => navigate("/units")}>
            유닛
          </Button>
        </Box>

        {/* 오른쪽 관리자 버튼 */}
        <Button
          variant="contained"
          color="secondary"
          sx={{
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: 2,
          }}
          onClick={() => navigate("/admin")}
        >
          관리자
        </Button>
      </Toolbar>
    </AppBar>
  );
}
