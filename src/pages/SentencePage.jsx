// src/pages/SubstitutionPage.jsx — 리스트 전용, 단순 UI (검색/카드/밀도/TTS슬롯축소 제거)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
  Chip,
  Stack,
  Tooltip,
  Skeleton,
  Paper,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ReplayIcon from "@mui/icons-material/Replay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TuneIcon from "@mui/icons-material/Tune";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";
import { pinyin } from "pinyin-pro"; // 전체 문장 병음 생성용

/** 안전한 replaceAll (폴백) */
const replaceAll = (text, search, replacement) => {
  if (typeof text !== "string") return "";
  if (typeof text.replaceAll === "function") return text.replaceAll(search, replacement);
  // 정규식 특수문자 이스케이프 (정확한 문자셋)
  const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escapeForRegex(search), "g");
  return text.replace(re, replacement);
};

/** item 키 정규화: zh/py/pron/ko → hanzi/pinyin/pronunciation/meaning */
const normItem = (it = {}) => ({
  hanzi: it.hanzi ?? it.zh ?? "",
  pinyin: it.pinyin ?? it.py ?? "",
  pronunciation: it.pronunciation ?? it.pron ?? "",
  meaning: it.meaning ?? it.ko ?? "",
});

/** 패턴 구조 정규화 (신형/구형 지원) */
const normalizePattern = (raw) => {
  if (!raw) return null;
  if (raw.slot && Array.isArray(raw.items)) {
    return {
      title: raw.title || raw.pattern || "교체연습",
      pattern: raw.pattern || `{${raw.slot}}`,
      slots: [raw.slot],
      items: { [raw.slot]: raw.items.map(normItem) },
      hint_ko: raw.hint_ko || "",
      pron_pattern: raw.pron_pattern || "",
      pron_dict: raw.pron_dict || [], // 고정 한자 → 한글 발음 매핑
      tags: raw.tags || [],
    };
  }
  const slots = Array.isArray(raw.slots) ? raw.slots : [];
  const items = {};
  if (raw.items && typeof raw.items === "object") {
    for (const k of Object.keys(raw.items)) items[k] = (raw.items[k] || []).map(normItem);
  }
  return {
    title: raw.title || raw.pattern || "교체연습",
    pattern: raw.pattern || (slots.length ? slots.map((s) => `{${s}}`).join(" ") : ""),
    slots,
    items,
    hint_ko: raw.hint_ko || "",
    pron_pattern: raw.pron_pattern || "",
    pron_dict: raw.pron_dict || [], // 누락 주의
    tags: raw.tags || [],
  };
};

/** 선택된 슬롯 맵으로 문장/필드 조립 */
const buildWithField = (patternStr, slots, selected, field, placeholder = "____") => {
  let out = patternStr || "";
  slots.forEach((slot) => {
    const v = selected?.[slot]?.[field]?.toString()?.trim();
    out = replaceAll(out, `{${slot}}`, v && v.length > 0 ? v : placeholder);
  });
  return out;
};

const PREF_KEY = "subs_page_prefs_min"; // 표시 토글만 저장

export default function SubstitutionPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const [selected, setSelected] = useState({}); // { [patternIndex]: { [slotKey]: item } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // react-speech-kit
  const { speak, voices } = useSpeechSynthesis();

  // UI 상태: 간소화 — 표시 토글만 유지
  const [show, setShow] = useState({ pinyin: true, pron: false, meaning: true });

  // 보이스 로딩(안드로이드 대응)
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const v = synth.getVoices();
      if (v && v.length) clearInterval(t);
      if (tries >= 5) clearInterval(t);
    }, 300);
    return () => clearInterval(t);
  }, []);

  // 중국어 보이스 선택기
  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const kw = ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語", "國語(臺灣)"];
    const cands = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const langMatch = lang.startsWith("zh") || lang.includes("cmn");
      const nameMatch = kw.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });
    const score = (v) => {
      const L = (v.lang || "").toLowerCase();
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };
    return cands.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  const chineseVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return list.find((v) => v.lang === "zh-CN") || pickChineseVoice(list) || null;
  }, [voices, pickChineseVoice]);

  // 데이터 + prefs 로드
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true); setError(null);
        const data = await fetchUnitById(id);
        setUnit(data || {});
      } catch (e) {
        setError(e?.message || "데이터 로드 실패");
      } finally { setLoading(false); }
    };
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.show) setShow(p.show);
      }
    } catch {}
    run();
  }, [id]);

  // prefs 저장
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ show }));
  }, [show]);

  const subs = useMemo(() => {
    const raw = unit?.practice?.substitution || [];
    return raw.map(normalizePattern).filter(Boolean);
  }, [unit]);

  // 발화
  const handleSpeak = (text) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (synth) synth.cancel();
      if (chineseVoice) {
        speak({ text, voice: chineseVoice, rate: 0.95, pitch: 1.0, volume: 1.0 });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN"; u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
        synth.speak(u);
      }
    } catch (e) { console.error("TTS 오류:", e); }
  };

  const handleCopy = async (text) => { try { await navigator.clipboard.writeText(text); } catch {} };

  const handleSelect = (pi, slotKey, item) => {
    setSelected((prev) => ({ ...prev, [pi]: { ...(prev[pi] || {}), [slotKey]: item } }));
  };
  const handleReset = (pi) => {
    setSelected((prev) => { const next = { ...prev }; delete next[pi]; return next; });
  };
  const handleRandom = (pi, pattern) => {
    const next = {}; pattern.slots.forEach((slotKey) => {
      const arr = pattern.items?.[slotKey] || [];
      if (arr.length > 0) next[slotKey] = arr[Math.floor(Math.random() * arr.length)];
    });
    setSelected((prev) => ({ ...prev, [pi]: next }));
  };
  const handleRandomAll = () => {
    const next = {}; subs.forEach((p, pi) => {
      const sel = {}; p.slots.forEach((s) => {
        const arr = p.items?.[s] || []; if (arr.length) sel[s] = arr[Math.floor(Math.random() * arr.length)];
      }); next[pi] = sel; });
    setSelected(next);
  };

  if (!unit || loading) {
    return (
      <Box>
        <UnitTabs />
        <Box p={2} display="flex" justifyContent="center" alignItems="center" height="40vh">
          {error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <Stack spacing={2} sx={{ width: "100%" }}>
              <Skeleton variant="rounded" height={56} />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={120} />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <UnitTabs />

      {/* 헤더: 단순화 */}
      <Box p={2} sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
          <Typography variant="h5" fontWeight="bold">교체연습 (Unit {id})</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="모든 패턴에 랜덤 적용">
            <Button startIcon={<ShuffleIcon />} onClick={handleRandomAll} variant="outlined" size="small">랜덤 전체</Button>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" mt={1.25}>
          <TuneIcon fontSize="small" />
          <Chip size="small" label={`병음 ${show.pinyin ? "ON" : "OFF"}`} variant={show.pinyin ? "filled" : "outlined"} onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))} />
          <Chip size="small" label={`발음 ${show.pron ? "ON" : "OFF"}`} variant={show.pron ? "filled" : "outlined"} onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))} />
          <Chip size="small" label={`뜻 ${show.meaning ? "ON" : "OFF"}`} variant={show.meaning ? "filled" : "outlined"} onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))} />
        </Stack>
      </Box>

      {/* 본문: 리스트 뷰만 */}
      <Box p={2}>
        {!subs.length ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">등록된 교체연습이 없습니다.</Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {subs.map((pattern, pi) => {
              const sel = selected[pi] || {};
              const zh = buildWithField(pattern.pattern, pattern.slots, sel, "hanzi");
              // 전체 문장 병음 생성(혼용 방지)
              const py = pinyin(zh, { toneType: 'mark', type: 'array' }).join(' ');
              const pron = pattern.pron_pattern
                ? buildWithField(pattern.pron_pattern, pattern.slots, sel, "pronunciation")
                : null;
              const koJoined = pattern.slots.map((slot) => sel?.[slot]?.meaning).filter(Boolean).join(" / ");

              return (
                <Paper key={pi} sx={{ p: 2, borderRadius: 2 }} variant="outlined">
                  {/* 헤더 */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>{pattern.title || `패턴 ${pi + 1}`}</Typography>
                      {(pattern.tags || []).map((t, i) => (
                        <Chip key={i} size="small" label={t} />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="랜덤 선택"><IconButton onClick={() => handleRandom(pi, pattern)} aria-label="랜덤 선택"><ShuffleIcon /></IconButton></Tooltip>
                      <Tooltip title="초기화"><IconButton onClick={() => handleReset(pi)} aria-label="초기화"><ReplayIcon /></IconButton></Tooltip>
                    </Stack>
                  </Stack>

                  {pattern.hint_ko && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>힌트: {pattern.hint_ko}</Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* 완성 문장 */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                    <Typography variant="h6" className="chinese-text2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{zh}</Typography>
                    <Tooltip title="복사"><IconButton size="small" onClick={() => handleCopy(zh)} aria-label="복사"><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="듣기"><IconButton color="primary" size="small" onClick={() => handleSpeak(zh)} aria-label="중국어 문장 듣기"><VolumeUpIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>

                  {/* 보조 줄 */}
                  {show.pinyin && <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{py}</Typography>}
                  {show.pron && !!pron && (<Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{pron}</Typography>)}
                  {show.meaning && !!koJoined && (<Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{koJoined}</Typography>)}

                  {/* 슬롯 영역 */}
                  <Divider sx={{ my: 1.25 }} />
                  {pattern.slots.map((slotKey) => (
                    <Box key={slotKey} sx={{ mb: 1.0 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>{slotKey} 선택</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {(pattern.items?.[slotKey] || []).map((item, idx) => {
                          const active = sel?.[slotKey]?.hanzi === item.hanzi;
                          return (
                            <Chip
                              key={idx}
                              variant={active ? "filled" : "outlined"}
                              color={active ? "primary" : "default"}
                              label={<span style={{ fontWeight: 600 }}>{item.hanzi}</span>}
                              size="small"
                              onClick={() => handleSelect(pi, slotKey, item)}
                              clickable
                            />
                          );
                        })}
                      </Stack>
                      {sel?.[slotKey] && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {sel[slotKey].pinyin}
                          {sel[slotKey].pronunciation ? ` · ${sel[slotKey].pronunciation}` : ""}
                          {sel[slotKey].meaning ? ` · ${sel[slotKey].meaning}` : ""}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
