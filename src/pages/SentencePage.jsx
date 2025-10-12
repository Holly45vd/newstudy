// src/pages/SubstitutionPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchUnitById } from "../firebase/firebaseFirestore";
import {
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Box,
  IconButton,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ReplayIcon from "@mui/icons-material/Replay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import { useSpeechSynthesis } from "react-speech-kit";
import UnitTabs from "../components/tabs/UnitTabs";

/** 문자열 전체 치환 (replaceAll 폴백) */
const replaceAll = (text, search, replacement) => {
  if (typeof text !== "string") return "";
  if (typeof text.replaceAll === "function") return text.replaceAll(search, replacement);
  const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
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

  // 구형
  if (raw.slot && Array.isArray(raw.items)) {
    return {
      title: raw.title || raw.pattern || "교체연습",
      pattern: raw.pattern || `{${raw.slot}}`,
      slots: [raw.slot],
      items: { [raw.slot]: raw.items.map(normItem) },
      hint_ko: raw.hint_ko || "",
      tags: raw.tags || [],
    };
  }

  // 신형
  const slots = Array.isArray(raw.slots) ? raw.slots : [];
  const items = {};
  if (raw.items && typeof raw.items === "object") {
    for (const k of Object.keys(raw.items)) {
      items[k] = (raw.items[k] || []).map(normItem);
    }
  }

  return {
    title: raw.title || raw.pattern || "교체연습",
    pattern: raw.pattern || (slots.length ? slots.map((s) => `{${s}}`).join(" ") : ""),
    slots,
    items,
    hint_ko: raw.hint_ko || "",
    tags: raw.tags || [],
  };
};

/** 선택된 슬롯 맵으로 문장/필드 조립 */
const buildWithField = (patternStr, slots, selected, field, placeholder = "____") => {
  let out = patternStr || "";
  slots.forEach((slot) => {
    const v =
      selected?.[slot]?.[field] && String(selected?.[slot]?.[field]).trim().length > 0
        ? selected[slot][field]
        : placeholder;
    out = replaceAll(out, `{${slot}}`, v);
  });
  return out;
};

export default function SubstitutionPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const [selected, setSelected] = useState({}); // { [patternIndex]: { [slotKey]: item } }
  const { speak, voices } = useSpeechSynthesis();

  const chineseVoice = useMemo(() => {
    return (
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => (v.lang || "").toLowerCase().startsWith("zh")) ||
      null
    );
  }, [voices]);

  useEffect(() => {
    (async () => {
      const data = await fetchUnitById(id);
      setUnit(data || {});
    })();
  }, [id]);

  const subs = useMemo(() => {
    const raw = unit?.practice?.substitution || [];
    return raw.map(normalizePattern).filter(Boolean);
  }, [unit]);

  const handleSpeak = (text) => {
    if (!text) return;
    speak({
      text,
      voice: chineseVoice || null,
      lang: "zh-CN",
      rate: 0.9,
    });
  };

  const handleSelect = (pi, slotKey, item) => {
    setSelected((prev) => ({
      ...prev,
      [pi]: { ...(prev[pi] || {}), [slotKey]: item },
    }));
  };

  const handleReset = (pi) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[pi];
      return next;
    });
  };

  const handleRandom = (pi, pattern) => {
    const next = {};
    pattern.slots.forEach((slotKey) => {
      const arr = pattern.items?.[slotKey] || [];
      if (arr.length > 0) {
        next[slotKey] = arr[Math.floor(Math.random() * arr.length)];
      }
    });
    setSelected((prev) => ({ ...prev, [pi]: next }));
  };

  if (!unit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <UnitTabs />
      <Box p={2}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          교체연습 (Substitution Drills)
        </Typography>

        {!subs.length ? (
          <Typography color="text.secondary">등록된 교체연습이 없습니다.</Typography>
        ) : (
          subs.map((pattern, pi) => {
            const sel = selected[pi] || {};

            // 완성 문장(중문/병음/한글 발음/의미)
            const zh = buildWithField(pattern.pattern, pattern.slots, sel, "hanzi");
            const py = buildWithField(pattern.pattern, pattern.slots, sel, "pinyin");
            const pron = buildWithField(pattern.pattern, pattern.slots, sel, "pronunciation"); // ★ 한글 발음
            const koJoined = pattern.slots
              .map((slot) => sel?.[slot]?.meaning)
              .filter(Boolean)
              .join(" / ");

            return (
              <Card key={pi} elevation={3} sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {pattern.title || `패턴 ${pi + 1}`}
                      </Typography>
                      {(pattern.tags || []).map((t, i) => (
                        <Chip key={i} size="small" label={t} sx={{ ml: 0.5 }} />
                      ))}
                    </Box>
                    <Box>
                      <IconButton onClick={() => handleRandom(pi, pattern)} title="랜덤 선택" aria-label="랜덤 선택">
                        <ShuffleIcon />
                      </IconButton>
                      <IconButton onClick={() => handleReset(pi)} title="초기화" aria-label="초기화">
                        <ReplayIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {pattern.hint_ko && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      힌트: {pattern.hint_ko}
                    </Typography>
                  )}

                  {/* 완성 문장 */}
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography
                      variant="body1"
                      className="chinese-text2"
                      sx={{ fontSize: "1.2rem", fontWeight: 600 }}
                    >
                      {zh}
                    </Typography>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleSpeak(zh)}
                      aria-label="중국어 문장 듣기"
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Box>

                  {/* 병음 + 한글 발음 + 의미 */}
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{py}</Typography>
                  {!!pron && (
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {pron}
                    </Typography>
                  )}
                  {!!koJoined && (
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {koJoined}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* 슬롯별 선택 영역 */}
                  {pattern.slots.map((slotKey) => (
                    <Box key={slotKey} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {slotKey} 선택
                      </Typography>
                      <Grid container spacing={1}>
                        {(pattern.items?.[slotKey] || []).map((item, idx) => {
                          const active = sel?.[slotKey]?.hanzi === item.hanzi;
                          return (
                            <Grid item key={idx}>
                              <Button
                                variant={active ? "contained" : "outlined"}
                                size="small"
                                onClick={() => handleSelect(pi, slotKey, item)}
                                aria-label={`${item.hanzi} 선택`}
                              >
                                {item.hanzi}
                              </Button>
                            </Grid>
                          );
                        })}
                      </Grid>

                      {/* 슬롯 내 선택 항목 미리보기: 병음 + 한글 발음 + 뜻 */}
                      {sel?.[slotKey] && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {sel[slotKey].pinyin}
                          {sel[slotKey].pronunciation ? ` · ${sel[slotKey].pronunciation}` : ""}
                          {sel[slotKey].meaning ? ` · ${sel[slotKey].meaning}` : ""}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>
    </Box>
  );
}
