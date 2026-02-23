// ==UserScript==
// @name         网址(WebVPN)转化工具
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在浙大 WebVPN 页面右下角提供网址转化工具。
// @match        *://*.webvpn.zju.edu.cn/*
// @author       Slowist
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js
// @grant        GM_addStyle
// @run-at       document-end
// @license      Apache 2.0
// @downloadURL https://update.greasyfork.org/scripts/546176/%E7%BD%91%E5%9D%80%28WebVPN%29%E8%BD%AC%E5%8C%96%E5%B7%A5%E5%85%B7.user.js
// @updateURL https://update.greasyfork.org/scripts/546176/%E7%BD%91%E5%9D%80%28WebVPN%29%E8%BD%AC%E5%8C%96%E5%B7%A5%E5%85%B7.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const WEBVPN_HOST = 'webvpn.zju.edu.cn';
    const AES_KEY_TEXT = 'wrdvpnisthebest!';
    const AES_KEY_HEX = Array.from(AES_KEY_TEXT).map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');

    GM_addStyle(`
        #converter-container-unique {
            --bg-color: #ffffff; --text-color: #212529; --io-bg-color: #ffffff;
            --io-text-color: #000000; --border-color: #dcdcdc; --shadow-color: rgba(0,0,0,0.15);
            --focus-ring-color: rgba(0, 123, 255, 0.25); --primary-accent-bg: #007bff;
            --primary-accent-hover-bg: #0056b3; --secondary-accent-bg: #28a745;
            --secondary-accent-hover-bg: #218838; --danger-color: #dc3545;
        }

        @media (prefers-color-scheme: dark) {
            #converter-container-unique {
                --bg-color: #2d2d2d; --text-color: #e0e0e0; --io-bg-color: #3a3a3a;
                --io-text-color: #f0f0f0; --border-color: #555555; --shadow-color: rgba(0,0,0,0.4);
                --focus-ring-color: rgba(0, 123, 255, 0.4);
            }
        }
        html[data-color-mode="dark"] #converter-container-unique,
        html[data-theme="dark"] #converter-container-unique {
            --bg-color: #2d2d2d; --text-color: #e0e0e0; --io-bg-color: #3a3a3a;
            --io-text-color: #f0f0f0; --border-color: #555555; --shadow-color: rgba(0,0,0,0.4);
            --focus-ring-color: rgba(0, 123, 255, 0.4);
        }

        #converter-container-unique {
            position: fixed; bottom: 25px; right: 25px; z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color-scheme: light dark;
        }
        #converter-container-unique button,
        #converter-container-unique textarea {
            font-family: inherit;
            font-size: 15px;
        }

        #converter-toggle-button-unique {
            width: 50px; height: 50px; border-radius: 50%; background-color: var(--primary-accent-bg);
            color: white; border: none; cursor: pointer; font-size: 24px; display: flex;
            align-items: center; justify-content: center; box-shadow: 0 4px 12px var(--shadow-color);
            transition: all 0.3s ease;
        }
        #converter-toggle-button-unique:hover { background-color: var(--primary-accent-hover-bg); transform: translateY(-2px); }

        #converter-window-unique {
            position: absolute; bottom: 65px; right: 0; width: 320px;
            background-color: var(--bg-color); color: var(--text-color); border-radius: 12px;
            box-shadow: 0 6px 25px var(--shadow-color); display: none; flex-direction: column;
            padding: 15px 20px; transform-origin: bottom right;
        }

        @keyframes scale-in-fade { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes scale-out-fade { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8); opacity: 0; } }

        #converter-window-unique.visible {
            display: flex;
            animation: scale-in-fade 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        #converter-window-unique.hiding {
            animation: scale-out-fade 0.15s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
        }

        #converter-header-unique {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 12px;
        }
        #converter-title-unique { font-size: 16px; font-weight: 600; }
        .converter-header-controls-unique { display: flex; align-items: center; }
        .converter-header-button-unique {
            background: none; border: none; cursor: pointer;
            color: var(--text-color); opacity: 0.6;
            width: 28px; height: 28px;
            display:flex; align-items: center; justify-content: center;
            padding: 0;
        }
        .converter-header-button-unique:hover { opacity: 1; }
        #converter-disable-button-unique:hover { color: var(--danger-color); }

        .converter-main-content-unique {
            display: flex; flex-direction: column; gap: 12px;
        }

        .converter-output-wrapper-unique { position: relative; }
        #converter-copy-button-unique {
            position: absolute; top: 6px; right: 6px; width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            background-color: var(--io-bg-color); border: 1px solid var(--border-color);
            color: var(--text-color); border-radius: 6px; cursor: pointer;
            transition: all 0.2s ease; opacity: 0.7;
        }
        #converter-copy-button-unique:hover { opacity: 1; border-color: var(--primary-accent-bg); }
        #converter-copy-button-unique.copied { color: var(--secondary-accent-bg); border-color: var(--secondary-accent-bg); }

        .converter-io-unique {
            width: 100%; padding: 10px; border: 1px solid var(--border-color); background-color: var(--io-bg-color);
            color: var(--io-text-color); border-radius: 6px; box-sizing: border-box;
            resize: vertical; transition: border-color 0.3s, box-shadow 0.3s;
        }
        #converter-output-unique { padding-right: 40px; }
        .converter-io-unique::placeholder { color: #888; }
        .converter-io-unique:focus { outline: none; border-color: var(--primary-accent-bg); box-shadow: 0 0 0 2px var(--focus-ring-color); }

        #converter-execute-button-unique {
            padding: 10px 15px; background-color: var(--secondary-accent-bg); color: white; border: none;
            border-radius: 6px; cursor: pointer; font-weight: 500;
            transition: background-color 0.3s; width: 100%; box-sizing: border-box;
        }
        #converter-execute-button-unique:hover { background-color: var(--secondary-accent-hover-bg); }

        #converter-footer-unique {
            text-align: center;
            padding-top: 4px;
        }
        #converter-footer-unique a {
            font-size: 13px;
            color: var(--primary-accent-bg);
            text-decoration: none;
        }
        #converter-footer-unique a:hover {
            text-decoration: underline;
        }
    `);

    const SVG_ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const SVG_ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const SVG_ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    const SVG_ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    const container = document.createElement('div');
    container.id = 'converter-container-unique';
    document.body.appendChild(container);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'converter-toggle-button-unique';
    toggleButton.innerHTML = '⇄';
    container.appendChild(toggleButton);

    const windowDiv = document.createElement('div');
    windowDiv.id = 'converter-window-unique';
    windowDiv.innerHTML = `
        <div id="converter-header-unique">
            <span id="converter-title-unique">URL Converter</span>
            <div class="converter-header-controls-unique">
                <button id="converter-minimize-button-unique" class="converter-header-button-unique" title="Hide Window">${SVG_ICON_MINIMIZE}</button>
                <button id="converter-disable-button-unique" class="converter-header-button-unique" title="Hide until next refresh">${SVG_ICON_CLOSE}</button>
            </div>
        </div>
        <div class="converter-main-content-unique">
            <textarea id="converter-input-unique" class="converter-io-unique" rows="4" placeholder="Input Website Here..."></textarea>
            <button id="converter-execute-button-unique">Bake!</button>
            <div class="converter-output-wrapper-unique">
                <textarea id="converter-output-unique" class="converter-io-unique" rows="4" placeholder="Result..." readonly></textarea>
                <button id="converter-copy-button-unique" title="Copy to clipboard">${SVG_ICON_COPY}</button>
            </div>
            <div id="converter-footer-unique">
                <a href="https://webvpn.zju.edu.cn/" target="_blank">WebVPN 入口</a>
            </div>
        </div>
    `;
    container.appendChild(windowDiv);

    const executeButton = document.getElementById('converter-execute-button-unique');
    const inputArea = document.getElementById('converter-input-unique');
    const outputArea = document.getElementById('converter-output-unique');
    const copyButton = document.getElementById('converter-copy-button-unique');
    const disableButton = document.getElementById('converter-disable-button-unique');
    const minimizeButton = document.getElementById('converter-minimize-button-unique');

    function isCryptoReady() {
        return typeof CryptoJS !== 'undefined' && CryptoJS.AES && CryptoJS.mode && CryptoJS.mode.CFB;
    }

    function encryptHostToHex(host) {
        if (!isCryptoReady()) return null;
        const key = CryptoJS.enc.Utf8.parse(AES_KEY_TEXT);
        const iv = CryptoJS.enc.Utf8.parse(AES_KEY_TEXT);
        const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(host), key, {
            iv,
            mode: CryptoJS.mode.CFB,
            padding: CryptoJS.pad.NoPadding
        });
        return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    }

    function decryptHostFromHex(cipherHex) {
        if (!isCryptoReady()) return null;
        try {
            const key = CryptoJS.enc.Utf8.parse(AES_KEY_TEXT);
            const iv = CryptoJS.enc.Utf8.parse(AES_KEY_TEXT);
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Hex.parse(cipherHex)
            });
            const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
                iv,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding
            });
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch {
            return null;
        }
    }

    function convertUrl(inputText) {
        const trimmedInput = inputText.trim();
        if (!trimmedInput) return '';

        const newWebVpnRegex = /^https?:\/\/webvpn\.zju\.edu\.cn\/(https?)\/([a-fA-F0-9]+)(\/.*)?$/;
        const newWebVpnMatch = trimmedInput.match(newWebVpnRegex);
        if (newWebVpnMatch && newWebVpnMatch[1] && newWebVpnMatch[2]) {
            const protocol = newWebVpnMatch[1].toLowerCase();
            let encryptedHostHex = newWebVpnMatch[2].toLowerCase();
            if (encryptedHostHex.startsWith(AES_KEY_HEX)) {
                encryptedHostHex = encryptedHostHex.slice(AES_KEY_HEX.length);
            }
            const host = decryptHostFromHex(encryptedHostHex);
            if (host) {
                return `${protocol}://${host}${newWebVpnMatch[3] || ''}`;
            }
        }

        try {
            const urlObj = new URL(trimmedInput);
            const protocol = urlObj.protocol.toLowerCase();
            if (protocol !== 'http:' && protocol !== 'https:') {
                return trimmedInput;
            }

            const protocolWithoutColon = protocol.slice(0, -1);
            const hostWithPort = urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;
            const encryptedHostHex = encryptHostToHex(hostWithPort);
            if (!encryptedHostHex) {
                return '转换失败：加密组件未加载，请刷新页面后重试。';
            }

            const encodedHost = `${AES_KEY_HEX}${encryptedHostHex}`;
            const pathAndQueryAndHash = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
            return `https://${WEBVPN_HOST}/${protocolWithoutColon}/${encodedHost}${pathAndQueryAndHash}`;
        } catch {
            return trimmedInput;
        }
    }

    function hideWindowWithAnimation() {
        if (!windowDiv.classList.contains('visible')) return;
        windowDiv.classList.add('hiding');
        setTimeout(() => {
            windowDiv.classList.remove('visible');
            windowDiv.classList.remove('hiding');
        }, 150);
    }

    toggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (windowDiv.classList.contains('visible')) {
            hideWindowWithAnimation();
        } else {
            windowDiv.classList.add('visible');
        }
    });

    windowDiv.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => {
        hideWindowWithAnimation();
    });

    executeButton.addEventListener('click', () => {
        outputArea.value = convertUrl(inputArea.value);
    });

    copyButton.addEventListener('click', () => {
        if (!outputArea.value) return;
        navigator.clipboard.writeText(outputArea.value).then(() => {
            copyButton.innerHTML = SVG_ICON_CHECK;
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.innerHTML = SVG_ICON_COPY;
                copyButton.classList.remove('copied');
            }, 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    });

    minimizeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        hideWindowWithAnimation();
    });

    disableButton.addEventListener('click', () => {
        container.remove();
    });

})();