import { createHexagramEngine } from "./hexagram-engine.js";

const root = document.querySelector("#result-root");
const stateText = sessionStorage.getItem("dayan-current-reading");
const newQuestion = document.querySelector("#new-question");
newQuestion.addEventListener("click", () => {
  sessionStorage.removeItem("dayan-current-reading");
  window.location.assign("index.html");
});
const exportMarkdownButton = document.querySelector("#export-markdown");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function lineState(value) {
  return ({ 6: "老阴 · 动", 7: "少阳", 8: "少阴", 9: "老阳 · 动" })[value] || "";
}

function titleFor(hex) {
  return `${String(hex.sequence).padStart(2, "0")} ${hex.name_simplified}`;
}

function quoteCard(item, style) {
  const type = safeText(item.type, "相关原典").replaceAll("_", " · ");
  const position = item.position ? ` · ${item.position}` : "";
  const original = safeText(item.text, "");
  const translation = safeText(item.translation, "");
  return `<article class="quote-card ${style}">
    <span class="quote-kicker">${escapeHtml(type + position)}</span>
    <p>${escapeHtml(original)}</p>
    ${translation ? `<small>${escapeHtml(translation)}</small>` : ""}
  </article>`;
}

function renderLines(hex, activePositions, values, key) {
  const bits = hex.identity.line_pattern_bottom_up.map(value => value === "阳" ? 1 : 0);
  const topToBottom = bits.map((bit, index) => ({ bit, index })).reverse();
  return topToBottom.map(({ bit, index }) => {
    const position = index + 1;
    const moving = key === "base" && activePositions.includes(position);
    const transformed = key === "changed" && activePositions.includes(position);
    const yinYang = bit ? "阳" : "阴";
    const state = key === "base" ? lineState(values[index]) : (transformed ? "由动爻变入" : yinYang);
    const lineName = position === 1 ? "初" : position === 6 ? "上" : ["", "", "二", "三", "四", "五"][position];
    return `<button class="hex-line ${moving ? "is-moving" : ""}" type="button" data-line-position="${position}" aria-expanded="false" aria-controls="line-reading-popover" aria-label="${lineName}爻，${yinYang}${moving ? "，本次动爻" : ""}，查看爻辞">
      <span class="hex-line-position">${lineName}爻</span>
      <span class="line-mark ${bit ? "is-yang" : "is-yin"}" aria-label="${yinYang}爻">${bit ? "<i></i>" : "<i></i><i></i>"}</span>
      <span class="hex-line-state">${escapeHtml(state)}</span>
    </button>`;
  }).join("");
}

function renderLineNotes(hex, activePositions, key) {
  const stages = hex.six_line_arc?.stages || [];
  return `<details class="lines-details">
    <summary>六爻原文与阶段说明</summary>
    <div>${stages.map(stage => {
      const isMoving = key === "base" && activePositions.includes(stage.stage_number);
      const sourceChanged = key === "changed" && activePositions.includes(stage.stage_number);
      return `<article class="all-line-item ${isMoving ? "is-moving" : ""}">
        <h4>${escapeHtml(stage.line_position || `${stage.stage_number}爻`)} · ${escapeHtml(stage.stage_label || "")}
          <span>${isMoving ? "本次动爻" : sourceChanged ? "由本次动爻变入" : ""}</span></h4>
        <p>${escapeHtml(stage.original || "")}</p>
        <p class="all-line-translation">${escapeHtml(stage.translation || "")}</p>
      </article>`;
    }).join("")}</div>
  </details>`;
}

function renderMovingDetails(hex, activePositions, values) {
  const stages = hex.six_line_arc?.stages || [];
  const selected = activePositions.map(position => stages.find(stage => stage.stage_number === position)).filter(Boolean);
  const special = hex.six_line_arc?.special_use;
  const useSpecial = activePositions.length === 6 && special;
  const stageHtml = selected.map(stage => `<article class="moving-line-detail">
    <h4>${escapeHtml(stage.line_position)} <span>${escapeHtml(lineState(values[stage.stage_number - 1]))}</span></h4>
    <p class="line-original">${escapeHtml(stage.original || "")}</p>
    <p class="line-translation">${escapeHtml(stage.translation || "")}</p>
    <p class="line-role">${escapeHtml(stage.role_in_arc || "")}</p>
  </article>`).join("");
  const specialHtml = useSpecial ? `<article class="moving-line-detail">
    <h4>${escapeHtml(special.line_position || "用九 / 用六")} <span>特殊总用辞</span></h4>
    <p class="line-original">${escapeHtml(special.original || "")}</p>
    <p class="line-translation">${escapeHtml(special.translation || "")}</p>
    <p class="line-role">${escapeHtml(special.role_in_arc || special.note || "")}</p>
  </article>` : "";
  if (!stageHtml && !specialHtml) return `<p class="rule-explanation">本卦无动爻，依取辞规则读取本卦卦辞。</p>`;
  return `<div class="moving-lines-block"><h3 class="content-label">本次变化焦点 · ${activePositions.length} 爻</h3>${specialHtml}${stageHtml}</div>`;
}

function relationCallout(baseHex, key) {
  let section = null;
  let label = "";
  let title = "";
  const source = baseHex;
  if (key === "mutual") {
    section = source.nuclear_hexagram; label = "互卦 · 内部运行结构"; title = "观察本卦中段形成的潜在动力";
  } else if (key === "opposite") {
    section = source.opposite_hexagram; label = "错卦 · 阴阳反置"; title = "对照关键条件全部反置后的结构";
  } else if (key === "reverse") {
    section = source.reverse_hexagram; label = "综卦 · 反向视角"; title = "从上下颠倒的方向重新观察本卦";
  } else if (key === "changed") {
    label = "变卦 · 动爻尽变"; title = "呈现本次变化完成后的结构倾向";
    return `<aside class="relation-note"><b>${escapeHtml(label)}</b><p>${escapeHtml(title)}。之卦用于观察变化方向，不表示已确定的未来结果。</p></aside>`;
  }
  if (!section) return "";
  const rows = [section.construction, section.inner_dynamic, section.interpretive_value,
    section.caution, section.opposite_condition, section.what_it_reveals,
    section.reversed_viewpoint, section.what_changes_when_viewpoint_reverses].filter(Boolean);
  return `<aside class="relation-note"><b>${escapeHtml(label)} · ${escapeHtml(title)}</b>${rows.map(row => `<p>${escapeHtml(row)}</p>`).join("")}</aside>`;
}

function renderHexContent(hex, key, baseHex, route, values, movingPositions, rules) {
  const judgment = safeText(hex.judgment_text?.original, "卦辞资料未提供");
  const literal = safeText(hex.judgment_translation?.literal_translation, "");
  const interpretation = safeText(hex.judgment_translation?.interpretive_translation, "");
  const exegesis = hex.judgment_exegesis || {};
  const selectedRule = rules.moving_count_rules?.[String(movingPositions.length)];
  const routePrimary = route.primary_texts || [];
  const routeSecondary = route.secondary_texts || [];
  const routeNote = route.rule_note || "";
  const isBase = key === "base";
  const mainReading = isBase ? `<section class="route-section">
    <h3>本次占问取辞</h3>
    <p class="rule-explanation">${escapeHtml(selectedRule?.practical || "先看本卦整体时势，再结合本次动爻与变化结构。")}</p>
    ${selectedRule?.historical_rule ? `<p class="rule-explanation"><b>取辞规则：</b>${escapeHtml(selectedRule.historical_rule)}<br><b>规则层级：</b>${escapeHtml(selectedRule.source_level || "")}</p>` : ""}
    ${routeNote ? `<p class="rule-explanation">${escapeHtml(routeNote)}</p>` : ""}
    <div class="quote-list">${routePrimary.map(item => quoteCard(item, "primary")).join("") || `<p class="rule-explanation">当前路径没有额外的主取辞文本。</p>`}</div>
    ${routeSecondary.length ? `<h3 class="content-label">辅助文本</h3><div class="quote-list">${routeSecondary.map(item => quoteCard(item, "secondary")).join("")}</div>` : ""}
    <div class="content-block">${renderMovingDetails(hex, movingPositions, values)}</div>
  </section>` : "";
  const mainInterpretation = safeText(exegesis.core_message, safeText(hex.summaries?.one_sentence, ""));
  const currentRole = isBase
    ? safeText(hex.practical_role, "本卦代表当前整体时势，动爻标出本次变化焦点。")
    : "以下内容取自本卦级数据库，并与本次卦象关系并列呈现。";
  const commentary = hex.tuan || {};
  const image = hex.great_image || {};
  const dynamics = safeText(hex.six_line_arc?.compressed_chain, "");
  return `<div class="reading-heading">
    <div><h2>${escapeHtml(titleFor(hex))} · 卦义与原典</h2><p>${escapeHtml(currentRole)}</p></div>
    <span class="mode-pill">${isBase ? "主判断层" : "卦象资料"}</span>
  </div>
  <div class="reading-content">
    ${relationCallout(baseHex, key)}
    ${mainReading}
    <section class="content-block">
      <p class="content-label">卦辞</p>
      <blockquote class="judgment-text">${escapeHtml(judgment)}</blockquote>
      ${literal ? `<p class="translation-text">${escapeHtml(literal)}</p>` : ""}
      ${interpretation ? `<p class="interpretive-note">${escapeHtml(interpretation)}</p>` : ""}
    </section>
    <section class="content-block">
      <p class="content-label">卦义摘要</p>
      <p class="core-message">${escapeHtml(mainInterpretation || "数据库暂未提供该卦摘要。")}</p>
      ${dynamics ? `<p class="interpretive-note"><b>六爻演化：</b>${escapeHtml(dynamics)}</p>` : ""}
      ${safeText(exegesis.risk_logic) ? `<p class="interpretive-note"><b>需要留意：</b>${escapeHtml(exegesis.risk_logic)}</p>` : ""}
    </section>
    ${commentary.original ? `<details class="lines-details"><summary>《彖传》与卦辞关系</summary><p class="translation-text">${escapeHtml(commentary.original)}</p><p class="translation-text">${escapeHtml(commentary.translation || "")}</p><p class="interpretive-note">${escapeHtml(commentary.paragraph_explanation || "")}</p></details>` : ""}
    ${image.original ? `<details class="lines-details"><summary>《大象传》</summary><blockquote class="judgment-text">${escapeHtml(image.original)}</blockquote><p class="translation-text">${escapeHtml(image.translation || "")}</p><p class="interpretive-note">${escapeHtml(image.limits_of_application || "")}</p></details>` : ""}
    ${renderLineNotes(hex, movingPositions, key)}
    <p class="source-note">原典文字、卦级解释与六爻演化模型分层展示。现代结构分析不替代《周易》经文。</p>
  </div>`;
}

function markdownInline(value) {
  return String(value ?? "").replace(/[\\`*_{}\[\]()#+.!|>]/g, "\\$&").replace(/\s+/g, " ").trim();
}

function markdownQuote(value) {
  return String(value ?? "").trim().split(/\r?\n/).map(line => `> ${line}`).join("\n");
}

function appendMarkdownText(lines, heading, value) {
  const text = safeText(value, "");
  if (!text) return;
  lines.push(`#### ${heading}`, text, "");
}

function renderMarkdownQuoteRecords(lines, heading, records) {
  if (!records?.length) return;
  lines.push(`### ${heading}`, "");
  records.forEach(item => {
    const label = [safeText(item.type, "相关原典").replaceAll("_", " · "), safeText(item.position, "")].filter(Boolean).join(" · ");
    lines.push(`#### ${label}`, markdownQuote(item.text));
    if (safeText(item.translation)) lines.push("", `译：${safeText(item.translation)}`);
    lines.push("");
  });
}

function buildMarkdown(reading, resolved, rules) {
  const { hexByKey, movingPositions, route } = resolved;
  const baseHex = hexByKey.base;
  const timestamp = new Date(reading.createdAt);
  const displayTime = Number.isNaN(timestamp.getTime())
    ? "时间未记录"
    : timestamp.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const movingRule = rules.moving_count_rules?.[String(movingPositions.length)] || {};
  const lineNames = ["初", "二", "三", "四", "五", "上"];
  const lineStates = { 6: "老阴", 7: "少阳", 8: "少阴", 9: "老阳" };
  const rows = [
    "# 大衍筮法 · 占问记录",
    "",
    `- **占问**：${markdownInline(reading.question)}`,
    `- **类别**：${markdownInline(reading.category)}`,
    `- **起卦时间**：${displayTime}`,
    "- **起卦方式**：大衍筮法逐爻模拟；每爻经过三变得出 6、7、8、9 之一，六爻自下而上生成。",
    "",
    "## 六爻生成结果（自下而上）",
    ""
  ];

  reading.lines.forEach((value, index) => {
    const moving = value === 6 || value === 9;
    rows.push(`- **${lineNames[index]}爻**：${lineStates[value]}（${value}）${moving ? " · 动爻" : ""}`);
  });
  rows.push("", `- **本卦**：${titleFor(baseHex)} ${baseHex.symbol || ""}`,
    `- **动爻**：${movingPositions.length ? movingPositions.map(position => `${lineNames[position - 1]}爻`).join("、") : "无"}`,
    `- **变卦**：${titleFor(hexByKey.changed)} ${hexByKey.changed.symbol || ""}`, "");

  if (movingRule.historical_rule || movingRule.practical) {
    rows.push("### 本次取辞规则", "");
    if (movingRule.historical_rule) rows.push(`- **规则**：${movingRule.historical_rule}`);
    if (movingRule.source_level) rows.push(`- **规则来源层级**：${movingRule.source_level}`);
    if (movingRule.practical) rows.push("", movingRule.practical);
    if (route.rule_note) rows.push("", route.rule_note);
    rows.push("");
  }
  renderMarkdownQuoteRecords(rows, "本次路径主取文本", route.primary_texts);
  renderMarkdownQuoteRecords(rows, "本次路径辅助文本", route.secondary_texts);

  const relationInfo = {
    mutual: ["互卦关系资料", baseHex.nuclear_hexagram],
    opposite: ["错卦关系资料", baseHex.opposite_hexagram],
    reverse: ["综卦关系资料", baseHex.reverse_hexagram]
  };
  const sections = [
    ["base", "本卦"], ["changed", "变卦"], ["mutual", "互卦"],
    ["opposite", "错卦"], ["reverse", "综卦"]
  ];
  sections.forEach(([key, label]) => {
    const hex = hexByKey[key];
    const composition = hex.trigram_composition || {};
    const upper = composition.upper_trigram || {};
    const lower = composition.lower_trigram || {};
    rows.push(`## ${label}：${titleFor(hex)} ${hex.symbol || ""}`, "",
      `- **上卦**：${safeText(upper.name, "未提供")}`,
      `- **下卦**：${safeText(lower.name, "未提供")}`, "",
      "### 卦辞", "", markdownQuote(hex.judgment_text?.original || "卦辞资料未提供"), "");
    appendMarkdownText(rows, "直译", hex.judgment_translation?.literal_translation);
    appendMarkdownText(rows, "释义", hex.judgment_translation?.interpretive_translation);
    appendMarkdownText(rows, "卦义摘要", hex.judgment_exegesis?.core_message || hex.summaries?.one_sentence);
    appendMarkdownText(rows, "需要留意", hex.judgment_exegesis?.risk_logic);
    appendMarkdownText(rows, "卦在本次占问中的作用", hex.dayan_divination?.current_hexagram_role || hex.practical_role);
    appendMarkdownText(rows, "《彖传》", hex.tuan?.original);
    appendMarkdownText(rows, "《彖传》译文", hex.tuan?.translation);
    appendMarkdownText(rows, "《彖传》说明", hex.tuan?.paragraph_explanation);
    appendMarkdownText(rows, "《大象传》", hex.great_image?.original);
    appendMarkdownText(rows, "《大象传》译文", hex.great_image?.translation);
    appendMarkdownText(rows, "《大象传》应用边界", hex.great_image?.limits_of_application);

    if (key === "base") {
      appendMarkdownText(rows, "六爻演化", hex.six_line_arc?.compressed_chain);
    }
    const stages = hex.six_line_arc?.stages || [];
    if (stages.length) {
      rows.push("### 六爻爻辞", "");
      [...stages].sort((a, b) => Number(a.stage_number) - Number(b.stage_number)).forEach(stage => {
        const position = Number(stage.stage_number);
        const isMoving = key === "base" && movingPositions.includes(position);
        const changedIn = key === "changed" && movingPositions.includes(position);
        rows.push(`#### ${safeText(stage.line_position, `${position}爻`)} · ${safeText(stage.stage_label, "")} ${isMoving ? "· 本次动爻" : changedIn ? "· 由本次动爻变化而来" : ""}`, "", markdownQuote(stage.original || "爻辞资料未提供"));
        if (safeText(stage.translation)) rows.push("", `译：${stage.translation}`);
        if (safeText(stage.role_in_arc)) rows.push("", `阶段说明：${stage.role_in_arc}`);
        rows.push("");
      });
    }
    if (key === "base" && movingPositions.length === 6 && hex.six_line_arc?.special_use) {
      const special = hex.six_line_arc.special_use;
      rows.push(`### ${safeText(special.line_position, "特殊用辞")}`, "", markdownQuote(special.original || ""));
      if (safeText(special.translation)) rows.push("", `译：${special.translation}`);
      if (safeText(special.note || special.role_in_arc)) rows.push("", safeText(special.note || special.role_in_arc));
      rows.push("");
    }
    if (relationInfo[key]) {
      const [relationTitle, relation] = relationInfo[key];
      rows.push(`### ${relationTitle}`, "");
      ["construction", "inner_dynamic", "interpretive_value", "caution", "opposite_condition",
        "what_it_reveals", "reversed_viewpoint", "what_changes_when_viewpoint_reverses"]
        .map(field => relation?.[field]).filter(Boolean).forEach(value => rows.push(value, ""));
    }
  });

  rows.push("---", "", "资料来自本项目 V4 卦级数据库及 4096 变化路径索引。以上为原典与数据库内容整理，未包含 AI 吉凶断语。", "");
  return rows.join("\n");
}

function downloadMarkdown(reading, resolved, rules) {
  const content = buildMarkdown(reading, resolved, rules);
  const date = new Date(reading.createdAt);
  const dateLabel = Number.isNaN(date.getTime()) ? "占问记录" : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
  const hexagramSequence = String(resolved.hexByKey.base.sequence).padStart(2, "0");
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `大衍易占-${dateLabel}-${hexagramSequence}卦.md`;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderApp(reading, datasets) {
  const { hexagrams, routes, rules } = datasets;
  const resolved = createHexagramEngine(hexagrams, routes).resolve(reading.lines);
  const { hexByKey, movingPositions, route } = resolved;
  const baseHex = hexByKey.base;
  let currentLineHex = baseHex;
  let pinnedLinePosition = null;
  let lastLineButton = null;
  let suppressFocusPreview = false;

  const tabInfo = [
    ["base", "本卦"], ["changed", "变卦"], ["mutual", "互卦"],
    ["opposite", "错卦"], ["reverse", "综卦"]
  ];
  const timestamp = new Date(reading.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  root.innerHTML = `
    <section class="question-summary">
      <div><span class="question-summary-label">本次占问</span><h1>${escapeHtml(reading.question)}</h1></div>
      <div class="question-meta"><span class="meta-category">${escapeHtml(reading.category)}</span><time>${escapeHtml(timestamp)}</time></div>
    </section>
    <section class="result-overview" aria-label="起卦摘要">
      <div class="overview-card"><span>本卦 · 当前时势</span><b>${escapeHtml(titleFor(baseHex))}</b><small>${escapeHtml(baseHex.symbol)}</small></div>
      <div class="overview-card accent"><span>动爻 · 变化焦点</span><b>${movingPositions.length ? escapeHtml(movingPositions.map(position => ["", "初", "二", "三", "四", "五", "上"][position] + "爻").join("、")) : "无动爻"}</b><small>${movingPositions.length} 爻发动</small></div>
      <div class="overview-card"><span>变卦 · 变化趋势</span><b>${escapeHtml(titleFor(hexByKey.changed))}</b><small>${escapeHtml(hexByKey.changed.symbol)}</small></div>
    </section>
    <nav class="hex-tabs" role="tablist" aria-label="切换卦象">
      ${tabInfo.map(([key, label]) => `<button class="hex-tab" id="hex-tab-${key}" type="button" role="tab" data-key="${key}" aria-controls="hex-detail" aria-selected="${key === "base"}">${label}<strong>${escapeHtml(titleFor(hexByKey[key]))}</strong></button>`).join("")}
    </nav>
    <section class="hex-detail-layout" id="hex-detail" role="tabpanel"></section>`;

  const pane = root.querySelector("#hex-detail");
  exportMarkdownButton.disabled = false;
  exportMarkdownButton.addEventListener("click", () => downloadMarkdown(reading, resolved, rules));
  function hideLineReading() {
    const popup = pane.querySelector("#line-reading-popover");
    if (popup) popup.hidden = true;
    pane.querySelectorAll(".hex-line[aria-expanded='true']").forEach(button => button.setAttribute("aria-expanded", "false"));
  }
  function showLineReading(button, pin = false) {
    const popup = pane.querySelector("#line-reading-popover");
    if (!popup) return;
    const position = Number(button.dataset.linePosition);
    const stage = currentLineHex.six_line_arc?.stages?.find(item => Number(item.stage_number) === position) || {};
    const lineName = stage.line_position || `${position}爻`;
    const readingValue = currentLineHex === baseHex ? lineState(reading.lines[position - 1]) : "";
    const original = safeText(stage.original, "数据库暂未提供此爻的原文。");
    const translation = safeText(stage.translation, "");
    const role = safeText(stage.role_in_arc, "");
    pane.querySelectorAll(".hex-line[aria-expanded='true']").forEach(item => item.setAttribute("aria-expanded", "false"));
    button.setAttribute("aria-expanded", "true");
    lastLineButton = button;
    if (pin) pinnedLinePosition = position;
    popup.innerHTML = `<div class="line-reading-heading"><div><span>第 ${position} 爻${readingValue ? ` · ${escapeHtml(readingValue)}` : ""}</span><h3>${escapeHtml(lineName)} · 爻辞</h3></div><button class="line-reading-close" type="button" data-close-line-reading aria-label="关闭爻辞">关闭</button></div>
      <p class="line-reading-original">${escapeHtml(original)}</p>
      ${translation ? `<p class="line-reading-translation">${escapeHtml(translation)}</p>` : ""}
      ${role ? `<p class="line-reading-role">${escapeHtml(role)}</p>` : ""}`;
    popup.hidden = false;
  }
  function selectTab(key) {
    const hex = hexByKey[key];
    currentLineHex = hex;
    pinnedLinePosition = null;
    root.querySelectorAll(".hex-tab").forEach(button => button.setAttribute("aria-selected", String(button.dataset.key === key)));
    pane.setAttribute("aria-labelledby", `hex-tab-${key}`);
    const trigram = hex.trigram_composition || {};
    const lower = trigram.lower_trigram || {};
    const upper = trigram.upper_trigram || {};
    const chart = renderLines(hex, movingPositions, reading.lines, key);
    const noteText = key === "base"
      ? "当前局面从这里出发；标记出的动爻是本次占问的变化焦点。"
      : key === "changed"
        ? movingPositions.length
          ? `由本卦 ${movingPositions.map(pos => ["", "初", "二", "三", "四", "五", "上"][pos] + "爻").join("、")} 变化后形成。`
          : "本次无动爻，变卦与本卦相同。"
        : "此卦属于辅助结构，供对照理解，不替代本卦与动爻的判断主线。";
    pane.innerHTML = `<article class="hex-visual-card">
      <p class="visual-kicker">${key === "base" ? "本次起卦" : key === "changed" ? "变化完成后的结构" : "辅助理解本次卦象"}</p>
      <h2 class="visual-name">${escapeHtml(hex.name_simplified)}<small>${escapeHtml(hex.full_name || "")}</small></h2>
      <span class="visual-symbol" aria-hidden="true">${escapeHtml(hex.symbol)}</span>
      <div class="trigram-labels">
        <div class="trigram-label">上卦<b>${escapeHtml(upper.name || "")}</b></div>
        <div class="trigram-label">下卦<b>${escapeHtml(lower.name || "")}</b></div>
      </div>
      <div class="hexagram-widget">
        <div class="hexagram-lines">${chart}</div>
        <aside class="line-reading-popover" id="line-reading-popover" aria-live="polite" hidden></aside>
      </div>
      <div class="hexagram-note"><b>${escapeHtml(noteText)}</b><br>卦序 ${String(hex.sequence).padStart(2, "0")} · 六爻自下而上生成</div>
    </article>
    <article class="reading-card">${renderHexContent(hex, key, baseHex, route, reading.lines, movingPositions, rules)}</article>`;
  }
  const tabs = [...root.querySelectorAll(".hex-tab")];
  pane.addEventListener("pointerover", event => {
    const button = event.target.closest(".hex-line[data-line-position]");
    if (button && !pinnedLinePosition) showLineReading(button);
  });
  pane.addEventListener("focusin", event => {
    if (suppressFocusPreview) {
      suppressFocusPreview = false;
      return;
    }
    const button = event.target.closest(".hex-line[data-line-position]");
    if (button && !pinnedLinePosition) showLineReading(button);
  });
  pane.addEventListener("pointerout", event => {
    const widget = event.target.closest(".hexagram-widget");
    if (widget && !widget.contains(event.relatedTarget) && !pinnedLinePosition) hideLineReading();
  });
  pane.addEventListener("focusout", event => {
    const widget = event.target.closest(".hexagram-widget");
    if (widget && !widget.contains(event.relatedTarget) && !pinnedLinePosition) hideLineReading();
  });
  pane.addEventListener("click", event => {
    const close = event.target.closest("[data-close-line-reading]");
    if (close) {
      pinnedLinePosition = null;
      hideLineReading();
      suppressFocusPreview = true;
      lastLineButton?.focus();
      return;
    }
    const button = event.target.closest(".hex-line[data-line-position]");
    if (button) {
      const position = Number(button.dataset.linePosition);
      if (pinnedLinePosition === position) {
        pinnedLinePosition = null;
        hideLineReading();
      } else {
        showLineReading(button, true);
      }
      return;
    }
    if (!event.target.closest(".hexagram-widget")) {
      pinnedLinePosition = null;
      hideLineReading();
    }
  });
  document.addEventListener("keydown", event => {
    const popup = pane.querySelector("#line-reading-popover");
    if (event.key === "Escape" && popup && !popup.hidden) {
      pinnedLinePosition = null;
      hideLineReading();
      suppressFocusPreview = true;
      lastLineButton?.focus();
    }
  });
  document.addEventListener("click", event => {
    if (pinnedLinePosition && !event.target.closest(".hexagram-widget")) {
      pinnedLinePosition = null;
      hideLineReading();
    }
  });
  tabs.forEach(button => {
    button.addEventListener("click", () => selectTab(button.dataset.key));
    button.addEventListener("keydown", event => {
      const currentIndex = tabs.indexOf(button);
      const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length
        : event.key === "ArrowLeft" ? (currentIndex - 1 + tabs.length) % tabs.length
          : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      selectTab(tabs[nextIndex].dataset.key);
    });
  });
  selectTab("base");
}

async function start() {
  if (!stateText) {
    window.location.replace("index.html");
    return;
  }
  let reading;
  try {
    reading = JSON.parse(stateText);
  } catch {
    sessionStorage.removeItem("dayan-current-reading");
    window.location.replace("index.html");
    return;
  }
  if (!Array.isArray(reading.lines) || reading.lines.length !== 6 || reading.lines.some(value => ![6, 7, 8, 9].includes(value))) {
    sessionStorage.removeItem("dayan-current-reading");
    window.location.replace("index.html");
    return;
  }
  try {
    const [hexagrams, routes, rules] = await Promise.all([
      fetch("data/hexagrams.json").then(response => { if (!response.ok) throw new Error("卦级数据库读取失败"); return response.json(); }),
      fetch("data/routes-index.json").then(response => { if (!response.ok) throw new Error("4096 路径索引读取失败"); return response.json(); }),
      fetch("data/rules.json").then(response => { if (!response.ok) throw new Error("大衍规则读取失败"); return response.json(); })
    ]);
    const enriched = hexagrams.map(hex => {
      return { ...hex, practical_role: hex.dayan_divination?.current_hexagram_role };
    });
    renderApp(reading, { hexagrams: enriched, routes, rules });
  } catch (error) {
    root.innerHTML = `<section class="error-state"><div><h1>卦象资料暂时无法载入</h1><p>${escapeHtml(error instanceof Error ? error.message : "请检查本地服务器和 data 目录。")}</p><p>请通过本地静态服务器打开本网站，例如在 website 目录运行 <code>python -m http.server 8000</code>。</p><a href="index.html">返回占卜首页</a></div></section>`;
  }
}

start();
