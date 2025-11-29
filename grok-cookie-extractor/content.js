// Content Script - 在 grok.com 页面中运行
// 直接读取 document.cookie

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookies') {
        // 直接读取浏览器中的 document.cookie
        const cookieString = document.cookie;

    

        // 发送回 popup
        sendResponse({
            success: true,
            cookies: cookieString,
            url: window.location.href
        });
    }

    return true; // 保持消息通道打开
});

