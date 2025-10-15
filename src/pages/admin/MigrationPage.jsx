// src/pages/admin/MigrationPage.jsx
import React, { useState } from "react";
import {
  Container, Stack, Button, Alert, Typography, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, CircularProgress
} from "@mui/material";
import {
  migrateEverydayOldToNew,
  migrateUnitVocabularyToIds,
  // dropOldEverydayCollections,
} from "../../firebase/firebaseFirestore";

export default function MigrationPage() {
  const [msg, setMsg] = useState(null);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, action: null, label: "" });
  const [summary, setSummary] = useState(null); // { everyday?: {...}, units?: {...} }

  const runWithWrap = async (fn, okLabel, fieldKey) => {
    setMsg(null);
    setSummary(null);
    setRunning(true);
    try {
      const res = await fn();
      // firebaseFirestore.js가 {ok:true}만 반환해도 문제 없음.
      // 만약 나중에 {ok:true, stats:{...}}를 반환하도록 바꾸면 여기서 표출됨.
      const stats = res?.stats || res; // 유연 처리
      setSummary((s) => ({ ...(s || {}), [fieldKey]: stats || { ok: true } }));
      setMsg({ type: "success", text: okLabel });
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "실패" });
    } finally {
      setRunning(false);
    }
  };

  const onEveryday = () =>
    setConfirm({
      open: true,
      action: () => runWithWrap(migrateEverydayOldToNew, "Everyday → /words + /dailies 마이그레이션 완료", "everyday"),
      label: "everyday_days 데이터를 /words + /dailies로 마이그레이션합니다.",
    });

  const onUnits = () =>
    setConfirm({
      open: true,
      action: () => runWithWrap(migrateUnitVocabularyToIds, "units.vocabulary → vocabIds 마이그레이션 완료", "units"),
      label: "각 unit의 vocabulary 배열을 /words에 업서트하고 unit.vocabIds로 전환합니다.",
    });

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        데이터 마이그레이션
      </Typography>

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

      <Stack spacing={1.5}>
        <Button
          variant="contained"
          onClick={onEveryday}
          disabled={running}
          startIcon={running ? <CircularProgress size={16} /> : null}
          sx={{ textTransform: "none" }}
        >
          1) everyday_days → /words + /dailies 마이그레이션
        </Button>

        <Button
          variant="contained"
          onClick={onUnits}
          disabled={running}
          startIcon={running ? <CircularProgress size={16} /> : null}
          sx={{ textTransform: "none" }}
        >
          2) unit.vocabulary → unit.vocabIds 마이그레이션
        </Button>

        {/* 정말 정리할 때만 주석 해제
        <Button
          color="error"
          variant="outlined"
          onClick={async ()=>{ setRunning(true); try{ await dropOldEverydayCollections(); setMsg({type:"success", text:"old everyday_days 정리 완료"});}catch(e){setMsg({type:"error", text:e?.message||"실패"});}finally{setRunning(false);} }}
          disabled={running}
          sx={{ textTransform: "none" }}
        >
          (위험) old everyday_days 정리
        </Button>
        */}
      </Stack>

      {/* 결과 요약(있으면 표시) */}
      {summary && (
        <Stack sx={{ mt: 2 }} spacing={1}>
          {summary.everyday && (
            <Alert severity="info">
              <Typography variant="subtitle2">Everyday 마이그레이션 결과</Typography>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(summary.everyday, null, 2)}
              </pre>
            </Alert>
          )}
          {summary.units && (
            <Alert severity="info">
              <Typography variant="subtitle2">Unit 마이그레이션 결과</Typography>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(summary.units, null, 2)}
              </pre>
            </Alert>
          )}
        </Stack>
      )}

      {/* 실행 전 확인 다이얼로그 */}
      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false })}>
        <DialogTitle>마이그레이션 실행</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm.label}
            <br />
            이 작업은 여러 문서를 수정할 수 있습니다. 계속하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm({ open: false })}>취소</Button>
          <Button
            variant="contained"
            onClick={() => {
              const act = confirm.action;
              setConfirm({ open: false });
              act && act();
            }}
          >
            실행
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
