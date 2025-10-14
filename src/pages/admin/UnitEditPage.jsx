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
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const toTagsString = (tags) => (Array.isArray(tags) ? tags.join(",") : (tags || ""));
const toTagsArray = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function UnitEditPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("id");

  // === 기본 정보 ===
  const [unitId, setUnitId] = useState(2);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [goals, setGoals] = useState([""]);          // 기존 필드
  const [objectives, setObjectives] = useState([]);  // 새 필드(있으면 동기화)

  // === 상세 항목 ===
  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [practice, setPractice] = useState([]); // 배열(레거시) 또는 객체(신규)
  const [summary, setSummary] = useState({ vocabulary: [], grammar: [] });

  // === JSON 입력용 ===
  const [jsonInput, setJsonInput] = useState("");
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // === 수정 모드 로딩 ===
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const unit = await fetchUnitById(editId);
      if (!unit) return;

      setUnitId(Number(unit.id ?? editId));
      setTitle(unit.title || "");
      setTheme(unit.theme || "");

      // goals/objectives 동기화(있으면 둘 다 채움)
      const g = toArray(unit.goals);
      const o = toArray(unit.objectives);
      setGoals(g.length ? g : o.length ? o : [""]);
      setObjectives(o.length ? o : g);

      setVocabulary(unit.vocabulary || []);
      setGrammar(unit.grammar || []);
      setConversation(unit.conversation || []);
      setPractice(unit.practice ?? []); // 배열 또는 객체
      setSummary(unit.summary || { vocabulary: [], grammar: [] });
      setJsonInput(JSON.stringify(unit, null, 2));
    })();
  }, [editId]);

  const showMessage = (msg) => {
    setMessage(msg);
    setOpenSnackbar(true);
  };

  // =============================
  // 목표 관리(goals/objectives 동시)
  // =============================
  const handleAddGoal = () => {
    const next = [...goals, ""];
    setGoals(next);
    setObjectives(next);
  };
  const handleGoalChange = (index, value) => {
    const updated = [...goals];
    updated[index] = value;
    setGoals(updated);
    setObjectives(updated);
  };
  const handleGoalDelete = (index) => {
    const updated = goals.filter((_, i) => i !== index);
    setGoals(updated);
    setObjectives(updated);
  };

  // =============================
  // 단어 관리 (pos/tags 추가)
  // =============================
  const addVocab = () =>
    setVocabulary([
      ...vocabulary,
      { hanzi: "", pinyin: "", pronunciation: "", meaning: "", pos: "", tags: [] },
    ]);

  const updateVocab = (index, field, value) => {
    const updated = [...vocabulary];
    if (field === "tags") {
      updated[index].tags = toTagsArray(value);
    } else {
      updated[index][field] = value;
    }
    setVocabulary(updated);
  };

  const deleteVocab = (index) =>
    setVocabulary(vocabulary.filter((_, i) => i !== index));

  // =============================
  // 문법 관리 (구형/신형 토글)
  // =============================
  useEffect(() => {
    setGrammar((prev) =>
      (prev || []).map((g) => ({
        ...g,
        __mode:
          g.title || g.summary || g.notes || g.examples ? "new" : "old",
      }))
    );
    // eslint-disable-next-line
  }, []);

  const addGrammar = () =>
    setGrammar([
      ...grammar,
      {
        // old 기본
        rule: "",
        description: "",
        example: { chinese: "", pinyin: "", pronunciation: "", meaning: "" },
        // new 기본
        title: "",
        summary: "",
        notes: [],
        examples: [],
        __mode: "new",
      },
    ]);

  const toggleGrammarMode = (index) => {
    const updated = [...grammar];
    updated[index].__mode = updated[index].__mode === "new" ? "old" : "new";
    setGrammar(updated);
  };

  const updateGrammar = (index, field, value) => {
    const updated = [...grammar];
    updated[index][field] = value;
    setGrammar(updated);
  };

  const updateGrammarExample = (index, field, value) => {
    const updated = [...grammar];
    updated[index].example = updated[index].example || {
      chinese: "",
      pinyin: "",
      pronunciation: "",
      meaning: "",
    };
    updated[index].example[field] = value;
    setGrammar(updated);
  };

  const updateGrammarNotes = (index, value) => {
    const updated = [...grammar];
    updated[index].notes = toTagsArray(value);
    setGrammar(updated);
  };

  const addGrammarExampleNew = (index) => {
    const updated = [...grammar];
    updated[index].examples = updated[index].examples || [];
    updated[index].examples.push({ zh: "", py: "", ko: "", pronunciation: "" });
    setGrammar(updated);
  };

  const updateGrammarExampleNew = (gi, ei, field, value) => {
    const updated = [...grammar];
    updated[gi].examples[ei][field] = value;
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
  // 연습 문제 관리
  // (배열=레거시 MCQ / 객체=신규 reading+writing+reorder+extension_phrases+substitution)
  // =============================
  const isPracticeNew = practice && !Array.isArray(practice);

  // 레거시
  const addPracticeLegacy = () =>
    setPractice([...(practice || []), { question: "", options: [], answer: "" }]);

  const updatePracticeLegacy = (index, field, value) => {
    const updated = [...practice];
    if (field === "options") {
      updated[index].options = value.split(",").map((s) => s.trim());
    } else {
      updated[index][field] = value;
    }
    setPractice(updated);
  };

  const deletePracticeLegacy = (index) =>
    setPractice(practice.filter((_, i) => i !== index));

  // 신규 공통 ensure
  const ensurePracticeObj = () =>
    setPractice((p) =>
      Array.isArray(p)
        ? { reading: [], writing: [], reorder: [], extension_phrases: [], substitution: [] }
        : p || { reading: [], writing: [], reorder: [], extension_phrases: [], substitution: [] }
    );

  // 읽기
  const addReading = () => {
    ensurePracticeObj();
    setPractice((p) => ({ ...p, reading: [...(p.reading || []), { zh: "", ko: "" }] }));
  };
  const updateReading = (i, field, value) =>
    setPractice((p) => {
      const arr = [...(p.reading || [])];
      arr[i][field] = value;
      return { ...p, reading: arr };
    });
  const deleteReading = (i) =>
    setPractice((p) => ({ ...p, reading: (p.reading || []).filter((_, idx) => idx !== i) }));

  // 쓰기
  const addWriting = () => {
    ensurePracticeObj();
    setPractice((p) => ({
      ...p,
      writing: [...(p.writing || []), { prompt_ko: "", answer_zh: "" }],
    }));
  };
  const updateWriting = (i, field, value) =>
    setPractice((p) => {
      const arr = [...(p.writing || [])];
      arr[i][field] = value;
      return { ...p, writing: arr };
    });
  const deleteWriting = (i) =>
    setPractice((p) => ({ ...p, writing: (p.writing || []).filter((_, idx) => idx !== i) }));

  // 배열(문장 재배열)
  const addReorder = () => {
    ensurePracticeObj();
    setPractice((p) => ({
      ...p,
      reorder: [...(p.reorder || []), { items: [], answer: "", hint_ko: "" }],
    }));
  };
  const updateReorder = (i, field, value) =>
    setPractice((p) => {
      const arr = [...(p.reorder || [])];
      arr[i][field] = field === "items" ? value.split(",").map((s) => s.trim()) : value;
      return { ...p, reorder: arr };
    });
  const deleteReorder = (i) =>
    setPractice((p) => ({ ...p, reorder: (p.reorder || []).filter((_, idx) => idx !== i) }));

  // 확장 표현
  const addExt = () => {
    ensurePracticeObj();
    setPractice((p) => ({
      ...p,
      extension_phrases: [
        ...(p.extension_phrases || []),
        { zh: "", py: "", pron: "", ko: "" },
      ],
    }));
  };
  const updateExt = (i, field, value) =>
    setPractice((p) => {
      const arr = [...(p.extension_phrases || [])];
      arr[i][field] = value;
      return { ...p, extension_phrases: arr };
    });
  const deleteExt = (i) =>
    setPractice((p) => ({
      ...p,
      extension_phrases: (p.extension_phrases || []).filter((_, idx) => idx !== i),
    }));

  // ===== 교체연습(다중 슬롯) =====
  // 내부 표준화: { title, pattern, slots, items, pron_pattern, pron_dict[], meaning_pattern, meaning_dict[] }
  const normalizeSubPattern = (sp) => {
    if (!sp) return { title: "", pattern: "", slots: [], items: {}, pron_pattern: "", pron_dict: [], meaning_pattern: "", meaning_dict: [] };
    // 구형(단일 slot) 호환
    if (sp.slot && Array.isArray(sp.items)) {
      return {
        title: sp.title || "",
        pattern: sp.pattern || `{${sp.slot}}`,
        slots: [sp.slot],
        items: {
          [sp.slot]: sp.items.map((it) => ({
            hanzi: it.hanzi ?? it.zh ?? "",
            pinyin: it.pinyin ?? it.py ?? "",
            pron: it.pron ?? it.pronunciation ?? "",
            meaning: it.meaning ?? it.ko ?? "",
          })),
        },
        pron_pattern: sp.pron_pattern || "",
        pron_dict: Array.isArray(sp.pron_dict) ? sp.pron_dict : [],
        meaning_pattern: sp.meaning_pattern || "",
        meaning_dict: Array.isArray(sp.meaning_dict) ? sp.meaning_dict : [],
      };
    }
    // 신형
    const items = {};
    if (sp.items && typeof sp.items === "object") {
      Object.keys(sp.items).forEach((k) => {
        items[k] = (sp.items[k] || []).map((it) => ({
          hanzi: it.hanzi ?? it.zh ?? "",
          pinyin: it.pinyin ?? it.py ?? "",
          pron: it.pron ?? it.pronunciation ?? "",
          meaning: it.meaning ?? it.ko ?? "",
        }));
      });
    }
    return {
      title: sp.title || "",
      pattern: sp.pattern || "",
      slots: Array.isArray(sp.slots) ? sp.slots : [],
      items,
      pron_pattern: sp.pron_pattern || "",
      pron_dict: Array.isArray(sp.pron_dict) ? sp.pron_dict : [],
      meaning_pattern: sp.meaning_pattern || "",
      meaning_dict: Array.isArray(sp.meaning_dict) ? sp.meaning_dict : [],
    };
  };

  const addSubPattern = () => {
    ensurePracticeObj();
    setPractice((p) => ({
      ...p,
      substitution: [
        ...(p.substitution || []),
        { title: "", pattern: "", slots: [], items: {}, pron_pattern: "", pron_dict: [], meaning_pattern: "", meaning_dict: [] },
      ],
    }));
  };

  const updateSubField = (si, field, value) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      arr[si] = { ...normalizeSubPattern(arr[si]), [field]: value };
      return { ...p, substitution: arr };
    });

  const addSubSlot = (si) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      const newKey = `slot${(sp.slots?.length || 0) + 1}`;
      sp.slots = [...(sp.slots || []), newKey];
      sp.items = { ...(sp.items || {}), [newKey]: [] };
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const updateSubSlotName = (si, oldKey, newKey) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      const slots = sp.slots.map((s) => (s === oldKey ? newKey : s));
      const items = { ...sp.items };
      if (items[oldKey]) {
        items[newKey] = items[oldKey];
        delete items[oldKey];
      }
      arr[si] = { ...sp, slots, items };
      return { ...p, substitution: arr };
    });

  const deleteSubSlot = (si, key) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.slots = (sp.slots || []).filter((s) => s !== key);
      const items = { ...(sp.items || {}) };
      delete items[key];
      arr[si] = { ...sp, items };
      return { ...p, substitution: arr };
    });

  const addSubItem = (si, slotKey) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.items[slotKey] = [...(sp.items[slotKey] || []), { hanzi: "", pinyin: "", pron: "", meaning: "" }];
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const updateSubItem = (si, slotKey, ii, field, value) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      const list = [...(sp.items[slotKey] || [])];
      list[ii] = { ...list[ii], [field]: value };
      sp.items[slotKey] = list;
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const deleteSubItem = (si, slotKey, ii) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]); // ← 이전 오타 ] 제거
      sp.items[slotKey] = (sp.items[slotKey] || []).filter((_, idx) => idx !== ii);
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const deleteSubPattern = (si) =>
    setPractice((p) => ({
      ...p,
      substitution: (p.substitution || []).filter((_, idx) => idx !== si),
    }));

  // pron_dict (hanzi, pron)
  const addPronDict = (si) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.pron_dict = [...(sp.pron_dict || []), { hanzi: "", pron: "" }];
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const updatePronDict = (si, di, field, value) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      const list = [...(sp.pron_dict || [])];
      list[di] = { ...list[di], [field]: value };
      sp.pron_dict = list;
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const deletePronDict = (si, di) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.pron_dict = (sp.pron_dict || []).filter((_, idx) => idx !== di);
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  // meaning_dict (hanzi, ko)
  const addMeaningDict = (si) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.meaning_dict = [...(sp.meaning_dict || []), { hanzi: "", ko: "" }];
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const updateMeaningDict = (si, di, field, value) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      const list = [...(sp.meaning_dict || [])];
      list[di] = { ...list[di], [field]: value };
      sp.meaning_dict = list;
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  const deleteMeaningDict = (si, di) =>
    setPractice((p) => {
      const arr = [...(p.substitution || [])];
      const sp = normalizeSubPattern(arr[si]);
      sp.meaning_dict = (sp.meaning_dict || []).filter((_, idx) => idx !== di);
      arr[si] = sp;
      return { ...p, substitution: arr };
    });

  // =============================
  // 요약 관리
  // =============================
  const addSummaryWord = () =>
    setSummary({ ...summary, vocabulary: [...(summary.vocabulary || []), ""] });

  const updateSummaryWord = (index, value) => {
    const updated = [...(summary.vocabulary || [])];
    updated[index] = value;
    setSummary({ ...summary, vocabulary: updated });
  };

  const deleteSummaryWord = (index) => {
    const updated = (summary.vocabulary || []).filter((_, i) => i !== index);
    setSummary({ ...summary, vocabulary: updated });
  };

  const addSummaryGrammar = () =>
    setSummary({ ...summary, grammar: [...(summary.grammar || []), ""] });

  const updateSummaryGrammar = (index, value) => {
    const updated = [...(summary.grammar || [])];
    updated[index] = value;
    setSummary({ ...summary, grammar: updated });
  };

  const deleteSummaryGrammar = (index) => {
    const updated = (summary.grammar || []).filter((_, i) => i !== index);
    setSummary({ ...summary, grammar: updated });
  };

  // =============================
  // 저장
  // =============================
  const compact = (obj) => {
    if (Array.isArray(obj)) {
      return obj
        .map(compact)
        .filter(
          (v) =>
            !(
              v === "" ||
              v == null ||
              (typeof v === "object" && Object.keys(v).length === 0)
            )
        );
    } else if (obj && typeof obj === "object") {
      const out = {};
      Object.entries(obj).forEach(([k, v]) => {
        const cv = compact(v);
        const drop =
          cv === "" ||
          cv == null ||
          (typeof cv === "object" && !Array.isArray(cv) && Object.keys(cv).length === 0) ||
          (Array.isArray(cv) && cv.length === 0);
        if (!drop) out[k] = cv;
      });
      return out;
    }
    return obj;
  };

  const handleFormSave = async () => {
    // 문법 아이템별 old/new 정리
    const grammarOut = grammar.map((g) => {
      const mode = g.__mode || (g.title || g.summary || g.examples ? "new" : "old");
      if (mode === "new") {
        return compact({
          title: g.title || g.rule || "",
          summary: g.summary || g.description || "",
          notes: g.notes || [],
          examples: (g.examples || []).map((e) => ({
            zh: e.zh || e.chinese || "",
            py: e.py || e.pinyin || "",
            pronunciation: e.pronunciation || e.pron || "",
            ko: e.ko || e.meaning || "",
          })),
        });
      } else {
        return compact({
          rule: g.rule || g.title || "",
          description: g.description || g.summary || "",
          example: {
            chinese: g.example?.chinese || g.examples?.[0]?.zh || "",
            pinyin: g.example?.pinyin || g.examples?.[0]?.py || "",
            pronunciation:
              g.example?.pronunciation ||
              g.examples?.[0]?.pronunciation ||
              g.examples?.[0]?.pron ||
              "",
            meaning: g.example?.meaning || g.examples?.[0]?.ko || "",
          },
        });
      }
    });

    // 단어
    const vocabOut = (vocabulary || []).map((v) =>
      compact({
        hanzi: v.hanzi || "",
        pinyin: v.pinyin || "",
        pronunciation: v.pronunciation || "",
        meaning: v.meaning || "",
        pos: v.pos || "",
        tags: v.tags || [],
      })
    );

    // practice: 레거시 그대로, 신규는 각 섹션 포함 + substitution 포함
    const practiceOut = Array.isArray(practice)
      ? practice
      : compact({
          reading: practice.reading || [],
          writing: practice.writing || [],
          reorder: practice.reorder || [],
          extension_phrases: practice.extension_phrases || [],
          substitution: practice.substitution || [],
        });

    const data = compact({
      id: (unitId ?? "").toString(),
      title,
      theme,
      goals,
      objectives,
      vocabulary: vocabOut,
      grammar: grammarOut,
      conversation,
      practice: practiceOut,
      summary,
    });

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
  // UI
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
        <TextField label="제목" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="주제" value={theme} onChange={(e) => setTheme(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <Typography fontWeight="bold">학습 목표</Typography>
        {goals.map((goal, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField fullWidth value={goal} onChange={(e) => handleGoalChange(i, e.target.value)} />
            <IconButton onClick={() => handleGoalDelete(i)} color="error"><DeleteIcon /></IconButton>
          </Box>
        ))}
        <Button onClick={handleAddGoal}>+ 목표 추가</Button>
        {!!objectives?.length && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            (참고) objectives 필드도 goals와 동기화되어 함께 저장됩니다.
          </Typography>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 단어 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">단어 관리</Typography>
        {vocabulary.map((v, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={2}><TextField label="한자" value={v.hanzi || ""} onChange={(e) => updateVocab(i, "hanzi", e.target.value)} fullWidth /></Grid>
            <Grid item xs={2}><TextField label="Pinyin" value={v.pinyin || ""} onChange={(e) => updateVocab(i, "pinyin", e.target.value)} fullWidth /></Grid>
            <Grid item xs={2}><TextField label="발음" value={v.pronunciation || ""} onChange={(e) => updateVocab(i, "pronunciation", e.target.value)} fullWidth /></Grid>
            <Grid item xs={3}><TextField label="뜻" value={v.meaning || ""} onChange={(e) => updateVocab(i, "meaning", e.target.value)} fullWidth /></Grid>
            <Grid item xs={1.5}><TextField label="품사(pos)" value={v.pos || ""} onChange={(e) => updateVocab(i, "pos", e.target.value)} fullWidth /></Grid>
            <Grid item xs={1.5}>
              <TextField
                label="태그(쉼표)"
                value={toTagsString(v.tags)}
                onChange={(e) => updateVocab(i, "tags", e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              {(v.tags || []).map((t, idx) => <Chip key={idx} label={t} size="small" sx={{ mr: .5, mt: .5 }} />)}
            </Grid>
            <Grid item xs={12}>
              <IconButton onClick={() => deleteVocab(i)} color="error"><DeleteIcon /></IconButton>
            </Grid>
          </Grid>
        ))}
        <Button onClick={addVocab}>+ 단어 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 문법 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">문법 관리</Typography>
        {grammar.map((g, i) => {
          const mode = g.__mode || (g.title || g.summary || g.examples ? "new" : "old");
          return (
            <Box key={i} sx={{ mb: 2, border: "1px solid #eee", p: 2, borderRadius: 1 }}>
              <FormControlLabel
                control={<Switch checked={mode === "new"} onChange={() => toggleGrammarMode(i)} />}
                label={mode === "new" ? "신형(title/summary/notes/examples)" : "구형(rule/description/example)"}
              />
              {mode === "new" ? (
                <>
                  <TextField label="title" value={g.title || ""} onChange={(e) => updateGrammar(i, "title", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="summary" value={g.summary || ""} onChange={(e) => updateGrammar(i, "summary", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="notes(쉼표)" value={(g.notes || []).join(",")} onChange={(e) => updateGrammarNotes(i, e.target.value)} fullWidth sx={{ mb: 2 }} />
                  {(g.examples || []).map((ex, ei) => (
                    <Grid container spacing={1} key={ei} sx={{ mb: 1 }}>
                      <Grid item xs={3}><TextField label="zh" value={ex.zh || ""} onChange={(e) => updateGrammarExampleNew(i, ei, "zh", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="py" value={ex.py || ""} onChange={(e) => updateGrammarExampleNew(i, ei, "py", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="pronunciation(선택)" value={ex.pronunciation || ""} onChange={(e) => updateGrammarExampleNew(i, ei, "pronunciation", e.target.value)} fullWidth /></Grid>
                      <Grid item xs={3}><TextField label="ko" value={ex.ko || ""} onChange={(e) => updateGrammarExampleNew(i, ei, "ko", e.target.value)} fullWidth /></Grid>
                    </Grid>
                  ))}
                  <Button size="small" onClick={() => addGrammarExampleNew(i)}>+ 예문 추가</Button>
                </>
              ) : (
                <>
                  <TextField label="rule" value={g.rule || ""} onChange={(e) => updateGrammar(i, "rule", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <TextField label="description" value={g.description || ""} onChange={(e) => updateGrammar(i, "description", e.target.value)} fullWidth sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
                      <Grid item xs={3} key={field}>
                        <TextField
                          label={`example.${field}`}
                          value={g.example?.[field] || ""}
                          onChange={(e) => updateGrammarExample(i, field, e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
              <IconButton onClick={() => deleteGrammar(i)} color="error" sx={{ mt: 1 }}>
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        })}
        <Button onClick={addGrammar}>+ 문법 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 대화 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">대화 관리</Typography>
        {conversation.map((c, i) => (
          <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
            <Grid item xs={1}><TextField label="화자" value={c.speaker || ""} onChange={(e) => updateConversation(i, "speaker", e.target.value)} fullWidth /></Grid>
            {["chinese", "pinyin", "pronunciation", "meaning"].map((field) => (
              <Grid item xs={2.75} key={field}>
                <TextField label={field} value={c[field] || ""} onChange={(e) => updateConversation(i, field, e.target.value)} fullWidth />
              </Grid>
            ))}
            <Grid item xs={0.5}><IconButton onClick={() => deleteConversation(i)} color="error"><DeleteIcon /></IconButton></Grid>
          </Grid>
        ))}
        <Button onClick={addConversation}>+ 대화 추가</Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 연습 문제 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">연습 문제 관리</Typography>

        {/* 레거시 배열 */}
        {Array.isArray(practice) && (
          <>
            {practice.map((p, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <TextField label="문제" value={p.question || ""} onChange={(e) => updatePracticeLegacy(i, "question", e.target.value)} fullWidth sx={{ mb: 1 }} />
                <TextField label="옵션(쉼표)" value={(p.options || []).join(",")} onChange={(e) => updatePracticeLegacy(i, "options", e.target.value)} fullWidth sx={{ mb: 1 }} />
                <TextField label="정답" value={p.answer || ""} onChange={(e) => updatePracticeLegacy(i, "answer", e.target.value)} fullWidth />
                <IconButton onClick={() => deletePracticeLegacy(i)} color="error"><DeleteIcon /></IconButton>
              </Box>
            ))}
            <Button onClick={addPracticeLegacy}>+ 문제 추가</Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              (TIP) 새 구조로 전환하려면 JSON 영역에서 practice를 객체로 바꾸고 저장하세요.
            </Typography>
          </>
        )}

        {/* 신규 객체 */}
        {isPracticeNew && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 1 }}>읽기 (zh, ko)</Typography>
            {(practice.reading || []).map((r, i) => (
              <Grid container spacing={1} key={`rd-${i}`} sx={{ mb: 1 }}>
                <Grid item xs={6}><TextField label="zh" value={r.zh || ""} onChange={(e) => updateReading(i, "zh", e.target.value)} fullWidth /></Grid>
                <Grid item xs={6}><TextField label="ko" value={r.ko || ""} onChange={(e) => updateReading(i, "ko", e.target.value)} fullWidth /></Grid>
                <Grid item xs={12}><IconButton onClick={() => deleteReading(i)} color="error"><DeleteIcon /></IconButton></Grid>
              </Grid>
            ))}
            <Button onClick={addReading}>+ 읽기 추가</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">쓰기 (prompt_ko, answer_zh)</Typography>
            {(practice.writing || []).map((w, i) => (
              <Grid container spacing={1} key={`wr-${i}`} sx={{ mb: 1 }}>
                <Grid item xs={6}><TextField label="prompt_ko" value={w.prompt_ko || ""} onChange={(e) => updateWriting(i, "prompt_ko", e.target.value)} fullWidth /></Grid>
                <Grid item xs={6}><TextField label="answer_zh" value={w.answer_zh || ""} onChange={(e) => updateWriting(i, "answer_zh", e.target.value)} fullWidth /></Grid>
                <Grid item xs={12}><IconButton onClick={() => deleteWriting(i)} color="error"><DeleteIcon /></IconButton></Grid>
              </Grid>
            ))}
            <Button onClick={addWriting}>+ 쓰기 추가</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">배열 (items 쉼표, answer, hint_ko)</Typography>
            {(practice.reorder || []).map((r, i) => (
              <Grid container spacing={1} key={`re-${i}`} sx={{ mb: 1 }}>
                <Grid item xs={5}><TextField label="items(쉼표)" value={(r.items || []).join(",")} onChange={(e) => updateReorder(i, "items", e.target.value)} fullWidth /></Grid>
                <Grid item xs={5}><TextField label="answer" value={r.answer || ""} onChange={(e) => updateReorder(i, "answer", e.target.value)} fullWidth /></Grid>
                <Grid item xs={2}><TextField label="hint_ko" value={r.hint_ko || ""} onChange={(e) => updateReorder(i, "hint_ko", e.target.value)} fullWidth /></Grid>
                <Grid item xs={12}><IconButton onClick={() => deleteReorder(i)} color="error"><DeleteIcon /></IconButton></Grid>
              </Grid>
            ))}
            <Button onClick={addReorder}>+ 배열 추가</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">확장 표현 (zh, py, pron, ko)</Typography>
            {(practice.extension_phrases || []).map((e, i) => (
              <Grid container spacing={1} key={`ex-${i}`} sx={{ mb: 1 }}>
                <Grid item xs={3}><TextField label="zh" value={e.zh || ""} onChange={(ev) => updateExt(i, "zh", ev.target.value)} fullWidth /></Grid>
                <Grid item xs={3}><TextField label="py" value={e.py || ""} onChange={(ev) => updateExt(i, "py", ev.target.value)} fullWidth /></Grid>
                <Grid item xs={3}><TextField label="pron" value={e.pron || ""} onChange={(ev) => updateExt(i, "pron", ev.target.value)} fullWidth /></Grid>
                <Grid item xs={3}><TextField label="ko" value={e.ko || ""} onChange={(ev) => updateExt(i, "ko", ev.target.value)} fullWidth /></Grid>
                <Grid item xs={12}><IconButton onClick={() => deleteExt(i)} color="error"><DeleteIcon /></IconButton></Grid>
              </Grid>
            ))}
            <Button onClick={addExt}>+ 확장 표현 추가</Button>

            <Divider sx={{ my: 2 }} />

            {/* === 교체연습 (다중 슬롯) === */}
            <Typography variant="subtitle1">교체연습 (다중 슬롯)</Typography>
            {(practice.substitution || []).map((s, si) => {
              const sp = normalizeSubPattern(s);
              return (
                <Box key={`sub-${si}`} sx={{ mb: 2, border: "1px solid #eee", p: 2, borderRadius: 1 }}>
                  <TextField
                    label="title"
                    value={sp.title || ""}
                    onChange={(e) => updateSubField(si, "title", e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="pattern (예: 你{slot1}{slot2}吗？)"
                    value={sp.pattern || ""}
                    onChange={(e) => updateSubField(si, "pattern", e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="pron_pattern (예: {slot1}{slot2} → 한글 발음 템플릿, 선택)"
                    value={sp.pron_pattern || ""}
                    onChange={(e) => updateSubField(si, "pron_pattern", e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="meaning_pattern (예: 한국어 문장 템플릿, 선택)"
                    value={sp.meaning_pattern || ""}
                    onChange={(e) => updateSubField(si, "meaning_pattern", e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />

                  {(sp.slots || []).map((slotKey) => (
                    <Box key={slotKey} sx={{ border: "1px dashed #bbb", p: 1.5, mb: 2, borderRadius: 1 }}>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={8}>
                          <TextField
                            label="슬롯 이름"
                            fullWidth
                            value={slotKey}
                            onChange={(e) => updateSubSlotName(si, slotKey, e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={4} textAlign="right">
                          <Button color="error" onClick={() => deleteSubSlot(si, slotKey)}>슬롯 삭제</Button>
                        </Grid>
                      </Grid>

                      {(sp.items?.[slotKey] || []).map((it, ii) => (
                        <Grid container spacing={1} key={`subitem-${si}-${slotKey}-${ii}`} sx={{ mt: 1 }}>
                          <Grid item xs={3}>
                            <TextField
                              label="한자"
                              value={it.hanzi || ""}
                              onChange={(e) => updateSubItem(si, slotKey, ii, "hanzi", e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              label="병음"
                              value={it.pinyin || ""}
                              onChange={(e) => updateSubItem(si, slotKey, ii, "pinyin", e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              label="발음"
                              value={it.pron || ""}
                              onChange={(e) => updateSubItem(si, slotKey, ii, "pron", e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              label="뜻"
                              value={it.meaning || ""}
                              onChange={(e) => updateSubItem(si, slotKey, ii, "meaning", e.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <IconButton onClick={() => deleteSubItem(si, slotKey, ii)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button size="small" onClick={() => addSubItem(si, slotKey)}>+ 교체어 추가</Button>
                    </Box>
                  ))}

                  {/* 발음 사전: 고정 한자 → 한글 발음 */}
                  <Box sx={{ borderTop: "1px dashed #ddd", pt: 1.5, mt: 1.5 }}>
                    <Typography variant="subtitle2">발음 사전 (pron_dict)</Typography>
                    {(sp.pron_dict || []).map((d, di) => (
                      <Grid container spacing={1} key={`pron-${di}`} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                          <TextField
                            label="hanzi"
                            value={d.hanzi || ""}
                            onChange={(e) => updatePronDict(si, di, "hanzi", e.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField
                            label="pron(한글 발음)"
                            value={d.pron || ""}
                            onChange={(e) => updatePronDict(si, di, "pron", e.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={1}>
                          <IconButton onClick={() => deletePronDict(si, di)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button size="small" onClick={() => addPronDict(si)}>+ 발음 사전 추가</Button>
                  </Box>

                  {/* 의미 사전: 고정 한자 → 한국어 뜻 */}
                  <Box sx={{ borderTop: "1px dashed #ddd", pt: 1.5, mt: 1.5 }}>
                    <Typography variant="subtitle2">의미 사전 (meaning_dict)</Typography>
                    {(sp.meaning_dict || []).map((d, di) => (
                      <Grid container spacing={1} key={`mean-${di}`} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                          <TextField
                            label="hanzi"
                            value={d.hanzi || ""}
                            onChange={(e) => updateMeaningDict(si, di, "hanzi", e.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField
                            label="ko(한국어)"
                            value={d.ko || ""}
                            onChange={(e) => updateMeaningDict(si, di, "ko", e.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={1}>
                          <IconButton onClick={() => deleteMeaningDict(si, di)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button size="small" onClick={() => addMeaningDict(si)}>+ 의미 사전 추가</Button>
                  </Box>

                  <Button size="small" onClick={() => addSubSlot(si)}>+ 슬롯 추가</Button>
                  <IconButton
                    onClick={() => deleteSubPattern(si)}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              );
            })}
            <Button onClick={addSubPattern}>+ 교체연습 추가</Button>
          </>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* === 요약 관리 === */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">요약 관리</Typography>
        <Typography fontWeight="bold">핵심 단어</Typography>
        {(summary.vocabulary || []).map((word, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField fullWidth value={word} onChange={(e) => updateSummaryWord(i, e.target.value)} />
            <IconButton onClick={() => deleteSummaryWord(i)} color="error"><DeleteIcon /></IconButton>
          </Box>
        ))}
        <Button onClick={addSummaryWord}>+ 단어 추가</Button>

        <Typography fontWeight="bold" sx={{ mt: 3 }}>핵심 문법</Typography>
        {(summary.grammar || []).map((g, i) => (
          <Box key={i} display="flex" alignItems="center" sx={{ mb: 1 }}>
            <TextField fullWidth value={g} onChange={(e) => updateSummaryGrammar(i, e.target.value)} />
            <IconButton onClick={() => deleteSummaryGrammar(i)} color="error"><DeleteIcon /></IconButton>
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

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        message={message}
        onClose={() => setOpenSnackbar(false)}
      />
    </Container>
  );
}
