// Grok Cookie Extractor - Popup Script

// 核心必需的 Cookie（一定要有的）
const REQUIRED_COOKIES = [
    'sso',
    'sso-rw',
    'x-userid'
];

// 可选的 Cookie（有更好，没有也能用）
const OPTIONAL_COOKIES = [
    'x-challenge',
    'x-signature',
    'cf_clearance',
    '_ga',
    '_ga_8FEWB057YH',
    'i18nextLng',
    'x-anonuserid',
    'mp_ea93da913ddb66b6372b89d97b1029ac_mixpanel'
];

const GROK_DOMAIN = 'grok.com';

// DOM Elements
const extractBtn = document.getElementById('extractBtn');
const copyBtn = document.getElementById('copyBtn');
const statusDiv = document.getElementById('status');
const cookieDisplay = document.getElementById('cookieDisplay');
const loadingDiv = document.getElementById('loading');
const cookieInfo = document.getElementById('cookieInfo');
const userIdSpan = document.getElementById('userId');
const sessionStatusSpan = document.getElementById('sessionStatus');

// State
let currentCookieString = '';

// Extract Cookies - 优先使用 content script 从页面获取
async function extractCookies() {
    try {
        showLoading(true);
        updateStatus('正在提取 Cookie...', 'info');

        let cookieString = '';
        let fromContentScript = false;

        // 方法1: 尝试从 content script 获取（最可靠）
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.grok.com/*', active: true, currentWindow: true });

            if (tabs.length === 0) {
                // 如果没有活动标签页，尝试获取所有 grok.com 标签页
                const allTabs = await chrome.tabs.query({ url: '*://*.grok.com/*' });
                if (allTabs.length > 0) {
                    tabs.push(allTabs[0]);
                }
            }

            if (tabs.length > 0) {

                for (const tab of tabs) {
                    try {

                        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCookies' });

                        if (response && response.success && response.cookies) {
                            cookieString = response.cookies;
                            fromContentScript = true;
                            break;
                        }
                    } catch (e) {
                        console.warn(`无法从标签页 ${tab.id} 获取 Cookie:`, e);
                    }
                }
            } else {
                console.warn('未找到打开的 grok.com 标签页');
            }
        } catch (e) {
            console.warn('Content script 方法失败:', e);
        }

        // 方法2: 如果 content script 失败，使用 Chrome Cookie API（备用）
        if (!cookieString) {
            const cookieMap = {};
            const allCookies = [];

            // 尝试多个 URL
            const urls = [
                'https://grok.com',
                'https://grok.com/',
                'https://www.grok.com',
            ];

            for (const url of urls) {
                try {
                    const cookies = await chrome.cookies.getAll({ url });
                    allCookies.push(...cookies);
                } catch (e) {
                    console.warn(`无法从 ${url} 获取 Cookie:`, e);
                }
            }

            // 去重
            allCookies.forEach(cookie => {
                cookieMap[cookie.name] = cookie.value;
            });

            cookieString = Object.entries(cookieMap)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');

        }

        if (!cookieString) {
            throw new Error('未找到 Cookie。\n\n请确保：\n1. 已登录 grok.com\n2. 打开了 grok.com 网页\n3. 刷新页面后重试');
        }

        // 解析 Cookie 字符串
        const cookieMap = {};
        cookieString.split(';').forEach(cookie => {
            const trimmed = cookie.trim();
            if (trimmed) {
                const [name, ...valueParts] = trimmed.split('=');
                cookieMap[name] = valueParts.join('=');
            }
        });

  

        // Check required cookies
        const missingRequired = REQUIRED_COOKIES.filter(name => !cookieMap[name]);

        if (missingRequired.length > 0) {
            throw new Error(`缺少必需的 Cookie: ${missingRequired.join(', ')}。\n\n请确保：\n1. 已登录 grok.com\n2. 打开了 grok.com 页面\n3. 刷新页面后重试`);
        }

        // Check optional cookies
        const missingOptional = OPTIONAL_COOKIES.filter(name => !cookieMap[name]);
        if (missingOptional.length > 0) {
            console.warn('缺少部分可选 Cookie:', missingOptional.join(', '));
        }

        // Ensure we have the final cookie string
        currentCookieString = cookieString;


        // Display cookies
        displayCookies(currentCookieString, cookieMap);

        // Save to storage
        await chrome.storage.local.set({
            grokCookies: currentCookieString,
            lastUpdate: new Date().toISOString(),
            method: fromContentScript ? 'content-script' : 'api'
        });

        // Show success message
        let successMessage = `✅ 提取成功！共 ${Object.keys(cookieMap).length} 个 Cookie`;
        if (fromContentScript) {
            successMessage += ' (页面直读)';
        }
        if (missingOptional.length > 0) {
            successMessage += ` (${missingOptional.length} 个可选缺失)`;
        }

        updateStatus(successMessage, 'success');
        copyBtn.style.display = 'block';

    } catch (error) {
        updateStatus(`❌ ${error.message}`, 'error');
        console.error('Extract cookies error:', error);
    } finally {
        showLoading(false);
    }
}

// Display cookies
function displayCookies(cookieString, cookieMap) {
    // Display full cookie string
    cookieDisplay.textContent = cookieString;
    cookieDisplay.classList.add('show');

    // Display cookie info
    if (cookieMap['x-userid']) {
        userIdSpan.textContent = cookieMap['x-userid'];
    }

    // Check session status
    if (cookieMap['sso']) {
        try {
            // Decode JWT to check expiration
            const payload = JSON.parse(atob(cookieMap['sso'].split('.')[1]));
            sessionStatusSpan.textContent = '✅ 有效';
        } catch (e) {
            sessionStatusSpan.textContent = '⚠️ 无法验证';
        }
    }

    cookieInfo.style.display = 'block';
}

// Copy to clipboard
async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(currentCookieString);

        // Show success feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ 已复制！';
        copyBtn.style.background = '#28a745';
        copyBtn.style.color = 'white';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
        }, 2000);

        updateStatus('✅ Cookie 已复制到剪贴板！', 'success');
    } catch (error) {
        updateStatus('❌ 复制失败，请手动复制', 'error');
        console.error('Copy error:', error);
    }
}

// Update status message
function updateStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// Show/hide loading
function showLoading(show) {
    loadingDiv.classList.toggle('show', show);
    extractBtn.disabled = show;
}

// Event Listeners
extractBtn.addEventListener('click', extractCookies);
copyBtn.addEventListener('click', copyToClipboard);

// Load saved cookies on popup open
chrome.storage.local.get(['grokCookies', 'lastUpdate'], (result) => {
    if (result.grokCookies) {
        currentCookieString = result.grokCookies;
        cookieDisplay.textContent = result.grokCookies;
        cookieDisplay.classList.add('show');
        copyBtn.style.display = 'block';

        const lastUpdate = new Date(result.lastUpdate);
        const timeAgo = getTimeAgo(lastUpdate);
        updateStatus(`上次提取: ${timeAgo}`, 'info');
    }
});

// Helper: Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return '刚刚';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
    return `${Math.floor(seconds / 86400)} 天前`;
}
