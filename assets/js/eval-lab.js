(function () {
  "use strict";

  var app = document.getElementById("lab");
  if (!app) return;

  var base = app.getAttribute("data-base") || "../";
  function get(path, kind) {
    return fetch(base + path).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return kind === "json" ? r.json() : r.text();
    });
  }
  function jsonl(text) {
    return text.trim().split("\n").map(function (line) { return JSON.parse(line); });
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "text") node.textContent = attrs[key];
      else if (key === "class") node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  Promise.all([
    get("assets/data/eval-v1.json", "json"),
    get("assets/data/eval-v2.json", "json"),
    get("assets/data/transcripts-v1.jsonl", "text"),
    get("assets/data/transcripts-v2.jsonl", "text"),
  ]).then(function (loaded) {
    var runs = { v1: loaded[0], v2: loaded[1] };
    var answers = { v1: {}, v2: {} };
    jsonl(loaded[2]).forEach(function (row) { answers.v1[row.id] = row; });
    jsonl(loaded[3]).forEach(function (row) { answers.v2[row.id] = row; });
    start(runs, answers);
  }).catch(function (error) {
    app.textContent = "Could not load the evaluation data (" + error.message + "). If you opened this file directly from disk, serve the folder with a local web server.";
  });

  function start(runs, answers) {
    var state = { mode: "diff", category: "all", onlyFailures: false };
    var byId = { v1: {}, v2: {} };
    ["v1", "v2"].forEach(function (v) { runs[v].cases.forEach(function (c) { byId[v][c.id] = c; }); });
    var ids = runs.v2.cases.map(function (c) { return c.id; });
    var categories = [];
    runs.v2.cases.forEach(function (c) { if (categories.indexOf(c.category) < 0) categories.push(c.category); });

    function status(id) {
      var a = byId.v1[id].passed, b = byId.v2[id].passed;
      if (!a && b) return "fixed";
      if (a && !b) return "regressed";
      if (!a && !b) return "still";
      return "pass";
    }

    var controls = app.querySelector("[data-controls]");
    var score = app.querySelector("[data-score]");
    var list = app.querySelector("[data-cases]");

    function seg() {
      var wrap = el("div", { class: "seg", role: "group", "aria-label": "Which run to show" });
      [["v1", "Run v1"], ["v2", "Run v2"], ["diff", "Diff v1 \u2192 v2"]].forEach(function (pair) {
        var b = el("button", { type: "button", "aria-pressed": String(state.mode === pair[0]), text: pair[1] });
        b.addEventListener("click", function () { state.mode = pair[0]; draw(); });
        wrap.appendChild(b);
      });
      return wrap;
    }

    function drawControls() {
      controls.textContent = "";
      controls.appendChild(seg());
      var select = el("select", { class: "select", "aria-label": "Filter by category" });
      select.appendChild(el("option", { value: "all", text: "All categories" }));
      categories.forEach(function (c) { select.appendChild(el("option", { value: c, text: c.replace("_", " ") })); });
      select.value = state.category;
      select.addEventListener("change", function () { state.category = select.value; draw(); });
      controls.appendChild(select);
      var label = el("label", { class: "muted", style: "display:inline-flex;gap:8px;align-items:center;font-size:14px" });
      var box = el("input", { type: "checkbox" });
      box.checked = state.onlyFailures;
      box.addEventListener("change", function () { state.onlyFailures = box.checked; draw(); });
      label.appendChild(box);
      label.appendChild(document.createTextNode("Only what needs attention"));
      controls.appendChild(label);
    }

    function stat(value, caption) {
      return el("div", {}, [el("b", { text: value }), el("span", { text: caption })]);
    }

    function drawScore() {
      score.textContent = "";
      if (state.mode === "diff") {
        var counts = { fixed: 0, regressed: 0, still: 0 };
        ids.forEach(function (id) { var s = status(id); if (counts[s] !== undefined) counts[s]++; });
        score.appendChild(stat(Math.round(runs.v1.passed / runs.v1.total * 100) + "% \u2192 " + Math.round(runs.v2.passed / runs.v2.total * 100) + "%", "pass rate, v1 to v2"));
        score.appendChild(stat(String(counts.regressed), "regressed: read these first"));
        score.appendChild(stat(String(counts.fixed), "fixed"));
        score.appendChild(stat(String(counts.still), "still failing"));
      } else {
        var run = runs[state.mode];
        score.appendChild(stat(Math.round(run.passed / run.total * 100) + "%", "pass rate"));
        score.appendChild(stat(run.passed + " / " + run.total, "cases passed"));
        var cats = Object.keys(run.by_category);
        var worst = cats.slice().sort(function (a, b) {
          return run.by_category[a].passed / run.by_category[a].total - run.by_category[b].passed / run.by_category[b].total;
        })[0];
        score.appendChild(stat(worst.replace("_", " "), "weakest category (" + run.by_category[worst].passed + "/" + run.by_category[worst].total + ")"));
        score.appendChild(stat(String(run.total - run.passed), "failing cases"));
      }
    }

    function chip(kind, text) { return el("span", { class: "chip " + kind, text: text }); }

    function checksList(caseRow) {
      var ul = el("ul");
      caseRow.checks.forEach(function (c) {
        var li = el("li", {}, [chip(c.passed ? "pass" : "fail", c.passed ? "pass" : "fail"), el("span", {}, [el("code", { text: c.check }), document.createTextNode(c.detail ? "  " + c.detail : "")])]);
        ul.appendChild(li);
      });
      if (!caseRow.checks.length) ul.appendChild(el("li", { text: "No answer was recorded for this case." }));
      return ul;
    }

    function answerBlock(run, id) {
      var a = answers[run][id];
      var wrap = el("div");
      wrap.appendChild(el("p", { class: "muted", style: "margin:10px 0 4px;font-size:13px", text: "Recorded answer (" + run + ", hand-written)" }));
      wrap.appendChild(el("blockquote", { class: "quote", style: "font-size:1rem", text: a ? a.text : "(none)" }));
      var tools = a && a.tool_calls && a.tool_calls.length
        ? a.tool_calls.map(function (t) { return t.name + "(" + JSON.stringify(t.args) + ")"; }).join("  \u2192  ")
        : "no tools called";
      wrap.appendChild(el("p", { class: "muted", style: "margin:0 0 6px;font-size:13px" }, [el("code", { text: tools })]));
      return wrap;
    }

    function drawCases() {
      list.textContent = "";
      var shown = 0;
      ids.forEach(function (id) {
        var s = status(id);
        var row = state.mode === "diff" ? byId.v2[id] : byId[state.mode][id];
        if (state.category !== "all" && row.category !== state.category) return;
        var attention = state.mode === "diff" ? s !== "pass" : !row.passed;
        if (state.onlyFailures && !attention) return;
        shown++;

        var badge;
        if (state.mode === "diff") {
          badge = { fixed: chip("fix", "fixed"), regressed: chip("reg", "regressed"), still: chip("fail", "still failing"), pass: chip("pass", "pass in both") }[s];
        } else {
          badge = chip(row.passed ? "pass" : "fail", row.passed ? "pass" : "fail");
        }
        var summary = el("summary", {}, [
          el("span", { class: "cid", text: id }),
          el("span", {}, [el("span", { class: "prompt", text: row.prompt }), el("span", { class: "cat", text: row.category.replace("_", " ") })]),
          badge,
        ]);
        var detail = el("div", { class: "detail" });
        if (state.mode === "diff") {
          ["v1", "v2"].forEach(function (v) {
            detail.appendChild(el("h4", { text: v, style: "margin-top:10px" }));
            detail.appendChild(checksList(byId[v][id]));
            detail.appendChild(answerBlock(v, id));
          });
        } else {
          detail.appendChild(checksList(row));
          detail.appendChild(answerBlock(state.mode, id));
        }
        var d = el("details", { class: "case" }, [summary, detail]);
        if (state.mode === "diff" && s === "regressed") d.setAttribute("open", "");
        list.appendChild(el("li", {}, [d]));
      });
      if (!shown) list.appendChild(el("li", { class: "muted", style: "padding:24px 18px", text: "Nothing matches this filter." }));
    }

    function draw() { drawControls(); drawScore(); drawCases(); }
    draw();
  }
})();
