# AGENT_MEMORY

## Purpose

This file is the project memory document for future AI agent sessions.
Read it before making changes.
Update it after meaningful product, UI, behavior, workflow, or git-state changes.
Also update the `Next Tasks` section when priorities become clearer, are completed, or are replaced.

## Project Identity

- Name: `MultiChat`
- Type: Chrome Extension
- Root Path: `/Users/xiaohe/Workspace/01-Projects/MultiChat`
- GitHub: `https://github.com/xiaozhua33/MultiChat`
- Stable Tag: `v0.1.0`
- Main Branch: `main`

## Product Summary

MultiChat is a Chrome extension for talking to multiple AI web apps at the same time.
The layout is:

- top: multiple AI iframes shown side by side
- bottom: one shared composer for sending to selected AIs

Replies are not merged into a single conversation view.
Each AI stays in its own native page and native session.

## Next Tasks

Use this section as the handoff queue for the next session.
Keep it short and current.

### Active Priorities

- Continue optimizing the current version without breaking the stable baseline tagged as `v0.1.0`.
- Prefer follow-up work on a new feature branch instead of directly stacking risky changes on `main`.
- Current optimization branch: `feat/youhua-20260530`.

### Good Candidates For Future Improvement

- Improve long-term stability of image sending across all currently supported AI sites.
- Continue polishing UI consistency where small styling mismatches still appear after iterative changes.
- Keep Claude behavior under watch after future refactors because its send path is frame-sensitive.

### How To Maintain This Section

- Remove completed items.
- Add newly requested priorities from the user.
- Reorder items when priorities change.
- Keep this section concise; detailed reasoning belongs in the main sections below.

## Currently Supported AIs

- ChatGPT
- Gemini
- DeepSeek
- Claude
- Grok
- Doubao

## Removed AIs

These were tried and then intentionally removed:

- Qwen / Tongyi
- Wenxin
- Spark
- Yuanbao
- Kimi

Reason: the user only wants Doubao kept among domestic AIs.

## Current Feature State

### Core Messaging

- Bottom composer sends one message to all selected AIs.
- Selected AIs are controlled from the top bar.
- AI windows can be added and removed dynamically.
- The intended behavior is to avoid interrupting other existing sessions when toggling windows.

### Claude

- Claude auto-send was broken before.
- Root cause: multiple Claude frames received the same send message, and a wrong frame overwrote the correct state.
- Current fix: only the Claude frame that actually contains the input box handles sending.
- Result: Claude now syncs and auto-sends with the other AIs.

### Image Sending

- Supports image selection with the image button.
- Supports drag-and-drop images into the bottom composer.
- Supports pasting screenshots or copied images with paste / Command+V.
- Supports image-only send and text+image send.
- This is a best-effort site-adapter implementation based on nearby upload inputs / attachment buttons.

## Current UI State

### Header

- Header title shows only `MultiChat`.
- No emoji in the product title.

### Top AI Selector

- Top selector is text-only buttons.
- No icons in top AI selection buttons.
- Selected state uses deep blue background with white text.
- Unselected state uses the light current background.

### AI Window Headers

- AI frame headers are gray text only.
- AI icons are hidden in frame headers.
- Header colors are unified instead of per-AI colors.

### AI Panel Layout

- AI window split ratios are draggable for 2-6 windows (2=2x1, 3=3x1, 4=2x2, 5/6=3x2).
- Split ratios are persisted via `chrome.storage.local` key `aiPanelSplitSizes`.

### Composer

- Bottom composer placeholder is:
  `输入问题，同时发给所选AI...`
- Image button text is:
  `🗾`
- Send button uses the same deep-blue color family as the selected top buttons.
- Image button, input, and send button are vertically centered.
- Bottom composer zone uses a light gray-blue background to separate it from the AI window area.
- Inner and outer composer background were unified to the same light gray-blue color for visual consistency.

## Important Files

- `manifest.json`
- `frame-rules.json`
- `background.js`
- `chat.html`
- `chat.css`
- `chat.js`
- `content.js`

## File Responsibilities

- `manifest.json`: extension config, permissions, content scripts, frame permissions
- `frame-rules.json`: DNR rules for iframe embedding related header removal
- `background.js`: broadcasts shared send events to AI pages
- `chat.html`: main extension page structure
- `chat.css`: main extension UI styles
- `chat.js`: main page logic, AI selector, composer, image selection/drag/paste
- `content.js`: per-site adapters for finding inputs, sending prompts, sending images, reading replies

## Working Rules For Future Sessions

- Always operate in the real project directory:
  `/Users/xiaohe/Workspace/01-Projects/MultiChat`
- Do not accidentally work in the old path:
  `/Users/xiaohe/Workspace/01-Projects/chaojia-installable`
- Preserve current working behavior unless the user explicitly asks to change it.
- Do not re-add removed domestic AI sites unless the user explicitly asks.
- Be careful with Claude behavior; Claude send logic is sensitive to frame handling.
- Prefer updating existing files rather than creating unnecessary new files.

## Git State

- Repository already exists and is connected to GitHub.
- Remote `origin` points to:
  `https://github.com/xiaozhua33/MultiChat.git`
- Stable tag `v0.1.0` has already been created and pushed.
- Current workflow recommendation:
  create a new branch before major follow-up optimization.

## Suggested Workflow

Before a new optimization round:

```bash
cd /Users/xiaohe/Workspace/01-Projects/MultiChat
git checkout -b feat/next-optimization
```

If a future session needs to return to the stable version:

```bash
git checkout v0.1.0
```

## Update Checklist

Future AI agents should update this file after meaningful changes to any of these:

- supported AI list
- removed AI list
- major UI decisions
- message sending behavior
- image sending behavior
- Claude-specific behavior
- project name / branding
- git workflow / stable tag / branch strategy
- important file structure changes

## Last Known Snapshot

This file was created after the following milestones were completed:

- product renamed to `MultiChat`
- stable version tagged as `v0.1.0`
- top selector converted to text-only button menu
- bottom composer supports text, image selection, drag-and-drop, and paste
- frame header style unified to gray text only
- bottom composer area visually separated with a unified light gray-blue background
