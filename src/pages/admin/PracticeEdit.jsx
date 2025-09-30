// src/pages/admin/PracticeEdit.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function PracticeEdit() {
  const { id } = useParams();
  const [practice, setPractice] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPractice = async () => {
      const docRef = doc(db, "units", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPractice(docSnap.data().practice || []);
      }
      setLoading(false);
    };
    fetchPractice();
  }, [id]);

  const handleChange = (index, field, value) => {
    const updated = [...practice];
    updated[index][field] = value;
    setPractice(updated);
  };

  const handleOptionsChange = (index, value) => {
    const updated = [...practice];
    updated[index].options = value.split(",");
    setPractice(updated);
  };

  const handleAdd = () => {
    setPractice([...practice, { question: "", options: [], answer: "" }]);
  };

  const handleDelete = (index) => {
    setPractice(practice.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const docRef = doc(db, "units", id);
    await updateDoc(docRef, { practice });
    alert("연습문제가 업데이트되었습니다!");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <Container maxWidth="md">
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        연습문제 관리 (Unit {id})
      </Typography>
      <Paper sx={{ p: 2 }}>
        {practice.map((item, index) => (
          <Box key={index} mb={3}>
            <TextField
              label="문제"
              value={item.question}
              onChange={(e) => handleChange(index, "question", e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="옵션 (쉼표로 구분)"
              value={item.options.join(",")}
              onChange={(e) => handleOptionsChange(index, e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="정답"
              value={item.answer}
              onChange={(e) => handleChange(index, "answer", e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <IconButton color="error" onClick={() => handleDelete(index)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}

        <Box display="flex" justifyContent="space-between">
          <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAdd}>
            문제 추가
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
            저장
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
