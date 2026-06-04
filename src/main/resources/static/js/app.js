/* ═══════════════════════════════════════════════════════════════
   CHAT UNIVERSAL — Frontend Application
   ═══════════════════════════════════════════════════════════════ */

// ─── State ───
let stompClient = null;
let username = '';
let connected = false;
let lastMessageId = 0;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// ─── DOM Elements ───
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const messagesList = document.getElementById('messages-list');
const messagesContainer = document.getElementById('messages-container');
const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');
const userBadge = document.getElementById('user-badge');
const uploadOverlay = document.getElementById('upload-overlay');
const toastContainer = document.getElementById('toast-container');

// ─── Color Palette for Usernames ───
const userColors = [
    '#7c5cfc', '#e879f9', '#f472b6', '#fb923c', '#facc15',
    '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#c084fc',
    '#f87171', '#4ade80', '#38bdf8', '#fb7185', '#fbbf24'
];

function getUserColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return userColors[Math.abs(hash) % userColors.length];
}

// ═══════════════ LOGIN ═══════════════

function login() {
    const name = usernameInput.value.trim();
    if (!name) {
        usernameInput.focus();
        shakeElement(usernameInput.parentElement);
        return;
    }
    if (name.length > 30) {
        showToast('Apelido deve ter no máximo 30 caracteres', 'error');
        return;
    }

    username = name;
    sessionStorage.setItem('chatUsername', username);

    // Transition to chat
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    userBadge.textContent = username;

    // Connect WebSocket
    connectWebSocket();

    // Load message history
    loadHistory();

    // Focus message input
    setTimeout(() => messageInput.focus(), 300);
}

// Check for saved username
(function checkSavedUsername() {
    const saved = sessionStorage.getItem('chatUsername');
    if (saved) {
        usernameInput.value = saved;
    }
})();

// Login event listeners
loginBtn.addEventListener('click', login);
usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
});

// ═══════════════ WEBSOCKET ═══════════════

function connectWebSocket() {
    updateConnectionStatus('connecting');

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);

    // Disable STOMP debug logs in production
    stompClient.debug = null;

    stompClient.connect({}, onConnected, onConnectionError);
}

function onConnected() {
    connected = true;
    reconnectAttempts = 0;
    updateConnectionStatus('connected');

    // Subscribe to chat topic
    stompClient.subscribe('/topic/chat', onMessageReceived);
}

function onConnectionError(error) {
    connected = false;
    updateConnectionStatus('error');
    console.error('WebSocket error:', error);

    // Attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.min(reconnectAttempts, 5);
        updateConnectionStatus('reconnecting');
        setTimeout(connectWebSocket, delay);
    } else {
        showToast('Conexão perdida. Recarregue a página.', 'error');
    }
}

function updateConnectionStatus(status) {
    connectionStatus.className = 'status-bar';
    switch (status) {
        case 'connected':
            connectionStatus.classList.add('connected');
            statusText.textContent = 'Conectado';
            break;
        case 'connecting':
            statusText.textContent = 'Conectando...';
            break;
        case 'reconnecting':
            statusText.textContent = `Reconectando (${reconnectAttempts})...`;
            break;
        case 'error':
            connectionStatus.classList.add('error');
            statusText.textContent = 'Desconectado';
            break;
    }
}

// ═══════════════ SEND MESSAGE ═══════════════

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !connected) return;

    const message = {
        sender: username,
        content: content,
        type: 'TEXT'
    };

    stompClient.send('/app/chat.send', {}, JSON.stringify(message));
    messageInput.value = '';
    messageInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ═══════════════ FILE UPLOAD ═══════════════

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
        await uploadFile(file);
    }

    // Reset input
    fileInput.value = '';
});

async function uploadFile(file) {
    // Validate size (350MB)
    if (file.size > 350 * 1024 * 1024) {
        showToast('Arquivo excede o limite de 350MB', 'error');
        return;
    }

    // Validate extension
    const blockedExtensions = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.vbs', '.msi', '.com', '.scr', '.pif', '.dll'];
    const fileName = file.name.toLowerCase();
    for (const ext of blockedExtensions) {
        if (fileName.endsWith(ext)) {
            showToast(`Tipo de arquivo não permitido: ${ext}`, 'error');
            return;
        }
    }

    // Show upload overlay
    uploadOverlay.classList.remove('hidden');

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sender', username);

        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha no upload');
        }

        showToast('Arquivo enviado!', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Erro ao enviar arquivo', 'error');
    } finally {
        uploadOverlay.classList.add('hidden');
    }
}

// Drag & Drop support
const chatContainer = document.querySelector('.chat-container');
if (chatContainer) {
    chatContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        chatContainer.style.borderColor = 'var(--accent)';
    });

    chatContainer.addEventListener('dragleave', () => {
        chatContainer.style.borderColor = '';
    });

    chatContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        chatContainer.style.borderColor = '';
        const files = e.dataTransfer.files;
        for (const file of files) {
            await uploadFile(file);
        }
    });
}

// ═══════════════ RECEIVE MESSAGE ═══════════════

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);

    // Avoid rendering duplicates from history
    if (message.id && message.id <= lastMessageId) return;
    if (message.id) lastMessageId = message.id;

    renderMessage(message);
    scrollToBottom();

    // Play notification sound for messages from others
    if (message.sender !== username) {
        playNotificationSound();
    }
}

// ═══════════════ LOAD HISTORY ═══════════════

async function loadHistory() {
    try {
        const response = await fetch('/api/messages');
        if (!response.ok) throw new Error('Failed to load history');

        const messages = await response.json();

        // Clear welcome message if we have history
        if (messages.length > 0) {
            const welcomeMsg = document.getElementById('welcome-msg');
            if (welcomeMsg) welcomeMsg.remove();
        }

        let lastDate = null;

        messages.forEach(msg => {
            // Add date separator if needed
            const msgDate = formatDate(msg.timestamp);
            if (msgDate !== lastDate) {
                addDateSeparator(msgDate);
                lastDate = msgDate;
            }

            renderMessage(msg, false);
            if (msg.id && msg.id > lastMessageId) {
                lastMessageId = msg.id;
            }
        });

        scrollToBottom(false);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// ═══════════════ RENDER MESSAGE ═══════════════

function renderMessage(message, animate = true) {
    const isOwn = message.sender === username;
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isOwn ? 'own' : 'other'}`;
    if (animate) {
        wrapper.style.animationDelay = '0.05s';
    } else {
        wrapper.style.animation = 'none';
    }

    if (message.type === 'FILE') {
        wrapper.innerHTML = buildFileMessage(message, isOwn);
    } else if (message.type === 'SYSTEM') {
        wrapper.className = 'system-message';
        wrapper.innerHTML = `<div class="system-message-content">${escapeHtml(message.content)}</div>`;
    } else {
        wrapper.innerHTML = buildTextMessage(message, isOwn);
    }

    messagesList.appendChild(wrapper);
}

function buildTextMessage(message, isOwn) {
    const senderColor = getUserColor(message.sender);
    const senderHtml = !isOwn
        ? `<div class="message-sender" style="color: ${senderColor}">${escapeHtml(message.sender)}</div>`
        : '';

    return `
        ${senderHtml}
        <div class="message-bubble">
            <div class="message-text">${formatMessageContent(message.content)}</div>
        </div>
        <div class="message-meta">
            <span class="message-time">${formatTime(message.timestamp)}</span>
            <button class="copy-btn" onclick="copyMessage(this, '${escapeAttr(message.content)}')" title="Copiar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            </button>
        </div>
    `;
}

function buildFileMessage(message, isOwn) {
    const senderColor = getUserColor(message.sender);
    const senderHtml = !isOwn
        ? `<div class="message-sender" style="color: ${senderColor}">${escapeHtml(message.sender)}</div>`
        : '';

    const isImage = message.mimeType && message.mimeType.startsWith('image/');
    const downloadUrl = message.storedFileName && message.storedFileName.startsWith('http') 
        ? message.storedFileName 
        : `/api/files/download/${message.storedFileName}`;
    const fileIcon = getFileIcon(message.mimeType, message.fileName);

    let previewHtml = '';
    if (isImage) {
        previewHtml = `<img class="file-preview-img" src="${downloadUrl}" alt="${escapeAttr(message.fileName)}" loading="lazy" onclick="openLightbox(this.src)">`;
    }

    return `
        ${senderHtml}
        <div class="file-bubble">
            ${previewHtml}
            <div class="file-info">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-details">
                    <div class="file-name" title="${escapeAttr(message.fileName)}">${escapeHtml(message.fileName)}</div>
                    <div class="file-size">${formatFileSize(message.fileSize)}</div>
                </div>
                <a href="${downloadUrl}" download class="file-download-btn" title="Baixar arquivo">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </a>
            </div>
        </div>
        <div class="message-meta">
            <span class="message-time">${formatTime(message.timestamp)}</span>
        </div>
    `;
}

// ═══════════════ UTILITY FUNCTIONS ═══════════════

function formatMessageContent(content) {
    if (!content) return '';

    // Content is already sanitized by the server, but we escape again for safety
    let text = escapeHtml(content);

    // Convert URLs to clickable links
    text = text.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--accent-light); text-decoration: underline;">$1</a>'
    );

    return text;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        // Handle array format [2024, 1, 15, 10, 30, 45] from Jackson
        if (Array.isArray(timestamp)) {
            const [year, month, day, hour, minute] = timestamp;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
        // Handle ISO string
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
        let date;
        if (Array.isArray(timestamp)) {
            const [year, month, day] = timestamp;
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(timestamp);
        }
        if (isNaN(date.getTime())) return '';

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(mimeType, fileName) {
    if (!mimeType) {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
        return '📄';
    }
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '📦';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    return '📄';
}

function addDateSeparator(dateText) {
    const sep = document.createElement('div');
    sep.className = 'date-separator';
    sep.innerHTML = `<span>${dateText}</span>`;
    messagesList.appendChild(sep);
}

// ─── Copy Message ───
function copyMessage(btn, text) {
    // Decode the escaped text
    const decoded = text
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');

    navigator.clipboard.writeText(decoded).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
        showToast('Mensagem copiada!', 'success');
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            `;
        }, 2000);
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
}

// ─── Lightbox ───
function openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `<img src="${src}" alt="Preview">`;
    lightbox.addEventListener('click', () => {
        lightbox.style.animation = 'none';
        lightbox.style.opacity = '0';
        lightbox.style.transition = 'opacity 0.2s ease';
        setTimeout(() => lightbox.remove(), 200);
    });
    document.body.appendChild(lightbox);
}

// ─── Scroll ───
function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    });
}

// ─── Toast Notifications ───
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `<span>${icons[type] || ''}</span> ${escapeHtml(message)}`;
    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Shake Animation ───
function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => el.style.animation = '', 400);
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);

// ─── Notification Sound ───
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
        // Audio not supported - silently ignore
    }
}

// ─── Make functions globally accessible ───
window.copyMessage = copyMessage;
window.openLightbox = openLightbox;
