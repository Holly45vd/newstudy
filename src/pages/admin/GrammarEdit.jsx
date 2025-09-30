// src/pages/admin/GrammarEdit.jsx
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
  Grid,
  IconButton,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function GrammarEdit() {
  const { id } = useParams();
  const [grammarList, setGrammarList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrammar = async () => {
      const docRef = doc(db, "units", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGrammarList(docSnap.data().grammar || []);
      }
      setLoading(false);
    };
    fetchGrammar();
  }, [id]);

  const handleChange = (index, field, value) => {
    const updated = [...grammarList];
    updated[index][field] = value;
    setGrammarList(updated);
  };

  const handleExampleChange = (index, field, value) => {
    const updated = [...grammarList];
    updated[index].example[field] = value;
    setGrammarList(updated);
  };

  const handleAdd = () => {
    setGrammarList([
      ...grammarList,
      {
        rule: "",
        description: "",
        example: { chinese: "", pinyin: "", pronunciation: "", meaning: "" },
      },
    ]);
  };

  const handleDelete = (index) => {
    setGrammarList(grammarList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const docRef = doc(db, "units", id);
    await updateDoc(docRef, { grammar: grammarList });
    alert("문법이 업데이트되었습니다!");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <Container maxWidth="md">
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        문법 관리 (Unit {id})
      </Typography>
      <Paper sx={{ p: 2 }}>
        {grammarList.map((item, index) => (
          <Box key={index} mb={3}>
            <TextField
              label="문법 규칙"
              value={item.rule}
              onChange={(e) => handleChange(index, "rule", e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="설명"
              value={item.description}
              onChange={(e) => handleChange(index, "description", e.target.value)}
              fullWidth
              multiline
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
                <Grid item xs={3} key={field}>
                  <TextField
                    label={field}
                    value={item.example[field]}
                    onChange={(e) => handleExampleChange(index, field, e.target.value)}
                    fullWidth
                  />
                </Grid>
              ))}
            </Grid>
            <Box textAlign="right" mt={1}>
              <IconButton color="error" onClick={() => handleDelete(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        ))}

        <Box display="flex" justifyContent="space-between">
          <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAdd}>
            문법 추가
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
            저장
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
