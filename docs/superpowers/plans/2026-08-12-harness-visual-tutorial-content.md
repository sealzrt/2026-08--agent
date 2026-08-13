# Harness Visual Tutorial Content Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `harness-visual-tutorial` Markdown tutorial richer, more detailed, and easier for beginners to learn.

**Architecture:** Keep the existing 10-chapter structure, image references, and runnable code examples. Improve the learning flow around the code by adding goals, mental models, step-by-step explanations, expected outputs, common pitfalls, and review prompts.

**Tech Stack:** Markdown tutorial content, Python code blocks, existing PNG diagrams.

## Global Constraints

- Modify Markdown content only.
- Do not edit `harness-visual-tutorial/images/`.
- Do not edit `harness-visual-tutorial/scripts/`.
- Preserve existing chapter filenames and image links.
- Keep tutorial language simple Chinese.
- Keep code examples copy-paste runnable unless an edit is explicitly explanatory text.

---

### Task 1: Improve Tutorial Entry And Writing Standard

**Files:**
- Modify: `harness-visual-tutorial/README.md`
- Modify: `harness-visual-tutorial/plan.md`

**Interfaces:**
- Consumes: Existing tutorial chapter map.
- Produces: Clear learning path and chapter-writing standard used by all chapters.

- [ ] Add a "how to study this tutorial" section to `README.md`.
- [ ] Add a "chapter reading method" section explaining picture first, concept second, code third, exercise last.
- [ ] Add a "copy code safely" note explaining that each chapter is independent unless stated otherwise.
- [ ] Update `plan.md` with the enriched chapter structure: learning goals, new mechanism, execution flow, expected result, common pitfalls.
- [ ] Verify all chapter links still point to existing Markdown files.

### Task 2: Enrich Concept Foundation Chapters

**Files:**
- Modify: `harness-visual-tutorial/ch01-what-is-harness.md`
- Modify: `harness-visual-tutorial/ch02-agent-loop.md`
- Modify: `harness-visual-tutorial/ch03-tool-use.md`

**Interfaces:**
- Consumes: Existing explanations and code samples.
- Produces: Beginner-friendly foundation chapters with clearer progression.

- [ ] In ch01, add learning goals, "what Harness does not do", and a beginner checklist.
- [ ] In ch02, explain why messages are resent each round and what stops the loop.
- [ ] In ch02, add expected terminal behavior for simple input and tool-request input.
- [ ] In ch03, split the tool system into define, implement, register, execute.
- [ ] In ch03, add a mini example showing one `bash` tool call from request to result.
- [ ] Add common pitfalls sections to ch02 and ch03.

### Task 3: Enrich Safety And State Chapters

**Files:**
- Modify: `harness-visual-tutorial/ch04-permission.md`
- Modify: `harness-visual-tutorial/ch05-memory.md`

**Interfaces:**
- Consumes: Existing permission and memory examples.
- Produces: Clearer explanation of safety boundaries and persistent memory.

- [ ] In ch04, explain the difference between permission checks and model safety instructions.
- [ ] In ch04, add examples for allow, deny, and ask decisions.
- [ ] In ch04, add a warning that string matching is teaching-level, not production security.
- [ ] In ch05, explain memory write versus recall with a concrete two-run scenario.
- [ ] In ch05, add an explanation of `.agent_memory.json` fields.
- [ ] Add common pitfalls sections to ch04 and ch05.

### Task 4: Enrich Advanced Mechanism Chapters

**Files:**
- Modify: `harness-visual-tutorial/ch06-subagent.md`
- Modify: `harness-visual-tutorial/ch07-error-handling.md`
- Modify: `harness-visual-tutorial/ch08-context-management.md`

**Interfaces:**
- Consumes: Existing subagent, retry, and context examples.
- Produces: Clearer advanced chapters with better "when to use it" guidance.

- [ ] In ch06, explain when subagents help and when they are overkill.
- [ ] In ch06, clarify what data crosses the boundary between main Agent and subagent.
- [ ] In ch07, distinguish API failure, tool failure, and model-level failure.
- [ ] In ch07, add a "what the user sees" section for retry, fallback, and alert.
- [ ] In ch08, explain context window pressure using a concrete message-count example.
- [ ] In ch08, clarify that archives are for humans/future tools, not automatically visible to the LLM.

### Task 5: Enrich Assembly And Next-Step Chapters

**Files:**
- Modify: `harness-visual-tutorial/ch09-assembly.md`
- Modify: `harness-visual-tutorial/ch10-next-steps.md`

**Interfaces:**
- Consumes: Existing final assembly and expansion map.
- Produces: Clearer final integration and next learning paths.

- [ ] In ch09, add a module-by-module reading guide before the long code block.
- [ ] In ch09, add a full test script for manual validation.
- [ ] In ch09, clarify which modules run before and after each LLM call.
- [ ] In ch10, add "choose your next route" guidance based on learner goals.
- [ ] In ch10, add small starter exercises for each route.
- [ ] Verify final tutorial flow is coherent from README through ch10.

