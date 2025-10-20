import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { fetchUnitById, fetchWordsByIds, upsertWord } from "../../firebase/firebaseFirestore";

/* ---------------- 기본 시드 (누락 대비) ---------------- */
const DEFAULT_SEED = {
  离别: { pinyin: "lí bié", ko: "이별(하다)", pos: "动/名" },
  一幕: { pinyin: "yí mù", ko: "(연극) 한 장면", pos: "名" },
  总会: { pinyin: "zǒng huì", ko: "언젠가 ~하게 되다", pos: "副" },
  重演: { pinyin: "chóng yǎn", ko: "재연되다", pos: "动" },
  几乎: { pinyin: "jī hū", ko: "거의", pos: "副" },
  把: { pinyin: "bǎ", ko: "~을/를 (처치문)", pos: "介" },
  保重: { pinyin: "bǎo zhòng", ko: "몸조심해요", pos: "动" },
};

/* ---------------- 유틸 ---------------- */
const sanitizeRow = (w) => ({
  id: String(w.id || w.zh || "").trim(),
  zh: String(w.zh || w.hanzi || w.id || "").trim(),
  pinyin: String(w.pinyin || w.py || "").trim(),
  ko: String(w.ko || w.meaning || "").trim(),
  pos: String(w.pos || "").trim(),
  tags: Array.isArray(w.tags) ? w.tags : [],
  sentence: String(w.sentence || w.exampleZh || "").trim(),
  sentencePinyin: String(w.sentencePinyin || w.examplePy || "").trim(),
  sentenceKo: String(w.sentenceKo || w.exampleKo || "").trim(),
});

/* ---------------- 메인 컴포넌트 ---------------- */
export default function WordsAdminPage() {
  const [unitId, setUnitId] = useState("22");
  const [unit, setUnit] = useState(null);
  const [existing, setExisting] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const fileInputRef = useRef(null);

  /* ---------------- 로드 ---------------- */
  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setMsg("");
    try {
      const u = await fetchUnitById(unitId);
      if (!u) throw new Error(`unit ${unitId} 없음`);
      const ids = Array.isArray(u.vocabIds) ? u.vocabIds.map(String) : [];
      const words = ids.length ? await fetchWordsByIds(ids) : [];
      setUnit(u);
      setExisting(words);

      const found = new Set(words.map((w) => String(w.id)));
      const missing = ids.filter((zh) => !found.has(String(zh)));

      const seedRows = missing.map((zh) => ({
        zh,
        id: zh,
        pinyin: DEFAULT_SEED[zh]?.pinyin || "",
        ko: DEFAULT_SEED[zh]?.ko || "",
        pos: DEFAULT_SEED[zh]?.pos || "",
        tags: [],
        sentence: "",
        sentencePinyin: "",
        sentenceKo: "",
      }));

      const existingRows = words.map(sanitizeRow);
      setRows([...seedRows, ...existingRows]);

      setMsg(
        `✅ Unit ${unitId} 불러오기 완료 | 단어 ${ids.length}개 중 존재 ${words.length}, 누락 ${missing.length}`
      );
    } catch (e) {
      setMsg(`❌ 로드 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- 누락 계산 ---------------- */
  const missingSet = useMemo(() => {
    const ex = new Set(existing.map((w) => String(w.id)));
    const ids = (unit?.vocabIds || []).map(String);
    return new Set(ids.filter((zh) => !ex.has(zh)));
  }, [unit, existing]);

  /* ---------------- 셀 변경 ---------------- */
  const onChangeCell = (i, key, val) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };

  /* ---------------- 저장 ---------------- */
  const saveSelected = async (filterFn) => {
    setLoading(true);
    setMsg("");
    try {
      const targets = rows.filter(filterFn).map(sanitizeRow).filter((r) => r.zh);
      for (const w of targets) await upsertWord(w.zh, w);
      setMsg(`💾 저장 완료: ${targets.length}개 업서트`);
      await load();
    } catch (e) {
      setMsg(`❌ 저장 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- JSON 편집기 ---------------- */
  const openJsonEditor = () => {
    setJsonText(JSON.stringify(rows, null, 2));
    setJsonOpen(true);
  };

  const applyJsonToRows = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("JSON 루트는 배열이어야 함");
      setRows(parsed.map(sanitizeRow).filter((r) => r.zh));
      setMsg("✅ JSON 적용 완료");
      setJsonOpen(false);
    } catch (e) {
      setMsg(`❌ JSON 오류: ${e.message}`);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `words-unit-${unitId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setJsonText(String(r.result || ""));
    r.readAsText(f, "utf-8");
    e.target.value = "";
  };

  /* ---------------- 렌더 ---------------- */
  return (
    <Box p={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">📘 Words Admin</Typography>
        <Box flexGrow={1} />
        <TextField
          label="Unit ID"
          size="small"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
          불러오기
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ my: 1 }} />}
      {msg && (
        <Alert severity="info" sx={{ my: 1 }}>
          {msg}
        </Alert>
      )}

      <Stack direction="row" spacing={1} mb={1}>
        <Chip label={`단어수: ${unit?.vocabIds?.length || 0}`} />
        <Chip color="success" icon={<CheckCircleIcon />} label={`존재: ${existing.length}`} />
        <Chip color="warning" icon={<ErrorOutlineIcon />} label={`누락: ${missingSet.size}`} />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => saveSelected((w) => missingSet.has(String(w.zh)))}
        >
          누락만 저장
        </Button>
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => saveSelected(() => true)}>
          전체 저장(덮어쓰기)
        </Button>
        <Button variant="outlined" onClick={openJsonEditor}>
          JSON 보기/수정
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>zh</TableCell>
              <TableCell>pinyin</TableCell>
              <TableCell>ko</TableCell>
              <TableCell>pos</TableCell>
              <TableCell>tags</TableCell>
              <TableCell>sentence</TableCell>
              <TableCell>sentencePinyin</TableCell>
              <TableCell>sentenceKo</TableCell>
              <TableCell>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  데이터 없음
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => {
              const missing = missingSet.has(r.zh);
              return (
                <TableRow key={`${r.zh}-${i}`} hover>
                  {["zh", "pinyin", "ko", "pos", "sentence", "sentencePinyin", "sentenceKo"].map(
                    (key) => (
                      <TableCell key={key}>
                        <TextField
                          size="small"
                          value={r[key] || ""}
                          onChange={(e) => onChangeCell(i, key, e.target.value)}
                        />
                      </TableCell>
                    )
                  )}
                  <TableCell>
                    <TextField
                      size="small"
                      value={(r.tags || []).join(",")}
                      onChange={(e) =>
                        onChangeCell(
                          i,
                          "tags",
                          e.target.value.split(",").map((x) => x.trim()).filter(Boolean)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={missing ? "미존재" : "존재"}>
                      <IconButton color={missing ? "warning" : "success"} size="small">
                        {missing ? <ErrorOutlineIcon /> : <CheckCircleIcon />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* JSON 편집 모달 */}
      <Dialog open={jsonOpen} onClose={() => setJsonOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>JSON 보기/수정</DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" spacing={1} mb={1}>
            <Button size="small" startIcon={<DownloadIcon />} onClick={downloadJson}>
              다운로드
            </Button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={onPickFile}
              style={{ display: "none" }}
            />
            <Button size="small" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
              파일 불러오기
            </Button>
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={18}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[{"zh":"离别","pinyin":"lí bié","ko":"이별","pos":"动/名"}]'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonOpen(false)}>닫기</Button>
          <Button variant="contained" onClick={applyJsonToRows}>
            JSON 적용
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              try {
                const parsed = JSON.parse(jsonText);
                const normalized = parsed.map(sanitizeRow).filter((r) => r.zh);
                setRows(normalized);
                setJsonOpen(false);
                setTimeout(() => saveSelected(() => true), 0);
              } catch (e) {
                setMsg(`❌ JSON 오류: ${e.message}`);
              }
            }}
          >
            JSON → 저장(전체 업서트)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
