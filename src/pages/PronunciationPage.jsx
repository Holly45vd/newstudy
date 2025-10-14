// src/pages/PronunciationPage.jsx
import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import pinyinData from "../components/pinyinData.json";

const MAX_PINYIN_LENGTH = 5;

/** 성조 매핑 테이블 */
const toneMap = {
  ā: { base: "a", tone: 1 }, á: { base: "a", tone: 2 }, ǎ: { base: "a", tone: 3 }, à: { base: "a", tone: 4 },
  ē: { base: "e", tone: 1 }, é: { base: "e", tone: 2 }, ě: { base: "e", tone: 3 }, è: { base: "e", tone: 4 },
  ī: { base: "i", tone: 1 }, í: { base: "i", tone: 2 }, ǐ: { base: "i", tone: 3 }, ì: { base: "i", tone: 4 },
  ō: { base: "o", tone: 1 }, ó: { base: "o", tone: 2 }, ǒ: { base: "o", tone: 3 }, ò: { base: "o", tone: 4 },
  ū: { base: "u", tone: 1 }, ú: { base: "u", tone: 2 }, ǔ: { base: "u", tone: 3 }, ù: { base: "u", tone: 4 },
  ǖ: { base: "ü", tone: 1 }, ǘ: { base: "ü", tone: 2 }, ǚ: { base: "ü", tone: 3 }, ǜ: { base: "ü", tone: 4 },
};

/** 성조 감지: 성조문자를 찾아 base/tone 계산 */
const detectTone = (syllable) => {
  for (let char of syllable) {
    if (toneMap[char]) {
      return {
        base: syllable.replace(char, toneMap[char].base),
        tone: toneMap[char].tone,
      };
    }
  }
  return { base: syllable, tone: 0 };
};

/** 1) 성조 제거 2) u:→ü / v→ü 3) 알파벳/ü 외 제거(토큰 단위) */
const normalizePinyin = (str) => {
  const toneGroups = {
    a: "āáǎà",
    e: "ēéěè",
    i: "īíǐì",
    o: "ōóǒò",
    u: "ūúǔù",
    ü: "ǖǘǚǜ",
  };
  let normalized = str.toLowerCase();
  for (const [plain, tones] of Object.entries(toneGroups)) {
    const regex = new RegExp(`[${tones}]`, "g");
    normalized = normalized.replace(regex, plain);
  }
  return normalized
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .replace(/[^a-zü]/g, "");
};

/** 병음을 음절 단위로 분리 */
const splitPinyin = (input, pinyinSet) => {
  const out = [];
  let buf = input;
  while (buf.length > 0) {
    let matched = false;
    for (let len = MAX_PINYIN_LENGTH; len > 0; len--) {
      const chunk = buf.slice(0, len);
      if (pinyinSet.has(chunk)) {
        out.push(chunk);
        buf = buf.slice(len);
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(buf[0]);
      buf = buf.slice(1);
    }
  }
  return out;
};

export default function PronunciationPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // pinyinSet 캐시
  const pinyinSet = useMemo(
    () => new Set(pinyinData.map((i) => i.pinyin.toLowerCase())),
    []
  );

  /**
   * 입력을 "단어 토큰" 단위로 나눠 처리
   * - 원본 공백은 유지
   * - 문장부호는 공백으로 치환 후 분리
   */
  const tokenized = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const original = searchTerm
      .toLowerCase()
      // 알파벳/ü/성조문자/공백만 남기고 나머지는 공백으로
      .replace(/[^a-z\sāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return original.split(" ").filter(Boolean); // 단어 단위 배열
  }, [searchTerm]);

  /**
   * 각 "단어"를 다시 "음절"로 분해해 한글 발음/성조를 매핑
   */
  const tokenResults = useMemo(() => {
    return tokenized.map((token) => {
      const normalized = normalizePinyin(token); // 성조 제거 토큰
      const syllables = splitPinyin(normalized, pinyinSet);
      // 원본 토큰에서 순서대로 성조 감지 (길이 매칭 실패 시 무성조 처리)
      let cursor = 0;
      return syllables.map((sy) => {
        // 원본 부분 문자열(대략적 매칭)
        const raw = token.slice(cursor, cursor + sy.length);
        cursor += sy.length;
        const toneInfo = detectTone(raw);
        const dict = pinyinData.find((it) => it.pinyin.toLowerCase() === sy);
        return {
          pinyin: sy,
          korean: dict?.korean || null,
          tone: toneInfo.tone,
        };
      });
    });
  }, [tokenized, pinyinSet]);

  // 카드용 평탄화 데이터 (이전 UI도 유지)
  const flatResults = useMemo(() => tokenResults.flat(), [tokenResults]);

  /** 최종 표기: 단어 사이엔 공백, 단어 내 음절은 붙여서 */
  const finalPronunciation = tokenResults
    .map((word) => word.map((s) => s.korean || s.pinyin).join(" "))
    .join(" ");

  /** 성조 패턴(단어 경계 보존) */
  const finalTonePattern = tokenResults
    .map((word) =>
      word.map((s) => (s.tone > 0 ? `${s.tone}성` : "성조없음")).join(" ")
    )
    .join(" "); // 단어 사이 조금 더 간격

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const toneComment = {
    0: "성조 없음",
    1: "1성 (높게 유지 ↔)",
    2: "2성 (올라감 ↗)",
    3: "3성 (내려갔다가 올라감 ↘↗)",
    4: "4성 (빠르게 떨어짐 ↘)",
  };

  const renderMessage = () => {
    if (searchTerm.length === 0) {
      return (
        <Typography
          variant="body2"
          color="textSecondary"
          textAlign="center"
          sx={{ mt: 4 }}
        >
          병음을 입력하면 발음을 보여줍니다.
        </Typography>
      );
    }
    if (flatResults.length === 0) {
      return (
        <Typography variant="body1" color="error" textAlign="center" sx={{ mt: 4 }}>
          결과를 찾을 수 없습니다.
        </Typography>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", pt: 4, px: 2 }}>
      <Typography variant="h4" textAlign="center" gutterBottom sx={{ mb: 3, fontFamily: "Hi Melody" }}>
        발음하기
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <TextField
          label="병음 입력 (예: hongzhi)"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearch}
          placeholder="병음을 입력하세요"
          sx={{ width: "100%", maxWidth: 480, backgroundColor: "#fff" }}
        />
      </Box>

      {/* 최종 발음/성조 */}
      {flatResults.length > 0 && (
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "Hi Melody",
              backgroundColor: "#f1f1f1",
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: "8px",
            }}
          >
            {finalPronunciation}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            성조 패턴: {finalTonePattern}
          </Typography>
        </Box>
      )}

      {/* 결과 카드 (음절 단위) */}
      <Grid container spacing={2} justifyContent="center">
        {flatResults.map((item, idx) => (
          <Grid item key={idx} xs={12} sm={6} md={4} lg={3}>
            <Card
              sx={{
                height: "100%",
                backgroundColor: "#f9f9f9",
                border: "1px solid #ddd",
                boxShadow: "none",
                textAlign: "center",
              }}
            >
              <CardContent>
                <Typography variant="h6">병음: {item.pinyin}</Typography>
                {item.korean ? (
                  <>
                    <Typography variant="h6" sx={{ mt: 1, fontFamily: "Hi Melody" }}>
                      발음: {item.korean}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontStyle: "italic" }}>
                      성조: {toneComment[item.tone]}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    ❌ 해당 병음을 찾을 수 없습니다.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {renderMessage()}
    </Box>
  );
}
