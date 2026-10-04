import { createHexagramEngine } from "./hexagram-engine.js";

const root = document.querySelector("#result-root");
const stateText = sessionStorage.getItem("dayan-current-reading");
const newQuestion = document.querySelector("#new-question");
newQuestion.addEventListener("click", () => {
  sessionStorage.removeItem("dayan-current-reading");
  window.location.assign("index.html");
});

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
    return `<div class="hex-line ${moving ? "is-moving" : ""}">
      <span class="hex-line-position">${position === 1 ? "初" : position === 6 ? "上" : ["", "", "二", "三", "四", "五"][position]}爻</span>
      <span class="line-mark ${bit ? "is-yang" : "is-yin"}" aria-label="${yinYang}爻">${bit ? "<i></i>" : "<i></i><i></i>"}</span>
      <span class="hex-line-state">${escapeHtml(state)}</span>
    </div>`;
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

function renderApp(reading, datasets) {
  const { hexagrams, routes, rules } = datasets;
  const resolved = createHexagramEngine(hexagrams, routes).resolve(reading.lines);
  const { hexByKey, movingPositions, route } = resolved;
  const baseHex = hexByKey.base;

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
  function selectTab(key) {
    const hex = hexByKey[key];
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
      <div class="hexagram-lines">${chart}</div>
      <div class="hexagram-note"><b>${escapeHtml(noteText)}</b><br>卦序 ${String(hex.sequence).padStart(2, "0")} · 六爻自下而上生成</div>
    </article>
    <article class="reading-card">${renderHexContent(hex, key, baseHex, route, reading.lines, movingPositions, rules)}</article>`;
  }
  const tabs = [...root.querySelectorAll(".hex-tab")];
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
