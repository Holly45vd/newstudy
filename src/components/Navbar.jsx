// src/components/Navbar.jsx
import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      elevation={2}
      sx={{
        backgroundColor: "#ffffff",
        color: "#333",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* 왼쪽 로고 */}
        <Typography
          variant="h6"
          onClick={() => navigate("/")}
          sx={{
            cursor: "pointer",
            fontWeight: "bold",
            letterSpacing: 0.5,
            color: "#673ab7", // 보라색 포인트
          }}
        >
          *
        </Typography>

        {/* 중앙 메뉴 */}
        <Box>
          <Button
            sx={{
              color: "#555",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": { color: "#673ab7" },
            }}
            onClick={() => navigate("/")}
          >
            홈
          </Button>
          <Button
            sx={{
              color: "#555",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": { color: "#673ab7" },
            }}
            onClick={() => navigate("/pronunciation")}
          >
            발음
          </Button>
                    <Button
            sx={{
              color: "#555",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": { color: "#673ab7" },
            }}
            onClick={() => navigate("/everyday")}
          >
            매일
          </Button>
        </Box>

        {/* 오른쪽 관리자 버튼 */}
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#673ab7",
            color: "#fff",
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: 2,
            "&:hover": { backgroundColor: "#5e35b1" },
          }}
          onClick={() => navigate("/admin")}
        >
          관리자
        </Button>
      </Toolbar>
    </AppBar>
  );
}
