// src/pages/admin/UnitEditProvider.jsx
import React, {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { addUnit, updateUnit, fetchUnitById } from "../../firebase/firebaseFirestore";

const UnitEditContext = createContext(null);
export const useUnitEdit = () => useContext(UnitEditContext);

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const defaultSummary = { vocabulary: [], grammar: [] };

export function UnitEditProvider({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("id");

  // Core state
  const [unitId, setUnitId] = useState(1);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [goals, setGoals] = useState([""]);
  const [objectives, setObjectives] = useState([]);

  const [vocabulary, setVocabulary] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [practice, setPractice] = useState([]); // array(legacy) or object(new)
  const [summary, setSummary] = useState(defaultSummary);

  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Load
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!editId) return;
      setLoading(true);
      try {
        const unit = await fetchUnitById(editId);
        if (!unit || !alive) return;
        setUnitId(Number(unit.id ?? editId));
        setTitle(unit.title || "");
        setTheme(unit.theme || "");

        const g = toArray(unit.goals);
        const o = toArray(unit.objectives);
        setGoals(g.length ? g : o.length ? o : [""]);
        setObjectives(o.length ? o : g);

        setVocabulary(unit.vocabulary || []);
        setGrammar(unit.grammar || []);
        setConversation(unit.conversation || []);
        setPractice(unit.practice ?? []);
        setSummary(unit.summary || defaultSummary);
        setJsonInput(JSON.stringify(unit, null, 2));
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [editId]);

  // Utils
  const compact = useCallback((obj) => {
    if (Array.isArray(obj)) {
      return obj
        .map(compact)
        .filter((v) => !(v === "" || v == null || (typeof v === "object" && Object.keys(v).length === 0)));
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
  }, []);

  const normalizeGrammarForSave = useCallback((gList) =>
    (gList || []).map((g) => {
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
      }
      return compact({
        rule: g.rule || g.title || "",
        description: g.description || g.summary || "",
        example: {
          chinese: g.example?.chinese || g.examples?.[0]?.zh || "",
          pinyin: g.example?.pinyin || g.examples?.[0]?.py || "",
          pronunciation: g.example?.pronunciation || g.examples?.[0]?.pronunciation || g.examples?.[0]?.pron || "",
          meaning: g.example?.meaning || g.examples?.[0]?.ko || "",
        },
      });
    })
  , [compact]);

  const buildPayload = useCallback(() => {
    const vocabOut = (vocabulary || []).map((v) =>
      compact({ hanzi: v.hanzi || "", pinyin: v.pinyin || "", pronunciation: v.pronunciation || "", meaning: v.meaning || "", pos: v.pos || "", tags: v.tags || [] })
    );
    const grammarOut = normalizeGrammarForSave(grammar);
    const practiceOut = Array.isArray(practice)
      ? practice
      : compact({
          reading: practice.reading || [],
          writing: practice.writing || [],
          reorder: practice.reorder || [],
          extension_phrases: practice.extension_phrases || [],
          substitution: practice.substitution || [],
        });

    return compact({
      id: (unitId ?? "").toString(),
      title, theme, goals, objectives,
      vocabulary: vocabOut,
      grammar: grammarOut,
      conversation,
      practice: practiceOut,
      summary,
    });
  }, [compact, conversation, grammar, goals, objectives, practice, summary, theme, title, unitId, vocabulary, normalizeGrammarForSave]);

  // === Save: whole ===
  const saveForm = useCallback(async () => {
    const payload = buildPayload();
    if (editId) return updateUnit(editId, payload);
    return addUnit(unitId, payload);
  }, [buildPayload, editId, unitId]);

  const saveJSON = useCallback(async () => {
    const parsed = JSON.parse(jsonInput);
    if (editId) return updateUnit(editId, parsed);
    return addUnit(unitId, parsed);
  }, [editId, jsonInput, unitId]);

  // === Save: part (supports nested path like "practice.substitution") ===
  const pathToObject = (path, value) => {
    const keys = path.split(".");
    return keys.reduceRight((acc, k) => ({ [k]: acc }), value);
  };
  const assignPath = (root, path, value) => {
    const keys = path.split(".");
    let cur = root;
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) cur[k] = value;
      else { cur[k] = cur[k] ?? {}; cur = cur[k]; }
    });
    return root;
  };

  // Build part data from current state
  const buildPartFromState = useCallback((path) => {
    switch (path) {
      case "vocabulary": return (vocabulary || []).map((v) =>
        compact({ hanzi: v.hanzi || "", pinyin: v.pinyin || "", pronunciation: v.pronunciation || "", meaning: v.meaning || "", pos: v.pos || "", tags: v.tags || [] })
      );
      case "grammar": return normalizeGrammarForSave(grammar);
      case "conversation": return conversation;
      case "practice": {
        if (Array.isArray(practice)) return practice;
        return compact({
          reading: practice.reading || [],
          writing: practice.writing || [],
          reorder: practice.reorder || [],
          extension_phrases: practice.extension_phrases || [],
          substitution: practice.substitution || [],
        });
      }
      case "practice.substitution": return (practice && !Array.isArray(practice)) ? (practice.substitution || []) : [];
      case "summary": return summary;
      default: return null;
    }
  }, [compact, conversation, grammar, normalizeGrammarForSave, practice, summary, vocabulary]);

  const savePartFromState = useCallback(async (path) => {
    const data = buildPartFromState(path);
    if (data == null) throw new Error(`Unknown path: ${path}`);
    if (editId) {
      return updateUnit(editId, pathToObject(path, data));
    } else {
      // For new doc, create full payload with the part applied
      const payload = buildPayload();
      assignPath(payload, path, data);
      return addUnit(unitId, payload);
    }
  }, [buildPayload, buildPartFromState, editId, unitId]);

  const savePartWithJSON = useCallback(async (path, raw) => {
    const parsed = raw;
    if (editId) {
      return updateUnit(editId, pathToObject(path, parsed));
    } else {
      const payload = buildPayload();
      assignPath(payload, path, parsed);
      return addUnit(unitId, payload);
    }
  }, [buildPayload, editId, unitId]);

  const value = useMemo(() => ({
    // ids
    editId,
    // state setters
    unitId, setUnitId,
    title, setTitle,
    theme, setTheme,
    goals, setGoals,
    objectives, setObjectives,
    vocabulary, setVocabulary,
    grammar, setGrammar,
    conversation, setConversation,
    practice, setPractice,
    summary, setSummary,
    jsonInput, setJsonInput,
    // helpers
    loading,
    saveForm,
    saveJSON,
    savePartFromState,
    savePartWithJSON,
    buildPartFromState, // for initializing JSON editor in modals
  }), [
    buildPartFromState, editId, goals, grammar, jsonInput, loading, practice,
    saveForm, saveJSON, savePartFromState, savePartWithJSON, summary, theme,
    title, unitId, vocabulary, conversation, objectives,
  ]);

  return <UnitEditContext.Provider value={value}>{children}</UnitEditContext.Provider>;
}
