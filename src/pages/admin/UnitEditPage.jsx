// src/pages/admin/UnitEditPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  addUnit,
  updateUnit,
  fetchUnitById,
} from "../../firebase/firebaseFirestore";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  IconButton,
  Grid,
  Snackbar,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function UnitEditPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("id"); // 수정 모드 여부

  // === 기본 정보 ===
  const [unitId, setUnitId] = useState(2);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [goals, setGoals] = useState([""]);

  // === 상세 항목 ===
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [practice, setPractice] = useState([]);
  const [summary, setSummary] = useState({ vocabulary: [], grammar: [] });

  // === JSON 입력용 ===
  const [jsonInput, setJsonInput] = useState("");

  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // === 수정 모드 데이터 로딩 ===
  useEffect(() => {
    if (editId) {
      const loadUnit = async () => {
        const unit = await fetchUnitById(editId);
        if (unit) {
          setUnitId(Number(unit.id));
          setTitle(unit.title || "");
          setTheme(unit.theme || "");
          setGoals(unit.goals || [""]);
          setVocabulary(unit.vocabulary || []);
          setGrammar(unit.grammar || []);
          setConversation(unit.conversation || []);
          setPractice(unit.practice || []);
          setSummary(unit.summary || { vocabulary: [], grammar: [] });
          setJsonInput(JSON.stringify(unit, null, 2));
        }
      };
      loadUnit();
    }
  }, [editId]);

  // =============================
  // 공통 핸들러
  // =============================
  const showMessage = (msg) => {
    setMessage(msg);
    setOpenSnackbar(true);
  };

  // 목표 추가/삭제
  const handleAddGoal = () => setGoals([...goals, ""]);
  const handleGoalChange = (index, value) => {
    const updated = [...goals];
    updated[index] = value;
    setGoals(updated);
  };
  const handleGoalDelete = (index) =>
    setGoals(goals.filter((_, i) => i !== index));

  // =============================
  // 단어 관리
  // =============================
  const addVocab = () =>
    setVocabulary([
      ...vocabulary,
      { hanzi: "", pinyin: "", pronunciation: "", meaning: "" },
    ]);

  const updateVocab = (index, field, value) => {
    const updated = [...vocabulary];
    updated[index][field] = value;
    setVocabulary(updated);
  };

  const deleteVocab = (index) =>
    setVocabulary(vocabulary.filter((_, i) => i !== index));

  // =============================
  // 문법 관리
  // =============================
  const addGrammar = () =>
    setGrammar([
      ...grammar,
      {
        rule: "",
        description: "",
        example: { chinese: "", pinyin: "", pronunciation: "", meaning: "" },
      },
    ]);

  const updateGrammar = (index, field, value) => {
    const updated = [...grammar];
    updated[index][field] = value;
    setGrammar(updated);
  };

  const updateGrammarExample = (index, field, value) => {
    const updated = [...grammar];
    updated[index].example[field] = value;
    setGrammar(updated);
  };

  const deleteGrammar = (index) =>
    setGrammar(grammar.filter((_, i) => i !== index));

  // =============================
  // 대화 관리
  // =============================
  const addConversation = () =>
    setConversation([
      ...conversation,
      { speaker: "A", chinese: "", pinyin: "", pronunciation: "", meaning: "" },
    ]);

  const updateConversation = (index, field, value) => {
    const updated = [...conversation];
    updated[index][field] = value;
    setConversation(updated);
  };

  const deleteConversation = (index) =>
    setConversation(conversation.filter((_, i) => i !== index));

  // =============================
  // 연습문제 관리
  // =============================
  const addPractice = () =>
    setPractice([...practice, { question: "", options: [], answer: "" }]);

  const updatePractice = (index, field, value) => {
    const updated = [...practice];
    if (field === "options") {
      updated[index].options = value.split(",");
    } else {
      updated[index][field] = value;
    }
    setPractice(updated);
  };

  const deletePractice = (index) =>
    setPractice(practice.filter((_, i) => i !== index));

  // =============================
  // 요약 관리
  // =============================
  const addSummaryWord = () =>
    setSummary({ ...summary, vocabulary: [...summary.vocabulary, ""] });

  const updateSummaryWord = (index, value) => {
    const updated = [...summary.vocabulary];
    updated[index] = value;
    setSummary({ ...summary, vocabulary: updated });
  };

  const deleteSummaryWord = (index) => {
    const updated = summary.vocabulary.filter((_, i) => i !== index);
    setSummary({ ...summary, vocabulary: updated });
  };

  const addSummaryGrammar = () =>
    setSummary({ ...summary, grammar: [...summary.grammar, ""] });

  const updateSummaryGrammar = (index, value) => {
    const updated = [...summary.grammar];
    updated[index] = value;
    setSummary({ ...summary, grammar: updated });
  };

  const deleteSummaryGrammar = (index) => {
    const updated = summary.grammar.filter((_, i) => i !== index);
    setSummary({ ...summary, grammar: updated });
  };

  // =============================
  // 저장 핸들러
  // =============================
  const handleFormSave = async () => {
    const data = {
      id: unitId.toString(),
      title,
      theme,
      goals,
      vocabulary,
      grammar,
      conversation,
      practice,
      summary,
    };

    try {
      if (editId) {
        await updateUnit(editId, data);
        showMessage(`Unit ${editId} 수정 성공!`);
      } else {
        await addUnit(unitId, data);
        showMessage(`Unit ${unitId} 등록 성공!`);
      }
    } catch (error) {
      console.error(error);
      showMessage("Form 저장 실패. 콘솔을 확인해주세요.");
    }
  };

  const handleJsonSave = async () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      if (editId) {
        await updateUnit(editId, parsedData);
        showMessage(`Unit ${editId} JSON 수정 성공!`);
      } else {
        await addUnit(unitId, parsedData);
        showMessage(`Unit ${unitId} JSON 등록 성공!`);
      }
    } catch (error) {
      console.error(error);
      showMessage("JSON 저장 실패. JSON 형식을 확인해주세요.");
    }
  };

  // =============================
  // UI 렌더링
  // =============================
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {editId ? `유닛 수정 (Unit ${editId})` : "새 유닛 등록"}
      </Typography>

      {/* === 기본 정보 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">기본 정보</Typography>
        <TextField
          label="유닛 번호"
          type="number"
          value={unitId}
          onChange={(e) => setUnitId(Number(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
          disabled={!!editId}
        />
        <TextField
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="주제"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Typography fontWeight="bold">학습 목표</Typography>
        {goals.map((goal, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField
              fullWidth
              value={goal}
              onChange={(e) => handleGoalChange(i, e.target.value)}
            />
            <IconButton onClick={() => handleGoalDelete(i)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={handleAddGoal}>+ 목표 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 단어 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">단어 관리</Typography>
        {vocabulary.map((v, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={3}>
              <TextField
                label="한자"
                value={v.hanzi}
                onChange={(e) => updateVocab(i, "hanzi", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Pinyin"
                value={v.pinyin}
                onChange={(e) => updateVocab(i, "pinyin", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="발음"
                value={v.pronunciation}
                onChange={(e) => updateVocab(i, "pronunciation", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="뜻"
                value={v.meaning}
                onChange={(e) => updateVocab(i, "meaning", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={1}>
              <IconButton onClick={() => deleteVocab(i)} color="error">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button onClick={addVocab}>+ 단어 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 문법 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">문법 관리</Typography>
        {grammar.map((g, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <TextField
              label="문법 규칙"
              value={g.rule}
              onChange={(e) => updateGrammar(i, "rule", e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="설명"
              value={g.description}
              onChange={(e) => updateGrammar(i, "description", e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <Grid container spacing={1}>
              {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
                <Grid item xs={3} key={field}>
                  <TextField
                    label={field}
                    value={g.example[field]}
                    onChange={(e) =>
                      updateGrammarExample(i, field, e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
              ))}
            </Grid>
            <IconButton onClick={() => deleteGrammar(i)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={addGrammar}>+ 문법 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 대화 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">대화 관리</Typography>
        {conversation.map((c, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={1}>
              <TextField
                label="화자"
                value={c.speaker}
                onChange={(e) => updateConversation(i, "speaker", e.target.value)}
                fullWidth
              />
            </Grid>
            {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
              <Grid item xs={2} key={field}>
                <TextField
                  label={field}
                  value={c[field]}
                  onChange={(e) => updateConversation(i, field, e.target.value)}
                  fullWidth
                />
              </Grid>
            ))}
            <Grid item xs={1}>
              <IconButton onClick={() => deleteConversation(i)} color="error">
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
        <Button onClick={addConversation}>+ 대화 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 연습 문제 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">연습 문제 관리</Typography>
        {practice.map((p, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <TextField
              label="문제"
              value={p.question}
              onChange={(e) => updatePractice(i, "question", e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="옵션 (쉼표로 구분)"
              value={p.options.join(",")}
              onChange={(e) => updatePractice(i, "options", e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="정답"
              value={p.answer}
              onChange={(e) => updatePractice(i, "answer", e.target.value)}
              fullWidth
            />
            <IconButton onClick={() => deletePractice(i)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={addPractice}>+ 문제 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 요약 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">요약 관리</Typography>
        <Typography fontWeight="bold">핵심 단어</Typography>
        {summary.vocabulary.map((word, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField
              fullWidth
              value={word}
              onChange={(e) => updateSummaryWord(i, e.target.value)}
            />
            <IconButton onClick={() => deleteSummaryWord(i)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={addSummaryWord}>+ 단어 추가</Button>

        <Typography fontWeight="bold" sx={{ mt: 3 }}>
          핵심 문법
        </Typography>
        {summary.grammar.map((g, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField
              fullWidth
              value={g}
              onChange={(e) => updateSummaryGrammar(i, e.target.value)}
            />
            <IconButton onClick={() => deleteSummaryGrammar(i)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={addSummaryGrammar}>+ 문법 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 저장 버튼 === */}
      <Box textAlign="right">
        <Button variant="contained" color="primary" onClick={handleFormSave}>
          저장
        </Button>
      </Box>

      {/* === JSON 관리 === */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6">JSON 직접 편집</Typography>
        <TextField
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          fullWidth
          multiline
          rows={12}
          sx={{ fontFamily: "monospace", mb: 2 }}
          placeholder='{"title": "유닛2", "theme": "기본 인사"}'
        />
        <Box textAlign="right">
          <Button variant="contained" color="secondary" onClick={handleJsonSave}>
            JSON 저장
          </Button>
        </Box>
      </Paper>

      {/* === Snackbar === */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        message={message}
        onClose={() => setOpenSnackbar(false)}
      />
    </Container>
  );
}
