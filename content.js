"use strict";
(() => {
  // 通用工具函数
  function setContentEditableText(editor, content) {
    editor.focus();
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection?.removeAllRanges();
      selection?.addRange(range);
      if (typeof document.execCommand === "function") {
        document.execCommand("insertText", false, content);
      } else {
        editor.textContent = content;
      }
    } catch {
      editor.textContent = content;
    }
    editor.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: content }));
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: content }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function deepQuerySelector(root, selector) {
    const direct = root.querySelector?.(selector);
    if (direct) return direct;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      const elements = current.querySelectorAll?.("*");
      if (!elements) continue;
      for (const el of elements) {
        const shadow = el.shadowRoot;
        if (!shadow) continue;
        const found = shadow.querySelector(selector);
        if (found) return found;
        stack.push(shadow);
      }
    }
    return null;
  }

  function deepQuerySelectorAll(root, selector) {
    const results = [];
    const direct = root.querySelectorAll?.(selector);
    if (direct) results.push(...direct);
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      const elements = current.querySelectorAll?.("*");
      if (!elements) continue;
      for (const el of elements) {
        const shadow = el.shadowRoot;
        if (!shadow) continue;
        results.push(...shadow.querySelectorAll(selector));
        stack.push(shadow);
      }
    }
    return results;
  }

  function querySelectorFirst(selectors) {
    for (const selector of selectors.split(",").map((s) => s.trim())) {
      const el = deepQuerySelector(document, selector);
      if (el) return el;
    }
    return null;
  }

  function waitForElement(selectors, timeoutMs) {
    const immediate = querySelectorFirst(selectors);
    if (immediate) return Promise.resolve(immediate);
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const el = querySelectorFirst(selectors);
        if (el) {
          window.clearInterval(timer);
          resolve(el);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(timer);
          reject(new Error(`Element not found: ${selectors}`));
        }
      }, 250);
    });
  }

  function waitForClickableButton(selectors, timeoutMs, errorMsg) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const buttons = selectors.split(",").map((s) => s.trim()).flatMap((sel) => deepQuerySelectorAll(document, sel));
        const btn = buttons.find((b) => !(b instanceof HTMLButtonElement) || !b.disabled && b.getAttribute("aria-disabled") !== "true");
        if (btn) {
          window.clearInterval(timer);
          resolve(btn);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(timer);
          reject(new Error(errorMsg));
        }
      }, 250);
    });
  }

  function isClickableButton(el) {
    if (!(el instanceof HTMLButtonElement)) return true;
    return !el.disabled && el.getAttribute("aria-disabled") !== "true";
  }

  function isVisibleElement(el) {
    if (!(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clickElementLikeUser(button) {
    const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    button.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    button.focus?.();
    for (const type of events) {
      button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    button.click?.();
  }

  function dataUrlToFile(attachment) {
    const match = attachment.dataUrl?.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!match) throw new Error(`Invalid attachment data: ${attachment.name || "image"}`);
    const mimeType = attachment.type || match[1] || "application/octet-stream";
    const isBase64 = Boolean(match[2]);
    const payload = match[3] || "";
    const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], attachment.name || `image-${Date.now()}.png`, { type: mimeType });
  }

  function getComposerContainer(editor) {
    return editor.closest?.(
      'form, [role="group"], [class*="composer"], [class*="input"], [class*="footer"], [class*="chat-input"], [class*="message-input"]'
    ) || editor.parentElement || document.body;
  }

  function scoreElementByEditor(editor, el) {
    const editorRect = editor.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const dx = Math.abs(rect.left - editorRect.left) + Math.abs(rect.right - editorRect.right);
    const dy = Math.abs(rect.top - editorRect.top) + Math.abs(rect.bottom - editorRect.bottom);
    return dx + dy;
  }

  function findClosestFileInput(editor) {
    const inputs = deepQuerySelectorAll(document, 'input[type="file"]')
      .filter((input) => !input.disabled)
      .filter((input) => {
        const accept = input.getAttribute("accept") || "";
        return accept === "" || /image|png|jpg|jpeg|webp|gif/i.test(accept);
      });
    if (inputs.length === 0) return null;

    const composer = getComposerContainer(editor);
    const sameComposer = inputs.find((input) => composer.contains(input));
    if (sameComposer) return sameComposer;

    const sameForm = editor.closest?.("form");
    if (sameForm) {
      const formInput = inputs.find((input) => sameForm.contains(input));
      if (formInput) return formInput;
    }

    return inputs
      .map((input) => ({ input, score: scoreElementByEditor(editor, input) }))
      .sort((a, b) => a.score - b.score)[0]?.input ?? null;
  }

  function findAttachmentTrigger(editor) {
    const selectors = [
      'button[aria-label*="attach" i]',
      'button[aria-label*="upload" i]',
      'button[aria-label*="image" i]',
      'button[aria-label*="photo" i]',
      'button[aria-label*="file" i]',
      'button[aria-label*="附件"]',
      'button[aria-label*="上传"]',
      'button[aria-label*="图片"]',
      'button[aria-label*="照片"]',
      'button[title*="attach" i]',
      'button[title*="upload" i]',
      'button[title*="image" i]',
      'button[title*="附件"]',
      'button[title*="上传"]',
      '[role="button"][aria-label*="attach" i]',
      '[role="button"][aria-label*="upload" i]',
      '[role="button"][aria-label*="image" i]',
      '[role="button"][aria-label*="附件"]',
      '[role="button"][aria-label*="上传"]'
    ].join(", ");

    const buttons = deepQuerySelectorAll(document, selectors)
      .filter((button) => isVisibleElement(button))
      .filter((button) => !(button instanceof HTMLButtonElement) || isClickableButton(button));
    if (buttons.length === 0) return null;

    const composer = getComposerContainer(editor);
    const sameComposer = buttons.find((button) => composer.contains(button));
    if (sameComposer) return sameComposer;

    return buttons
      .map((button) => ({ button, score: scoreElementByEditor(editor, button) }))
      .sort((a, b) => a.score - b.score)[0]?.button ?? null;
  }

  async function attachImagesNearEditor(editor, attachments) {
    if (!attachments || attachments.length === 0) return false;
    const files = attachments.map(dataUrlToFile);
    let fileInput = findClosestFileInput(editor);
    if (!fileInput) {
      const trigger = findAttachmentTrigger(editor);
      if (trigger) {
        clickElementLikeUser(trigger);
        await sleep(400);
        fileInput = findClosestFileInput(editor);
      }
    }
    if (!fileInput) {
      throw new Error("Image input not found");
    }

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(900);
    return true;
  }

  // ChatGPT 适配器
  function createChatGPTAdapter() {
    const EDITOR_SELECTORS = 'form[data-type="unified-composer"] #prompt-textarea[contenteditable="true"], #prompt-textarea.ProseMirror[contenteditable="true"]';
    const SEND_BUTTON_SELECTORS = 'button[data-testid="send-button"], button[aria-label*="发送"], button[aria-label*="Send"]';
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);

    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }

    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      id: "chatgpt",
      getResponseContainers() {
        return [...document.querySelectorAll('[data-message-author-role="assistant"]')];
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const hasStopButton = buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (hasStopButton) return true;
        return document.querySelector('.result-streaming[aria-busy="true"], [aria-busy="true"] .result-streaming, [data-testid*="thinking"], [data-testid*="reasoning"]') !== null;
      },
      async stopGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 10000);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
        }
        if (content) {
          setContentEditableText(editor, content);
        }
        if (!autoSend) return;
        const sendBtn = await waitForClickableButton(SEND_BUTTON_SELECTORS, 10000, "Send button not found or not clickable");
        sendBtn.click();
      }
    };
  }

  // Gemini 适配器
  function createGeminiAdapter() {
    const EDITOR_SELECTORS = 'div.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"]';
    const SEND_BUTTON_SELECTORS = 'button.send-button[aria-label*="发送"], button.send-button[aria-label*="Send"], button[aria-label*="Send message"], button[aria-label*="发送消息"]';
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);

    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }

    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      id: "gemini",
      getResponseContainers() {
        return [...document.querySelectorAll("model-response, .model-response-text, message-content")];
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        return buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
      },
      async stopGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 10000);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
        }
        if (content) {
          setContentEditableText(editor, content);
        }
        if (!autoSend) return;
        try {
          const sendBtn = await waitForClickableButton(SEND_BUTTON_SELECTORS, 5000, "Send button not found");
          sendBtn.click();
        } catch {
          editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
          editor.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
          editor.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        }
      }
    };
  }

  // DeepSeek 适配器
  function createDeepSeekAdapter() {
    const EDITOR_SELECTORS = 'div[contenteditable="true"][role="textbox"], textarea[placeholder*="发送消息"], textarea[placeholder*="Message"]';
    const SEND_BUTTON_SELECTORS = 'button[type="submit"], button[aria-label*="发送"], button[aria-label*="Send"], button:has(svg[class*="send"])';
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);

    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }

    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      id: "deepseek",
      getResponseContainers() {
        return [...document.querySelectorAll('[class*="message"], [class*="response"], [class*="assistant"]')];
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        return buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
      },
      async stopGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 10000);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
        }
        if (content && editor.tagName === "TEXTAREA") {
          editor.value = content;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (content) {
          setContentEditableText(editor, content);
        }
        if (!autoSend) return;
        try {
          const sendBtn = await waitForClickableButton(SEND_BUTTON_SELECTORS, 5000, "Send button not found");
          sendBtn.click();
        } catch {
          editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true, shiftKey: false }));
        }
      }
    };
  }

  // Claude 适配器
  function createClaudeAdapter() {
    const EDITOR_SELECTORS = 'div.ProseMirror[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"][data-placeholder*="发消息"], div[contenteditable="true"][data-placeholder*="Message"], div[contenteditable="true"][placeholder*="发消息"], textarea[placeholder*="发消息"], textarea[placeholder*="Message"], div[contenteditable="true"]';
    const SEND_BUTTON_SELECTORS = 'button[type="submit"], button[data-testid*="send"], button[data-testid*="Send"], button[aria-label*="Send"], button[aria-label*="发送"], button[title*="Send"], button[title*="发送"], button:has(svg[data-icon*="paper-airplane"])';
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);

    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }

    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getSendButtons() {
      return SEND_BUTTON_SELECTORS
        .split(",")
        .map((s) => s.trim())
        .flatMap((selector) => deepQuerySelectorAll(document, selector))
        .filter((btn) => isClickableButton(btn) && isVisibleElement(btn));
    }

    function getVisibleClickableControls() {
      return [
        ...deepQuerySelectorAll(document, "button"),
        ...deepQuerySelectorAll(document, '[role="button"]')
      ].filter((el, index, arr) => arr.indexOf(el) === index)
        .filter((el) => isVisibleElement(el))
        .filter((el) => !(el instanceof HTMLButtonElement) || isClickableButton(el));
    }

    function isInside(container, target) {
      return container instanceof Node && target instanceof Node && container.contains(target);
    }

    function findPreferredSendButton(editor) {
      const buttons = getSendButtons();
      if (buttons.length === 0) {
        return findFallbackClaudeButton(editor);
      }

      const editorForm = editor.closest?.("form");
      if (editorForm) {
        const sameFormBtn = buttons.find((btn) => isInside(editorForm, btn));
        if (sameFormBtn) return sameFormBtn;
      }

      const editorContainer = editor.closest?.(
        '[role="group"], [class*="composer"], [class*="input"], [class*="footer"], [class*="chat-input"], [class*="message-input"]'
      );
      if (editorContainer) {
        const nearbyBtn = buttons.find((btn) => isInside(editorContainer, btn));
        if (nearbyBtn) return nearbyBtn;
      }

      const editorRect = editor.getBoundingClientRect();
      return buttons
        .map((btn) => {
          const rect = btn.getBoundingClientRect();
          const dx = rect.left - editorRect.right;
          const dy = rect.top - editorRect.bottom;
          return { btn, score: Math.abs(dx) + Math.abs(dy) };
        })
        .sort((a, b) => a.score - b.score)[0]?.btn ?? buttons[buttons.length - 1];
    }

    function findFallbackClaudeButton(editor) {
      const editorContainer = editor.closest?.(
        '[role="group"], [class*="composer"], [class*="input"], [class*="footer"], [class*="chat-input"], [class*="message-input"]'
      ) || editor.parentElement;
      const candidates = getVisibleClickableControls()
        .filter((el) => el !== editor)
        .filter((el) => {
          if (editorContainer && isInside(editorContainer, el)) return true;
          const rect = el.getBoundingClientRect();
          const editorRect = editor.getBoundingClientRect();
          return rect.left >= editorRect.left - 40 && rect.top >= editorRect.top - 40;
        });
      if (candidates.length === 0) return null;

      const editorRect = editor.getBoundingClientRect();
      return candidates
        .map((btn) => {
          const rect = btn.getBoundingClientRect();
          const horizontalBias = Math.max(0, editorRect.right - rect.right);
          const verticalBias = Math.max(0, editorRect.bottom - rect.bottom);
          const score = horizontalBias + verticalBias - rect.right * 0.001 - rect.bottom * 0.001;
          return { btn, score };
        })
        .sort((a, b) => a.score - b.score)[0]?.btn ?? null;
    }

    function clickLikeUser(button) {
      const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
      button.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      button.focus?.();
      for (const type of events) {
        button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      button.click?.();
    }

    function pressEnter(editor) {
      const eventInit = {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        shiftKey: false
      };
      editor.focus?.();
      editor.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      editor.dispatchEvent(new KeyboardEvent("keypress", eventInit));
      editor.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    }

    function reportDebug(detail) {
      try {
        window.__CHAOJIA_CLAUDE_LAST_DEBUG__ = detail;
      } catch {}
      chrome.runtime.sendMessage({
        type: "ROLE_STATUS",
        site: "claude",
        status: "debug",
        detail
      }).catch(() => {});
    }

    return {
      id: "claude",
      canHandleSend() {
        return Boolean(querySelectorFirst(EDITOR_SELECTORS));
      },
      getResponseContainers() {
        return deepQuerySelectorAll(document, '[class*="message-content"], [class*="assistant-message"], [data-testid*="message-assistant"]');
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = deepQuerySelectorAll(document, "button");
        return buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
      },
      async stopGenerating() {
        const buttons = deepQuerySelectorAll(document, "button");
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 10000);
        reportDebug(`已找到输入框: ${editor.tagName.toLowerCase()}`);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
          reportDebug(`已添加图片: ${attachments.length}`);
        }
        if (content && editor.tagName === "TEXTAREA") {
          editor.value = content;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (content) {
          setContentEditableText(editor, content);
        }
        if (content) {
          reportDebug("已填入内容");
        }
        if (!autoSend) return;
        await sleep(150);

        const sendBtn = findPreferredSendButton(editor);
        if (sendBtn) {
          const btnLabel = (sendBtn.getAttribute("aria-label") || sendBtn.getAttribute("title") || sendBtn.textContent || sendBtn.tagName).replace(/\s+/g, " ").trim().slice(0, 24);
          reportDebug(`已点发送按钮: ${btnLabel || sendBtn.tagName.toLowerCase()}`);
          clickLikeUser(sendBtn);
          await sleep(400);
          if (this.isGenerating()) return;
          sendBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          sendBtn.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          await sleep(250);
          if (this.isGenerating()) return;
          sendBtn.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true, cancelable: true }));
          sendBtn.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true, cancelable: true }));
          await sleep(250);
          if (this.isGenerating()) return;
          reportDebug("按钮点击后未触发发送");
        } else {
          reportDebug("未找到发送按钮");
        }

        const form = editor.closest?.("form");
        if (form) {
          reportDebug("尝试提交表单");
          const formButton = findPreferredSendButton(editor);
          if (formButton && form.requestSubmit) {
            form.requestSubmit(formButton);
          } else {
            form.requestSubmit?.();
          }
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await sleep(400);
          if (this.isGenerating()) return;
          reportDebug("表单提交后未触发发送");
        }

        reportDebug("尝试回车发送");
        pressEnter(editor);
        await sleep(400);
        if (!this.isGenerating()) {
          reportDebug("发送未触发");
        }
      }
    };
  }

  // Grok (X) 适配器
  function createGrokAdapter() {
    const EDITOR_SELECTORS = 'div[contenteditable="true"], textarea[placeholder*="发消息"], textarea[placeholder*="Message"], textarea[placeholder*="Grok"]';
    const SEND_BUTTON_SELECTORS = 'button[aria-label*="发送"], button[aria-label*="Send"], button[type="submit"], button[data-testid*="tweetButton"]';
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);

    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }

    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      id: "grok",
      getResponseContainers() {
        return [...document.querySelectorAll('[class*="message"], [class*="response"], [class*="assistant"]')];
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        return buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
      },
      async stopGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 10000);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
        }
        if (content && editor.tagName === "TEXTAREA") {
          editor.value = content;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (content) {
          setContentEditableText(editor, content);
        }
        if (!autoSend) return;
        try {
          const sendBtn = await waitForClickableButton(SEND_BUTTON_SELECTORS, 5000, "Send button not found");
          sendBtn.click();
        } catch {
          editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true, shiftKey: false }));
        }
      }
    };
  }

  function createSimpleAdapter(adapterId, editorSelectors, sendButtonSelectors, responseSelectors) {
    const EDITOR_SELECTORS = editorSelectors;
    const SEND_BUTTON_SELECTORS = sendButtonSelectors;
    const RESPONSE_SELECTORS = responseSelectors;
    const STOP_RE = /stop|stopping|停止|中止/i;
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "SVG"]);
    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node instanceof HTMLElement && SKIP_TAGS.has(node.tagName)) return "";
      let result = "";
      for (const child of Array.from(node.childNodes)) {
        result += extractText(child);
      }
      return result;
    }
    function cleanText(raw) {
      return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }
    return {
      id: adapterId,
      getResponseContainers() {
        return [...document.querySelectorAll(RESPONSE_SELECTORS)];
      },
      getAllAssistantReplies() {
        return this.getResponseContainers().map((c) => cleanText(extractText(c))).filter((t) => t.length > 0);
      },
      readResponseText(node) {
        return cleanText(extractText(node));
      },
      isGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        return buttons.some((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
      },
      async stopGenerating() {
        const buttons = [...document.querySelectorAll("button")];
        const stopBtn = buttons.find((b) => {
          const label = b.getAttribute("aria-label") ?? b.textContent ?? "";
          return STOP_RE.test(label);
        });
        if (!stopBtn) return false;
        if (!isClickableButton(stopBtn)) return false;
        stopBtn.click();
        return true;
      },
      async fillAndSend(content, autoSend = true, attachments = []) {
        const editor = await waitForElement(EDITOR_SELECTORS, 15000);
        if (attachments.length > 0) {
          await attachImagesNearEditor(editor, attachments);
        }
        if (content && editor.tagName === "TEXTAREA") {
          editor.value = content;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (content) {
          setContentEditableText(editor, content);
        }
        if (!autoSend) return;
        try {
          const sendBtn = await waitForClickableButton(SEND_BUTTON_SELECTORS, 8000, "Send button not found");
          sendBtn.click();
        } catch {
          editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true, shiftKey: false }));
        }
      }
    };
  }

  function createDoubaoAdapter() {
    return createSimpleAdapter(
      "doubao",
      'textarea[placeholder*="输入"], textarea[placeholder*="问题"], textarea[placeholder*="消息"], textarea[placeholder*="Message"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"][data-placeholder]',
      'button[type="submit"], button[aria-label*="发送"], button[aria-label*="Send"], button[title*="发送"], button[title*="Send"]',
      'main [class*="assistant"], main [class*="message"], main [class*="answer"], main [class*="markdown"], [data-role*="assistant"], [class*="assistant-message"]'
    );
  }

  // 获取当前站点的适配器
function getActiveChatSiteAdapter() {
  const host = location.hostname;
  if (host === "chatgpt.com" || host === "chat.openai.com") return createChatGPTAdapter();
  if (host === "gemini.google.com") return createGeminiAdapter();
  if (host === "chat.deepseek.com") return createDeepSeekAdapter();
  if (host === "claude.ai" || host.endsWith(".claude.ai")) return createClaudeAdapter();
  if (host === "grok.com") return createGrokAdapter();
  if (host === "www.doubao.com" || host.endsWith(".doubao.com")) return createDoubaoAdapter();
  return null;
}

  // 回复观察器
  function createReplyObserver(options) {
    const { siteAdapter, onReply, onStatusChange } = options;
    let baselineContainers = [];
    let observer = null;
    let pollTimer = null;
    let timeoutTimer = null;
    let stabilityTimer = null;
    let lastText = "";
    let active = false;

    function clearTimers() {
      if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
      if (timeoutTimer !== null) { clearTimeout(timeoutTimer); timeoutTimer = null; }
      if (stabilityTimer !== null) { clearTimeout(stabilityTimer); stabilityTimer = null; }
    }

    function stopObserving() {
      if (observer) { observer.disconnect(); observer = null; }
    }

    function isNewContainer(el) {
      return !baselineContainers.includes(el);
    }

    function getNewReplies() {
      const all = siteAdapter.getResponseContainers();
      const newOnes = all.filter(isNewContainer);
      return newOnes.map((c) => siteAdapter.readResponseText(c)).filter((t) => t.length > 0);
    }

    function getLatestReplyText() {
      const replies = getNewReplies();
      return replies.length > 0 ? replies[replies.length - 1] : "";
    }

    function checkStability() {
      const text = getLatestReplyText();
      if (text.length === 0) return;
      const isShort = text.length <= 50;
      const stabilityMs = isShort ? 5000 : 1500;
      if (text === lastText) {
        if (stabilityTimer === null) {
          stabilityTimer = setTimeout(() => {
            if (!active) return;
            const finalText = getLatestReplyText();
            if (finalText.length > 0 && !siteAdapter.isGenerating()) {
              onReply(finalText);
              onStatusChange("idle");
              stopInternal();
            }
          }, stabilityMs);
        }
      } else {
        lastText = text;
        if (stabilityTimer !== null) { clearTimeout(stabilityTimer); stabilityTimer = null; }
        onStatusChange("generating");
      }
    }

    function setupObserver() {
      stopObserving();
      observer = new MutationObserver(() => {
        if (!active) return;
        checkStability();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    function startPolling() {
      if (pollTimer !== null) return;
      pollTimer = setInterval(() => {
        if (!active) return;
        checkStability();
        if (!siteAdapter.isGenerating()) {
          const text = getLatestReplyText();
          if (text.length > 0 && text === lastText) {
            onReply(text);
            onStatusChange("idle");
            stopInternal();
          }
        }
      }, 2000);
    }

    function startTimeout() {
      if (timeoutTimer !== null) return;
      timeoutTimer = setTimeout(() => {
        if (!active) return;
        const text = getLatestReplyText();
        if (text.length > 0) { onReply(text); }
        onStatusChange("error", "timeout");
        stopInternal();
      }, 120000);
    }

    function stopInternal() {
      active = false;
      stopObserving();
      clearTimers();
    }

    return {
      captureBaseline() {
        baselineContainers = siteAdapter.getResponseContainers();
        lastText = "";
      },
      startPolling() {
        active = true;
        setupObserver();
        startPolling();
        startTimeout();
        onStatusChange("generating");
      },
      stop() {
        stopInternal();
      }
    };
  }

  // 主入口
  if (typeof window.__CHAOJIA_LOADED__ === "undefined") {
    window.__CHAOJIA_LOADED__ = true;
    if (window.parent !== window) {
      const siteAdapter = getActiveChatSiteAdapter();
      if (siteAdapter) {
        const replyObserver = createReplyObserver({
          siteAdapter,
          onReply(text) {
            chrome.runtime.sendMessage({
              type: "ROLE_REPLY", site: siteAdapter.id, content: text });
          },
          onStatusChange(status, detail) {
            chrome.runtime.sendMessage({
              type: "ROLE_STATUS", site: siteAdapter.id, status, detail });
          }
        });

        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
          if (message.type === "FILL_AND_SEND") {
            const { content, autoSend, attachments = [] } = message;
            if (siteAdapter.id === "claude") {
              if (typeof siteAdapter.canHandleSend === "function" && !siteAdapter.canHandleSend()) {
                sendResponse({ ok: true, skipped: true });
                return;
              }
              const lockKey = "__CHAOJIA_CLAUDE_ACTIVE_FRAME__";
              try {
                if (window.top && window.top[lockKey] && window.top[lockKey] !== window) {
                  sendResponse({ ok: true, skipped: true });
                  return;
                }
                if (window.top) {
                  window.top[lockKey] = window;
                  setTimeout(() => {
                    try {
                      if (window.top && window.top[lockKey] === window) {
                        window.top[lockKey] = null;
                      }
                    } catch {}
                  }, 5000);
                }
              } catch {}
            }
            replyObserver.captureBaseline();
            replyObserver.startPolling();
            siteAdapter.fillAndSend(content, autoSend, attachments).catch((err) => {
              console.error("[MultiChat] fillAndSend failed:", err);
              replyObserver.stop();
              const lastDebug = siteAdapter.id === "claude" ? window.__CHAOJIA_CLAUDE_LAST_DEBUG__ : "";
              chrome.runtime.sendMessage({
                type: "ROLE_STATUS",
                site: siteAdapter.id,
                status: "error",
                detail: [lastDebug, err.message].filter(Boolean).join(" | ")
              });
            });
            sendResponse({ ok: true });
          }
        });
      }
    }
  }
})();
