// AI 配置信息
const AI_CONFIG = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    iconPng: 'assets/ai/chatgpt.png',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="#10a37f"/>
<path d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7Z" fill="#10a37f"/>
</svg>`
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    iconPng: 'assets/ai/gemini.png',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C11.4477 2 11 2.44772 11 3V11H3C2.44772 11 2 11.4477 2 12C2 12.5523 2.44772 13 3 13H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V13H21C21.5523 13 22 12.5523 22 12C22 11.4477 21.5523 11 21 11H13V3C13 2.44772 12.5523 2 12 2Z" fill="url(#gemini-gradient)"/>
<defs>
<linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
<stop stop-color="#4285F4"/>
<stop offset="0.5" stop-color="#9B72CB"/>
<stop offset="1" stop-color="#EA4335"/>
</linearGradient>
</defs>
</svg>`
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    iconPng: 'assets/ai/deepseek.png',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M32 4C16.536 4 4 16.536 4 32C4 47.464 16.536 60 32 60C47.464 60 60 47.464 60 32C60 16.536 47.464 4 32 4ZM32 52C20.954 52 12 43.046 12 32C12 20.954 20.954 12 32 12C43.046 12 52 20.954 52 32C52 43.046 43.046 52 32 52ZM32 20C25.373 20 20 25.373 20 32C20 38.627 25.373 44 32 44C38.627 44 44 38.627 44 32C44 25.373 38.627 20 32 20Z" fill="#7c3aed"/>
</svg>`
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai/',
    iconPng: 'assets/ai/claude.png',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10Z" fill="#f59e0b"/>
</svg>`
  },
  grok: {
    name: 'Grok',
    url: 'https://grok.com/',
    iconPng: 'assets/ai/grok.png',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#1da1f2"/>
</svg>`
  },
  doubao: {
    name: '豆包',
    url: 'https://www.doubao.com/',
    iconPng: 'assets/ai/doubao.png',
    iconSvg: ''
  }
};

// 默认启用的 AI
const DEFAULT_ENABLED = ['chatgpt', 'gemini'];

// 状态管理
let enabledAIs = [...DEFAULT_ENABLED];

// DOM 元素
const aiPanel = document.getElementById('ai-panel');
let aiOptions = document.querySelectorAll('.ai-option');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const aiOptionsPrimary = document.getElementById('ai-options-primary');
const aiOptionsMore = document.getElementById('ai-options-more');
const aiOptionsMoreBtn = document.getElementById('ai-options-more-btn');
const aiOptionsMenu = document.getElementById('ai-options-menu');
const attachBtn = document.getElementById('attach-btn');
const imageInput = document.getElementById('image-input');
const composerAttachments = document.getElementById('composer-attachments');
const attachmentList = document.getElementById('attachment-list');
const composer = document.getElementById('composer');
const composerInputWrapper = document.getElementById('composer-input-wrapper');

const PRIMARY_AI_COUNT = 6;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
let pendingAttachments = [];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function renderAttachments() {
  if (!composerAttachments || !attachmentList) return;
  attachmentList.innerHTML = '';

  if (pendingAttachments.length === 0) {
    composerAttachments.hidden = true;
    return;
  }

  composerAttachments.hidden = false;

  pendingAttachments.forEach((attachment) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `
      <img src="${attachment.dataUrl}" alt="${attachment.name}">
      <button class="attachment-remove" type="button" title="移除图片">✕</button>
    `;
    chip.querySelector('.attachment-remove').addEventListener('click', () => {
      pendingAttachments = pendingAttachments.filter((item) => item.id !== attachment.id);
      renderAttachments();
    });
    attachmentList.appendChild(chip);
  });
}

async function addSelectedImages(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith('image/'));
  if (files.length === 0) return;

  if (pendingAttachments.length + files.length > MAX_ATTACHMENTS) {
    alert(`最多只能添加 ${MAX_ATTACHMENTS} 张图片`);
    return;
  }

  const tooLarge = files.find((file) => file.size > MAX_ATTACHMENT_SIZE);
  if (tooLarge) {
    alert(`图片过大：${tooLarge.name}，单张请控制在 ${Math.round(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB 内`);
    return;
  }

  const nextAttachments = await Promise.all(files.map(async (file) => ({
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: await fileToDataUrl(file)
  })));

  pendingAttachments = pendingAttachments.concat(nextAttachments);
  renderAttachments();
}

function clearAttachments() {
  pendingAttachments = [];
  if (imageInput) imageInput.value = '';
  renderAttachments();
}

function extractImageFiles(dataTransfer) {
  if (!dataTransfer) return [];
  const files = [...(dataTransfer.files || [])].filter((file) => file.type.startsWith('image/'));
  if (files.length > 0) return files;
  const items = [...(dataTransfer.items || [])];
  return items
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

function setComposerDragging(isDragging) {
  if (!composer) return;
  composer.classList.toggle('dragging', isDragging);
}

function applyIconToElement(aiId, iconEl) {
  const config = AI_CONFIG[aiId];
  if (!config || !iconEl) return;

  iconEl.innerHTML = config.iconSvg || '';

  if (!config.iconPng) return;
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) return;

  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.width = 18;
  img.height = 18;
  img.src = chrome.runtime.getURL(config.iconPng);

  img.addEventListener('load', () => {
    iconEl.innerHTML = '';
    iconEl.appendChild(img);
  });
}

function createAiOptionLabel(aiId) {
  const config = AI_CONFIG[aiId];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ai-option';
  button.dataset.id = aiId;
  button.textContent = config.name;
  button.classList.toggle('is-selected', enabledAIs.includes(aiId));
  button.setAttribute('aria-pressed', enabledAIs.includes(aiId) ? 'true' : 'false');
  button.addEventListener('click', () => {
    if (enabledAIs.includes(aiId)) removeAI(aiId);
    else addAI(aiId);
  });
  return button;
}

function syncAiOptionStates() {
  aiOptions = document.querySelectorAll('.ai-option');
  aiOptions.forEach((button) => {
    const isSelected = enabledAIs.includes(button.dataset.id);
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

function renderAiOptions() {
  if (!aiOptionsPrimary || !aiOptionsMore || !aiOptionsMoreBtn || !aiOptionsMenu) return;

  aiOptionsPrimary.innerHTML = '';
  aiOptionsMenu.innerHTML = '';

  const allIds = Object.keys(AI_CONFIG);

  allIds.slice(0, PRIMARY_AI_COUNT).forEach((id) => {
    aiOptionsPrimary.appendChild(createAiOptionLabel(id));
  });

  const rest = allIds.slice(PRIMARY_AI_COUNT);
  if (rest.length === 0) {
    aiOptionsMore.style.display = 'none';
  } else {
    aiOptionsMore.style.display = '';
    rest.forEach((id) => {
      aiOptionsMenu.appendChild(createAiOptionLabel(id));
    });
  }

  syncAiOptionStates();
  updateMoreButtonText();
}

function updateMoreButtonText() {
  if (!aiOptionsMoreBtn || !aiOptionsMenu) return;
  const total = Object.keys(AI_CONFIG).length;
  const restCount = Math.max(0, total - PRIMARY_AI_COUNT);
  const enabledInMenu = [...aiOptionsMenu.querySelectorAll('.ai-option.is-selected')].length;
  const base = `查看更多${restCount > 0 ? `（${restCount}）` : ''}`;
  aiOptionsMoreBtn.textContent = enabledInMenu > 0 ? `${base} · 已选${enabledInMenu}` : base;
}

// 创建单个 AI 窗口
function createAIWrapper(aiId) {
  const config = AI_CONFIG[aiId];
  if (!config) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'ai-frame-wrapper';
  wrapper.dataset.id = aiId;

  wrapper.innerHTML = `
    <div class="ai-frame-header ${aiId}">
      <div class="ai-name">
        <span class="ai-icon"></span>
        <span>${config.name}</span>
      </div>
      <div class="ai-frame-actions">
        <span class="ai-frame-status"></span>
        <button class="close-ai-btn" title="关闭">✕</button>
      </div>
    </div>
    <iframe src="${config.url}" allow="clipboard-read; clipboard-write"></iframe>
  `;

  applyIconToElement(aiId, wrapper.querySelector('.ai-icon'));

  const closeBtn = wrapper.querySelector('.close-ai-btn');
  closeBtn.addEventListener('click', () => removeAI(aiId));

  return wrapper;
}

// 更新网格布局类
function updateGridClass() {
  aiPanel.className = `count-${enabledAIs.length}`;
}

// 初始化
async function init() {
  await loadSettings();
  renderAiOptions();
  initialRender();
  setupEventListeners();
}

// 初始渲染（第一次加载时）
function initialRender() {
  aiPanel.innerHTML = '';
  enabledAIs.forEach(aiId => {
    const wrapper = createAIWrapper(aiId);
    if (wrapper) aiPanel.appendChild(wrapper);
  });
  updateGridClass();
}

// 从 chrome.storage 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('enabledAIs');
    if (result.enabledAIs && Array.isArray(result.enabledAIs)) {
      enabledAIs = result.enabledAIs.filter((id) => Boolean(AI_CONFIG[id]));
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  }
}

// 保存设置到 chrome.storage
async function saveSettings() {
  try {
    await chrome.storage.local.set({ enabledAIs });
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

// 动态添加 AI
function addAI(aiId) {
  if (!AI_CONFIG[aiId]) return;
  if (enabledAIs.includes(aiId)) return;
  
  enabledAIs.push(aiId);
  saveSettings();
  
  // 动态添加新 iframe 到最后
  const wrapper = createAIWrapper(aiId);
  if (wrapper) aiPanel.appendChild(wrapper);
  
  updateGridClass();
  syncAiOptionStates();
  updateMoreButtonText();
}

// 动态移除 AI
function removeAI(aiId) {
  if (!AI_CONFIG[aiId]) return;
  const index = enabledAIs.indexOf(aiId);
  if (index === -1) return;
  
  enabledAIs.splice(index, 1);
  saveSettings();
  
  // 移除对应的 DOM 元素
  const wrapper = aiPanel.querySelector(`[data-id="${aiId}"]`);
  if (wrapper) wrapper.remove();
  
  updateGridClass();
  syncAiOptionStates();
  updateMoreButtonText();
}

// 发送消息
function sendMessage() {
  const content = input.value.trim();
  const attachments = [...pendingAttachments];
  if (!content && attachments.length === 0) return;

  chrome.runtime.sendMessage({ type: 'SEND_PROMPT', content, attachments });
  input.value = '';
  clearAttachments();
}

// 设置事件监听
function setupEventListeners() {
  if (aiOptionsMore && aiOptionsMoreBtn && aiOptionsMenu) {
    aiOptionsMoreBtn.addEventListener('click', () => {
      aiOptionsMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!aiOptionsMore.contains(target)) {
        aiOptionsMenu.classList.remove('open');
      }
    });
  }

  if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', async (e) => {
      const target = e.target;
      try {
        await addSelectedImages(target.files || []);
      } catch (error) {
        console.error('添加图片失败:', error);
        alert('添加图片失败，请重试');
      } finally {
        target.value = '';
      }
    });
  }

  if (composerInputWrapper) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      composerInputWrapper.addEventListener(eventName, (e) => {
        const files = extractImageFiles(e.dataTransfer);
        if (files.length === 0) return;
        e.preventDefault();
        setComposerDragging(true);
      });
    });

    ['dragleave', 'dragend'].forEach((eventName) => {
      composerInputWrapper.addEventListener(eventName, (e) => {
        if (e.relatedTarget && composerInputWrapper.contains(e.relatedTarget)) return;
        setComposerDragging(false);
      });
    });

    composerInputWrapper.addEventListener('drop', async (e) => {
      const files = extractImageFiles(e.dataTransfer);
      if (files.length === 0) return;
      e.preventDefault();
      setComposerDragging(false);
      try {
        await addSelectedImages(files);
      } catch (error) {
        console.error('拖拽添加图片失败:', error);
        alert('拖拽添加图片失败，请重试');
      }
    });
  }

  input.addEventListener('paste', async (e) => {
    const files = extractImageFiles(e.clipboardData);
    if (files.length === 0) return;
    e.preventDefault();
    try {
      await addSelectedImages(files);
    } catch (error) {
      console.error('粘贴图片失败:', error);
      alert('粘贴图片失败，请重试');
    }
  });

  // 发送按钮
  sendBtn.addEventListener('click', sendMessage);

  // 回车发送
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'ROLE_STATUS') return;
    const aiId = message.site;
    const wrapper = aiPanel.querySelector(`[data-id="${aiId}"]`);
    if (!wrapper) return;
    const statusEl = wrapper.querySelector('.ai-frame-status');
    if (!statusEl) return;

    if (message.status === 'error') {
      const detail = (message.detail || '错误').replace(/\s+/g, ' ').trim();
      statusEl.textContent = detail.length > 20 ? `${detail.slice(0, 20)}...` : detail;
      statusEl.title = detail;
      wrapper.classList.add('status-error');
      return;
    }

    if (message.status === 'debug') {
      statusEl.textContent = message.detail || '调试';
      statusEl.title = message.detail || '';
      wrapper.classList.remove('status-error');
      return;
    }

    wrapper.classList.remove('status-error');
    statusEl.title = '';
    statusEl.textContent = message.status === 'generating' ? '…' : '';
  });
}

// 启动
init();
