// src/pages/admin/ConversationEdit.jsx
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
  Select,
  MenuItem,
  IconButton,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function ConversationEdit() {
  const { id } = useParams();
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversation = async () => {
      const docRef = doc(db, "units", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConversation(docSnap.data().conversation || []);
      }
      setLoading(false);
    };
    fetchConversation();
  }, [id]);

  const handleChange = (index, field, value) => {
    const updated = [...conversation];
    updated[index][field] = value;
    setConversation(updated);
  };

  const handleAdd = () => {
    setConversation([
      ...conversation,
      { speaker: "A", chinese: "", pinyin: "", pronunciation: "", meaning: "" },
    ]);
  };

  const handleDelete = (index) => {
    setConversation(conversation.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const docRef = doc(db, "units", id);
    await updateDoc(docRef, { conversation });
    alert("회화가 업데이트되었습니다!");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <Container maxWidth="md">
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        회화 관리 (Unit {id})
      </Typography>
      <Paper sx={{ p: 2 }}>
        {conversation.map((item, index) => (
          <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 2 }}>
            <Grid item xs={1}>
              <Select
                value={item.speaker}
                onChange={(e) => handleChange(index, "speaker", e.target.value)}
                fullWidth
              >
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
              </Select>
            </Grid>
            {["chinese", "pinyin", "pronunciation", "meaning"].map((field, idx) => (
              <Grid item xs={2.5} key={idx}>
                <TextField
                  label={field}
                  value={item[field]}
                  onChange={(e) => handleChange(index, field, e.target.value)}
                  fullWidth
                />
              </Grid>
            ))}
            <Grid item xs={1}>
              <IconButton color="error" onClick={() => handleDelete(index)}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Box display="flex" justifyContent="space-between">
          <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAdd}>
            대화 추가
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
            저장
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
