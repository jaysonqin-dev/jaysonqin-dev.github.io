(function () {
  "use strict";

  var root = document.getElementById("loop");
  if (!root) return;

  // Real kinds of corrections, generalized. Each is judged against the same four-part quality bar.
  var items = [
    {
      label: "A data fix",
      quote: "Change this row's stage from P2 to P1.",
      gates: [
        [false, "General", "It fixes one record. Nothing here would help in a future session."],
        [true, "Specific", "It is clear and actionable, but only for this row."],
        [false, "Has a concrete example", "There is no right-versus-wrong pattern to show."],
        [true, "Not already covered", "No existing rule is involved."],
      ],
      capture: false,
      why: "A one-off. Do the work, record nothing. Logging every minor correction buries the rules that matter.",
      rule: null,
    },
    {
      label: "A formula checked too late",
      quote: "That's wrong. The field is already net of reserved units, so you subtracted them twice.",
      gates: [
        [true, "General", "Any metric the agent encodes can have this problem, in any dataset."],
        [true, "Specific", "The fix is a concrete step: look for the source's definition first."],
        [true, "Has a concrete example", "Right: 100 sellable. Wrong: 70, after deducting 30 again."],
        [true, "Not already covered", "No existing rule says to verify against the source's definition."],
      ],
      capture: true,
      why: "Qualifies on all four. Write the rule now and tell the user in one line what was captured.",
      rule: "Verify a metric against the source's own definition (glossary, measure, formula column)\nbefore encoding it. If it can't be checked, label it \"verify before use\".\nWhy: a rule written from a verbal description would have deducted a quantity twice.\nRight: available = 100 (already net). Wrong: available - reserved = 70.",
    },
    {
      label: "An unrequested option",
      quote: "I never asked for that. I said the top of each folder, not the bookmarks bar.",
      gates: [
        [true, "General", "Offering features nobody asked for, or building from a loose phrase, happens in any project."],
        [true, "Specific", "Restate an ambiguous phrase before building from it."],
        [true, "Has a concrete example", "\"At the top\" was read as the bar when the user meant each folder."],
        [true, "Not already covered", "The existing rules covered clarifying questions, not restating a phrase."],
      ],
      capture: true,
      why: "Qualifies. It prevents a class of wasted work, not just this one mistake.",
      rule: "Offer only what was requested. Before building from an ambiguous phrase,\nrestate it in your own words and confirm.\nWhy: a feature the user never asked for cost a round of rework.",
    },
    {
      label: "A style note, once",
      quote: "Make this email shorter.",
      gates: [
        [false, "General", "One email, one data point. It might be this email's context."],
        [true, "Specific", "Clear enough to act on."],
        [false, "Has a concrete example", "Only the single email."],
        [true, "Not already covered", "No length rule exists yet."],
      ],
      capture: false,
      why: "Skip for now. If it repeats across drafts, the pattern becomes a style rule. Three of them are a signal; one is noise.",
      rule: null,
    },
    {
      label: "The draft that wasn't used",
      quote: "(No complaint. The user ignored the draft and wrote their own reply.)",
      gates: [
        [true, "General", "Any drafting task can fail this way, so the lesson transfers."],
        [true, "Specific", "Diff the two versions and name what changed."],
        [true, "Has a concrete example", "The user's version added a next step and did not repeat the other person's words."],
        [true, "Not already covered", "Existing rules waited for explicit feedback."],
      ],
      capture: true,
      why: "Silence is feedback too. When the user writes their own version, the difference between the two is the lesson.",
      rule: "Infer feedback from behavior. If the user doesn't use a draft and writes their own,\ndiff the two and extract why (tone, precision, missing next step).\nDon't just echo the other person's wording; add a stance or a concrete next step.",
    },
    {
      label: "Said again, in other words",
      quote: "Don't restate what they said back to them.",
      gates: [
        [true, "General", "Yes, it is a general point."],
        [true, "Specific", "Yes."],
        [true, "Has a concrete example", "Yes."],
        [false, "Not already covered", "The rule above already covers it. A second copy only adds noise and a chance to contradict."],
      ],
      capture: false,
      why: "Already covered. If the existing rule was ambiguous enough that it got missed, sharpen that rule. Don't add another.",
      rule: null,
    },
    {
      label: "An edit and its test, together",
      quote: "Your check passed, but it ran before the change landed.",
      gates: [
        [true, "General", "Any workflow that edits and then verifies can hit it."],
        [true, "Specific", "Run the edit first, then the test, as separate steps."],
        [true, "Has a concrete example", "A mutation check \"passed\" because the test ran before the edit."],
        [true, "Not already covered", "No rule about ordering dependent tool calls."],
      ],
      capture: true,
      why: "Qualifies. It is a failure of the process, and it was invisible until it produced a false pass.",
      rule: "Don't batch an edit and the command that tests it in one tool-call block.\nIndependent calls can run in parallel.\nWhy: a mutation check passed because the test ran before the edit landed.",
    },
  ];

  var list = root.querySelector("[data-list]");
  var out = root.querySelector("[data-out]");
  var tally = document.querySelector("[data-tally]");
  var visited = {};

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

  function show(index) {
    var item = items[index];
    visited[index] = item.capture ? "capture" : "skip";
    Array.prototype.forEach.call(list.querySelectorAll("button"), function (button, i) {
      button.setAttribute("aria-selected", String(i === index));
    });
    out.textContent = "";
    out.appendChild(el("blockquote", { class: "quote", text: item.quote }));
    var gates = el("ul", { class: "gates" });
    item.gates.forEach(function (gate) {
      var li = el("li", { class: gate[0] ? "y" : "n" }, [
        el("span", { class: "mk", "aria-hidden": "true", text: gate[0] ? "\u2713" : "\u2715" }),
        el("span", {}, [document.createTextNode(gate[1]), el("em", { text: gate[2] })]),
      ]);
      gates.appendChild(li);
    });
    out.appendChild(gates);
    out.appendChild(el("div", { class: "verdict " + (item.capture ? "cap" : "skip"), text: item.capture ? "Capture as a rule" : "Don't record it" }));
    out.appendChild(el("p", { text: item.why }));
    if (item.rule) {
      var rule = el("div", { class: "rule-out" });
      rule.appendChild(el("span", { class: "t-dim", text: "# rule added to the instructions\n" }));
      rule.appendChild(document.createTextNode(item.rule));
      rule.style.whiteSpace = "pre-wrap";
      out.appendChild(rule);
    } else {
      var none = el("div", { class: "rule-out", style: "white-space:pre-wrap" });
      none.appendChild(el("span", { class: "t-dim", text: "# nothing recorded" }));
      out.appendChild(none);
    }
    var seen = Object.keys(visited).length;
    var kept = Object.keys(visited).filter(function (k) { return visited[k] === "capture"; }).length;
    if (tally) tally.textContent = seen + " of " + items.length + " reviewed: " + kept + " became rules, " + (seen - kept) + " did not.";
  }

  items.forEach(function (item, i) {
    var button = el("button", { type: "button", role: "tab", "aria-selected": "false" }, [
      el("small", { text: "Correction " + (i + 1) }),
      document.createTextNode(item.label),
    ]);
    button.addEventListener("click", function () { show(i); });
    list.appendChild(el("li", {}, [button]));
  });
  show(1);
})();
