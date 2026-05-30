let chatTabId = null;

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("chat.html"), active: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEND_PROMPT") {
    // 记录当前聊天页面的 tab ID
    if (sender.tab && sender.tab.id) {
      chatTabId = sender.tab.id;
    }
    
    // 向所有 tab 发送消息（包括 iframe）
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { 
            type: "FILL_AND_SEND", 
            content: message.content,
            attachments: message.attachments || []
          }).catch(() => {});
        }
      });
    });
    
    sendResponse({ ok: true });
    return true;
  }
  
  if (message.type === "ROLE_REPLY" || message.type === "ROLE_STATUS") {
    // 将状态/回复转发给聊天页面
    if (chatTabId) {
      chrome.tabs.sendMessage(chatTabId, message).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }
  
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === chatTabId) {
    chatTabId = null;
  }
});
