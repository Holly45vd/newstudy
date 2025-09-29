// src/pages/admin/VocabularyEdit.jsx
import React, { useState, useEffect } from "react";
import { fetchUnits, updateUnit } from "../../firebase/firebaseFirestore";
import {
  Container,
  Typography,
  Button,
  TextField,
  Grid,
  Box,
  Paper,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function VocabularyEdit() {
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [vocabList, setVocabList] = useState([]);

  // Firestore에서 유닛 데이터 가져오기
  useEffect(() => {
    const loadUnits = async () => {
      const data = await fetchUnits();
      setUnits(data);
    };
    loadUnits();
  }, []);

  // 유닛 선택 시 해당 유닛의 vocabulary 불러오기
  const handleUnitChange = (e) => {
    const unitId = e.target.value;

    // 타입을 문자열로 통일해서 비교
    const unit = units.find((u) => String(u.id) === String(unitId));

    if (!unit) {
      setSelectedUnit(null);
      setVocabList([]);
      return;
    }

    setSelectedUnit(unit);
    setVocabList(unit.vocabulary || []);
  };

  // 단어 입력 변경
  const handleVocabChange = (index, field, value) => {
    const updated = [...vocabList];
    updated[index][field] = value;
    setVocabList(updated);
  };

  // 단어 추가
  const handleAdd = () => {
    setVocabList([
      ...vocabList,
      { hanzi: "", pinyin: "", pronunciation: "", meaning: "" },
    ]);
  };

  // 단어 삭제
  const handleDelete = (index) => {
    setVocabList(vocabList.filter((_, i) => i !== index));
  };

  // Firestore 저장
  const handleSave = async () => {
    if (!selectedUnit) return alert("유닛을 선택하세요!");

    try {
      // Firestore의 문서 ID는 문자열로 저장
      await updateUnit(selectedUnit.id.toString(), { vocabulary: vocabList });
      alert("단어 데이터가 저장되었습니다!");
    } catch (error) {
      console.error("저장 중 오류:", error);
      alert("저장 중 오류 발생!");
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        단어 관리
      </Typography>

      {/* === 유닛 선택 === */}
      <TextField
        select
        label="유닛 선택"
        fullWidth
        SelectProps={{ native: true }}
        onChange={handleUnitChange}
        sx={{ mb: 3 }}
      >
        <option value="">유닛을 선택하세요</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            Unit {unit.id} — {unit.title}
          </option>
        ))}
      </TextField>

      {/* === 단어 수정 UI === */}
      {selectedUnit && (
        <Paper elevation={2} sx={{ p: 2 }}>
          {vocabList.map((vocab, index) => (
            <Grid
              container
              spacing={2}
              alignItems="center"
              key={index}
              sx={{ mb: 2 }}
            >
              <Grid item xs={3}>
                <TextField
                  label="한자"
                  value={vocab.hanzi}
                  onChange={(e) =>
                    handleVocabChange(index, "hanzi", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Pinyin"
                  value={vocab.pinyin}
                  onChange={(e) =>
                    handleVocabChange(index, "pinyin", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="발음"
                  value={vocab.pronunciation}
                  onChange={(e) =>
                    handleVocabChange(index, "pronunciation", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="뜻"
                  value={vocab.meaning}
                  onChange={(e) =>
                    handleVocabChange(index, "meaning", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item>
                <IconButton color="error" onClick={() => handleDelete(index)}>
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          {/* === 단어 추가 & 저장 버튼 === */}
          <Box display="flex" justifyContent="space-between" mt={2}>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAdd}
              color="primary"
            >
              단어 추가
            </Button>
            <Button variant="contained" color="secondary" onClick={handleSave}>
              저장
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
