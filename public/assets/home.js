import { createLineCast } from "./yarrow.js";

const form = document.querySelector("#question-form");
const questionInput = document.querySelector("#question");
const questionCount = document.querySelector("#question-count");
const ritualOverlay = document.querySelector("#ritual-overlay");
const ritualLines = document.querySelector("#ritual-lines");
const ritualProgress = document.querySelector("#ritual-progress");
const ritualStatus = document.querySelector("#ritual-status");
const methodToggle = document.querySelector("#method-toggle");
const methodPopover = document.querySelector("#method-popover");
const positions = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
let isCasting = false;

function pause(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function lineMeaning(value) {
  return ({ 6: "老阴 · 动", 7: "少阳", 8: "少阴", 9: "老阳 · 动" })[value];
}

function renderRitualRows() {
  ritualLines.innerHTML = positions.map((name, index) => `
    <div class="ritual-line" data-line="${index}">
      <span class="ritual-line-name">${name}</span>
      <span class="ritual-line-progress">待起</span>
      <span class="ritual-line-result">···</span>
    </div>`).join("");
}

async function runCast(question, category) {
  if (isCasting) return;
  isCasting = true;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  ritualOverlay.hidden = false;
  document.body.classList.add("dialog-open");
  document.querySelector("#ritual-question").textContent = `「${question}」 · ${category}`;
  renderRitualRows();

  const lines = [];
  let completeChanges = 0;
  try {
    for (let index = 0; index < 6; index += 1) {
      const row = ritualLines.querySelector(`[data-line="${index}"]`);
      const progress = row.querySelector(".ritual-line-progress");
      const result = row.querySelector(".ritual-line-result");
      const lineCast = createLineCast();
      for (let changeIndex = 0; changeIndex < 3; changeIndex += 1) {
        const change = lineCast.nextChange();
        const hangNote = change.hungOne ? " · 挂一" : "";
        progress.textContent = `分二 ${change.leftPile}/${change.rightPile}${hangNote} · 揲四 ${change.leftRemainder}+${change.rightRemainder} · 归奇${change.removed} · 留${change.after}`;
        ritualStatus.textContent = `第 ${index + 1} 爻 · 第 ${change.change} 变：揲四归奇`;
        completeChanges += 1;
        ritualProgress.style.width = `${(completeChanges / 18) * 100}%`;
        await pause(105);
      }
      const line = lineCast.finish();
      lines.push(line.value);
      progress.textContent = "三变已成爻";
      result.textContent = `${line.value} · ${lineMeaning(line.value)}`;
      if (line.value === 6 || line.value === 9) result.classList.add("is-moving");
      await pause(90);
    }
    sessionStorage.setItem("dayan-current-reading", JSON.stringify({
      question,
      category,
      lines,
      createdAt: new Date().toISOString()
    }));
    ritualStatus.textContent = "六爻已成，正在读取卦象资料…";
    await pause(420);
    window.location.assign("result.html");
  } catch (error) {
    isCasting = false;
    submitButton.disabled = false;
    ritualStatus.textContent = error instanceof Error ? error.message : "起卦未完成，请重试。";
    window.setTimeout(() => {
      ritualOverlay.hidden = true;
      document.body.classList.remove("dialog-open");
    }, 1800);
  }
}

questionInput.addEventListener("input", () => {
  questionInput.setCustomValidity("");
  questionCount.textContent = String(questionInput.value.length);
});

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const question = questionInput.value.trim();
  const category = form.querySelector("input[name='category']:checked")?.value;
  if (!question) {
    questionInput.setCustomValidity("请写下你想占问的具体问题。");
    questionInput.reportValidity();
    return;
  }
  questionInput.setCustomValidity("");
  if (!category) return;
  runCast(question, category);
});

methodToggle.addEventListener("click", () => {
  const opening = methodPopover.hidden;
  methodPopover.hidden = !opening;
  methodToggle.setAttribute("aria-expanded", String(opening));
  methodToggle.querySelector("span").textContent = opening ? "−" : "＋";
});
