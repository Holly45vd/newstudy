import React, { useState } from "react";
import { Container, Stack, TextField, Button, Alert, Typography, Paper } from "@mui/material";
import {
  upsertWord,
  setDailyWords,
  attachWordsToUnit,
  seedDailyBundle, // ✅ 올인원
} from "../../firebase/firebaseFirestore";

const SAMPLE_WORDS = [
  {
    zh: "对不起",
    pinyin: "duìbuqǐ",
    ko: "미안합니다 / 죄송합니다",
    pos: "감탄사",
    tags: ["감정", "사과"],
    sentence: "对不起，我迟到了。",
    sentencePinyin: "Duìbuqǐ, wǒ chídào le.",
    sentenceKo: "죄송합니다, 제가 늦었습니다.",
    sentenceKoPronunciation: "뛔이부치, 워 츠따오 러",
    grammar: [{ term: "对不起", pinyin: "duìbuqǐ", pron: "뛔이부치", desc: "정중한 사과" }],
    extensions: [
      {
        zh: "对不起，我忘了你的生日。",
        pinyin: "Duìbuqǐ, wǒ wàng le nǐ de shēngrì.",
        ko: "미안해, 네 생일 잊었어.",
        koPron: "뛔이부치, 워 왕 러 니 더 셩르",
      },
    ],
    keyPoints: ["‘对不起’=정중", "‘不好意思’=가벼움"],
    pronunciation: [{ label: "对不起", pinyin: "duìbuqǐ", ko: "뛔이부치", tone: "4-0-3" }],
    sourceUrl: "https://youtu.be/xEktGWc7IRo",
  },
  {
    zh: "小时",
    pinyin: "xiǎoshí",
    ko: "시간(시간 단위)",
    pos: "명사",
    tags: ["시간"],
    sentence: "我们等了两个小时。",
    sentencePinyin: "Wǒmen děng le liǎng gè xiǎoshí.",
    sentenceKo: "우리는 두 시간 동안 기다렸어요.",
    sentenceKoPronunciation: "워먼 덩 러 량 거 시아오스",
    grammar: [
      { term: "两个小时", desc: ": ‘두 시간’(量词 个), 구어 ‘两小时’ 가능" },
      { term: "구조", structure: "主语 + 动词 + 了 + 数量 + 量词 + 名词", note: "경과 시간 표현" },
    ],
    keyPoints: ["两(수량) vs 二(숫자 ‘2’)", "个 생략 가능: 两小时"],
    pronunciation: [{ label: "小时", pinyin: "xiǎo shí", ko: "샤오스", tone: "3-2" }],
  },
  {
    zh: "谢谢",
    pinyin: "xièxie",
    ko: "고마워요/감사합니다",
    pos: "동사/감탄사",
    tags: ["감사", "인사"],
    sentence: "谢谢你的帮助！",
    sentencePinyin: "Xièxie nǐ de bāngzhù!",
    sentenceKo: "도와줘서 고마워!",
    sentenceKoPronunciation: "시에시에 니 더 빵주",
    pronunciation: [{ label: "谢谢", pinyin: "xièxie", ko: "시에시에", tone: "4-0" }],
  },
];

const DEFAULT_ONE_SHOT = `{
  "date": "2025-09-28",
  "unitId": "1",
  "words": [
    {
      "zh": "左边",
      "pinyin": "zuǒbiān",
      "ko": "왼쪽",
      "koPronunciation": "주어비엔",
      "pos": "명사/방향",
      "tags": ["방향","위치"],
      "sourceUrl": "https://youtu.be/x9x5wbCLvbc",
      "sentence": "洗手间在左边。",
      "sentencePinyin": "Xǐshǒujiān zài zuǒbiān.",
      "sentenceKo": "화장실은 왼쪽에 있어요.",
      "sentenceKoPronunciation": "시쇼우지앤 짜이 주어비엔",
      "grammar": [
        { "term": "在 + 位置词", "pinyin": "zài", "desc": "어디에 ‘있다’", "structure": "A 在 B + 位置", "note": "右边(오른쪽), 前面(앞), 后面(뒤)" }
      ],
      "keyPoints": ["左边/右边 세트 학습", "方位사와 자주 호응：在/从/往 + 位置词"],
      "extensions": [
        { "zh": "商店在学校左边。", "pinyin": "Shāngdiàn zài xuéxiào zuǒbiān.", "ko": "가게는 학교 왼쪽에 있어요.", "koPron": "샹뎬 짜이 쉐샤오 주어비엔" },
        { "zh": "请往左边走。", "pinyin": "Qǐng wǎng zuǒbiān zǒu.", "ko": "왼쪽으로 가세요.", "koPron": "칭 왕 주어비엔 조우" }
      ],
      "pronunciation": [{ "label": "左边", "pinyin": "zuǒbiān", "ko": "주어비엔", "tone": "3-1" }]
    },
    {
      "zh": "非常",
      "pinyin": "fēicháng",
      "ko": "매우, 대단히",
      "koPronunciation": "페이창",
      "pos": "부사",
      "tags": ["정도부사","강조"],
      "sourceUrl": "https://youtu.be/x9x5wbCLvbc",
      "sentence": "这里的风景非常漂亮。",
      "sentencePinyin": "Zhèli de fēngjǐng fēicháng piàoliang.",
      "sentenceKo": "여기 풍경이 정말 아름다워요.",
      "sentenceKoPronunciation": "쩌리 더 펑징 페이창 피아오리앙",
      "grammar": [
        { "term": "非常 + 형용사/동사", "pinyin": "fēicháng", "desc": "정도를 아주 강하게", "structure": "主语 + 非常 + Adj/Verb", "note": "‘很/太/特别’와 뉘앙스 비교" }
      ],
      "keyPoints": ["구어에서 빈번, 과장/칭찬에서 자주 사용", "‘太 … 了’는 ‘너무’의 감탄 느낌"],
      "extensions": [
        { "zh": "我非常喜欢这里。", "pinyin": "Wǒ fēicháng xǐhuan zhèlǐ.", "ko": "저는 여기를 매우 좋아해요.", "koPron": "워 페이창 시환 쩌리" },
        { "zh": "他今天非常忙。", "pinyin": "Tā jīntiān fēicháng máng.", "ko": "그는 오늘 너무 바빠요.", "koPron": "타 찐티엔 페이창 망" }
      ],
      "pronunciation": [{ "label": "非常", "pinyin": "fēicháng", "ko": "페이창", "tone": "1-2" }]
    },
    {
      "zh": "脚",
      "pinyin": "jiǎo",
      "ko": "발",
      "koPronunciation": "지아오",
      "pos": "명사",
      "tags": ["신체","건강"],
      "sourceUrl": "https://youtu.be/x9x5wbCLvbc",
      "sentence": "我的脚好疼。",
      "sentencePinyin": "Wǒ de jiǎo hǎo téng.",
      "sentenceKo": "제 발이 아파요.",
      "sentenceKoPronunciation": "워 더 지아오 하오 텅",
      "grammar": [
        { "term": "疼/痛", "pinyin": "téng/tòng", "desc": "아프다", "structure": "部位 + 疼", "note": "‘好 + Adj’는 ‘아주/많이’의 구어 강조" }
      ],
      "keyPoints": ["부위 명사와 함께 통증 표현", "医生(의사), 看病(진료)와 연어"],
      "extensions": [
        { "zh": "我脚踝扭到了。", "pinyin": "Wǒ jiǎohuái niǔ dào le.", "ko": "발목을 삐었어요.", "koPron": "워 지아오화이 니우 따오 러" },
        { "zh": "走路久了脚会疼。", "pinyin": "Zǒulù jiǔ le jiǎo huì téng.", "ko": "오래 걸으면 발이 아플 수 있어요.", "koPron": "조우루 지우 러 지아오 후이 텅" }
      ],
      "pronunciation": [{ "label": "脚", "pinyin": "jiǎo", "ko": "지아오", "tone": "3" }]
    }
  ]
}`;

export default function SeedPage() {
  // 개별 시드
  const [wordsJson, setWordsJson] = useState(JSON.stringify(SAMPLE_WORDS, null, 2));
  const [dailyDate, setDailyDate] = useState("2025-01-01");
  const [unitId, setUnitId] = useState("1");
  const [msg, setMsg] = useState(null);

  // 올인원 시드
  const [bundleJson, setBundleJson] = useState(DEFAULT_ONE_SHOT);
  const [bundleMsg, setBundleMsg] = useState(null);

  const seedWords = async () => {
    setMsg(null);
    try {
      const arr = JSON.parse(wordsJson);
      if (!Array.isArray(arr)) throw new Error("최상위가 배열이어야 합니다.");
      for (const w of arr) {
        const id = String(w.id || w.zh || w.hanzi || "").trim();
        if (!id) continue;
        await upsertWord(id, w);
      }
      setMsg({ type: "success", text: `/words 시드 완료 (${arr.length}개)` });
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  const makeDaily = async () => {
    setMsg(null);
    try {
      const arr = JSON.parse(wordsJson);
      const ids = arr.map((w) => String(w.id || w.zh || w.hanzi || "")).filter(Boolean);
      await setDailyWords(dailyDate, ids);
      setMsg({ type: "success", text: `/dailies/${dailyDate} 등록 (wordIds=${ids.length})` });
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  const attachToUnit = async () => {
    setMsg(null);
    try {
      const arr = JSON.parse(wordsJson);
      const ids = arr.map((w) => String(w.id || w.zh || w.hanzi || "")).filter(Boolean);
      await attachWordsToUnit(String(unitId), ids);
      setMsg({ type: "success", text: `unit ${unitId}에 ${ids.length}개 연결 (vocabIds 세팅)` });
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  const runOneShot = async () => {
    setBundleMsg(null);
    try {
      const payload = JSON.parse(bundleJson);
      const res = await seedDailyBundle(payload);
      setBundleMsg({
        type: "success",
        text: `OK: ${res.date} / ${res.wordIds.length}개 저장, unit=${res.unitId ?? "-"}`,
      });
    } catch (e) {
      setBundleMsg({ type: "error", text: e.message });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Seed (새 스키마)
      </Typography>

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

      {/* 1) /words 시드 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>1) 단어 배열(JSON) → /words</Typography>
        <TextField value={wordsJson} onChange={(e)=>setWordsJson(e.target.value)} multiline minRows={14} fullWidth />
        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={seedWords}>/words 시드</Button>
        </Stack>
      </Paper>

      {/* 2) /dailies 묶기 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>2) 하루 묶기 (/dailies)</Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField label="YYYY-MM-DD" value={dailyDate} onChange={(e)=>setDailyDate(e.target.value)} />
          <Button variant="contained" onClick={makeDaily}>/dailies 저장</Button>
        </Stack>
      </Paper>

      {/* 3) unit 연결 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>3) 특정 유닛에 연결 (unit.vocabIds)</Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField label="unitId" value={unitId} onChange={(e)=>setUnitId(e.target.value)} />
          <Button variant="contained" onClick={attachToUnit}>유닛 연결</Button>
        </Stack>
      </Paper>

      {/* 4) 원클릭(올인원) */}
      {bundleMsg && <Alert severity={bundleMsg.type} sx={{ mb: 2 }}>{bundleMsg.text}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>4) 원클릭 시드 (WORDS + DAILIES + UNIT)</Typography>
        <TextField value={bundleJson} onChange={(e)=>setBundleJson(e.target.value)} multiline minRows={16} fullWidth />
        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={runOneShot}>원클릭 실행</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
