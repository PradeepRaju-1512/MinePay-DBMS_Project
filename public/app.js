// app.js - client logic for the plain html version

// global application state
const state = {
  accounts: [],
  activeAccountId: null,
  activeAccount: null,
  currentPin: '',
  pendingTransfer: null,
};

// API base URL
const API_BASE = '/api';

// initialization & data fetching

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  startClock();
  await loadAccounts();
  setupLiveLog('[SYSTEM] Web client connected to MinePay banking backend.');
});

// loads all user accounts
async function loadAccounts() {
  try {
    logSql('GET /api/accounts - Fetching available device nodes...');
    const response = await fetch(`${API_BASE}/accounts`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      state.accounts = result.data;
      // default to first account (Steve Miner)
      if (!state.activeAccountId) {
        state.activeAccountId = state.accounts[0].account_id;
      }
      renderDeviceTabs();
      await switchAccount(state.activeAccountId);
      logSql(`[OK] Retrieved ${result.data.length} accounts from PostgreSQL schema.`, 'success');
    } else {
      showToast('No accounts found in database.', 'error');
    }
  } catch (error) {
    console.error('Failed to load accounts:', error);
    logSql(`[ERROR] Backend connection failed: ${error.message}`, 'error');
    showToast('Failed to connect to banking server.', 'error');
  }
}

// switches the active device/account
async function switchAccount(accountId) {
  state.activeAccountId = accountId;
  state.activeAccount = state.accounts.find(a => a.account_id === accountId);

  // update device switcher tabs UI
  document.querySelectorAll('.device-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.account === accountId);
  });

  if (!state.activeAccount) return;

  // update app header
  const avatarMap = { steve: '⛏', alex: '🏹', villager: '📜' };
  document.getElementById('currentAvatar').textContent = avatarMap[state.activeAccount.skin_avatar] || '⛏';
  document.getElementById('currentUsername').textContent = state.activeAccount.username;
  document.getElementById('currentUpi').textContent = state.activeAccount.upi_handle;
  document.getElementById('currentVaultType').textContent = state.activeAccount.account_type.replace(/_/g, ' ');
  document.getElementById('currentAccNum').textContent = state.activeAccount.account_number;

  // update metadata tab
  document.getElementById('metaAccountId').textContent = state.activeAccount.account_id;
  document.getElementById('metaUserId').textContent = state.activeAccount.user_id;
  document.getElementById('metaUpiHandle').textContent = state.activeAccount.upi_handle;
  document.getElementById('metaPhone').textContent = state.activeAccount.phone_number;

  // refresh balance & history
  await refreshBalance();
  await refreshHistory();
  renderRecipientOptions();
}

// refreshes balance for current account
async function refreshBalance() {
  if (!state.activeAccountId) return;

  try {
    const res = await fetch(`${API_BASE}/balance/${state.activeAccountId}`);
    const json = await res.json();

    if (json.success) {
      const balance = json.data.balance;
      document.getElementById('currentBalance').textContent = Number(balance).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      if (state.activeAccount) {
        state.activeAccount.balance = balance;
      }
    }
  } catch (err) {
    console.error('Error fetching balance:', err);
  }
}

// refreshes transaction history ledger
async function refreshHistory() {
  if (!state.activeAccountId) return;

  const listEl = document.getElementById('historyList');
  listEl.innerHTML = '<div class="empty-state">Loading passbook records...</div>';

  try {
    const res = await fetch(`${API_BASE}/history/${state.activeAccountId}`);
    const json = await res.json();

    if (json.success && json.data.length > 0) {
      listEl.innerHTML = '';
      json.data.forEach(tx => {
        const isDebit = tx.entry_type === 'DEBIT';
        const isSuccess = tx.status === 'SUCCESS';
        
        const item = document.createElement('div');
        item.className = `tx-item ${isDebit ? 'debit' : 'credit'} ${!isSuccess ? 'failed' : ''}`;
        
        const counterpartName = isDebit ? tx.receiver_name : tx.sender_name;
        const counterpartUpi = isDebit ? tx.receiver_upi : tx.sender_upi;
        const prefix = isDebit ? '- ' : '+ ';
        const dateStr = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
          <div class="tx-meta">
            <span class="tx-title">${isDebit ? 'Paid to' : 'Received from'} ${escapeHtml(counterpartName)}</span>
            <span class="tx-sub">${escapeHtml(counterpartUpi)} · ${dateStr}</span>
            ${tx.note ? `<span class="tx-sub font-italic">"${escapeHtml(tx.note)}"</span>` : ''}
          </div>
          <div class="tx-amount-col">
            <div class="tx-amount ${isDebit ? 'debit' : 'credit'}">
              ${prefix}${parseFloat(tx.amount).toFixed(2)} ✦
            </div>
            <span class="tx-status-badge ${isSuccess ? 'status-ok' : 'status-err'}">
              ${isSuccess ? 'SUCCESS' : 'FAILED'}
            </span>
          </div>
        `;
        listEl.appendChild(item);
      });
    } else {
      listEl.innerHTML = '<div class="empty-state">No transaction records in this chest vault.</div>';
    }
  } catch (err) {
    listEl.innerHTML = '<div class="empty-state text-danger">Failed to load history.</div>';
    console.error(err);
  }
}

// renders recipient dropdown & quick-send contacts
function renderRecipientOptions() {
  const select = document.getElementById('receiverSelect');
  const quickList = document.getElementById('quickContactsList');
  
  select.innerHTML = '<option value="" disabled selected>-- Select Recipient --</option>';
  quickList.innerHTML = '';

  const otherAccounts = state.accounts.filter(a => a.account_id !== state.activeAccountId);

  otherAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.account_id;
    opt.textContent = `${acc.username} (${acc.upi_handle})`;
    select.appendChild(opt);

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'contact-pill';
    pill.innerHTML = `<span>👤</span> ${escapeHtml(acc.username.split(' ')[0])}`;
    pill.onclick = () => {
      select.value = acc.account_id;
    };
    quickList.appendChild(pill);
  });
}

// re-renders the top device switcher tabs
function renderDeviceTabs() {
  const container = document.getElementById('deviceTabs');
  container.innerHTML = '';

  const avatarMap = { steve: '⛏', alex: '🏹', villager: '📜' };

  state.accounts.forEach(acc => {
    const btn = document.createElement('button');
    btn.className = `device-tab ${acc.account_id === state.activeAccountId ? 'active' : ''}`;
    btn.dataset.account = acc.account_id;
    btn.innerHTML = `<span class="skin-icon">${avatarMap[acc.skin_avatar] || '⛏'}</span> ${escapeHtml(acc.username.split(' ')[0])}'s Phone`;
    btn.onclick = () => switchAccount(acc.account_id);
    container.appendChild(btn);
  });
}

// transfer workflow & pin modal

// opens 4-digit PIN modal when user clicks authorize transfer
function handleOpenPinModal() {
  const receiverId = document.getElementById('receiverSelect').value;
  const amountVal = document.getElementById('amountInput').value;
  const noteVal = document.getElementById('noteInput').value;

  if (!receiverId) {
    showToast('Please select a recipient.', 'error');
    return;
  }

  const amount = parseFloat(amountVal);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than 0 ✦.', 'error');
    return;
  }

  const currentBal = parseFloat(state.activeAccount.balance || 0);
  if (amount > currentBal) {
    showToast(`Insufficient balance! Vault only contains ${currentBal.toFixed(2)} ✦.`, 'error');
    return;
  }

  const recipient = state.accounts.find(a => a.account_id === receiverId);

  state.pendingTransfer = {
    senderAccountId: state.activeAccountId,
    receiverAccountId: receiverId,
    amount: amount,
    note: noteVal,
  };

  state.currentPin = '';
  updatePinDots();

  document.getElementById('pinModalAmount').textContent = `${amount.toFixed(2)} ✦`;
  document.getElementById('pinModalRecipient').textContent = recipient ? recipient.username : 'Beneficiary';
  document.getElementById('pinModal').classList.remove('hidden');
}

// closes the PIN modal
function closePinModal() {
  document.getElementById('pinModal').classList.add('hidden');
  state.currentPin = '';
  state.pendingTransfer = null;
  updatePinDots();
}

// updates the 4 visual PIN indicator dots
function updatePinDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      dot.classList.toggle('filled', i <= state.currentPin.length);
    }
  }
}

// dispatches atomic transfer to POST /api/transfer
async function submitTransfer() {
  if (state.currentPin.length !== 4) {
    showToast('Please enter a complete 4-digit PIN.', 'error');
    return;
  }

  if (!state.pendingTransfer) return;

  const payload = {
    ...state.pendingTransfer,
    pin: state.currentPin,
  };

  closePinModal();
  setLockIndicator(true);

  // live DBMS transaction stream logging
  logSql('------------------------------------------------------------', 'system');
  logSql('BEGIN TRANSACTION;', 'sql');
  logSql(`-- CONCURRENCY LOCK ACQUISITION`);
  logSql(`SELECT account_id, balance FROM accounts WHERE account_id IN ('${payload.senderAccountId}', '${payload.receiverAccountId}') ORDER BY account_id ASC FOR UPDATE;`, 'lock');

  try {
    const response = await fetch(`${API_BASE}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logSql(`UPDATE accounts SET balance = balance - ${payload.amount} WHERE account_id = '${payload.senderAccountId}';`, 'sql');
      logSql(`UPDATE accounts SET balance = balance + ${payload.amount} WHERE account_id = '${payload.receiverAccountId}';`, 'sql');
      logSql(`INSERT INTO transactions VALUES ('${result.transaction.transaction_id}', ... 'SUCCESS');`, 'sql');
      logSql('COMMIT; -- Transaction Durably Written to WAL', 'success');

      showToast(result.message || 'Transfer completed successfully!', 'success');
      
      document.getElementById('amountInput').value = '';
      document.getElementById('noteInput').value = '';

      // refresh balances and history across local state
      await loadAccounts();
    } else {
      logSql(`ROLLBACK; -- Transaction Aborted: ${result.message}`, 'error');
      showToast(result.message || 'Transfer failed.', 'error');
      await refreshHistory();
    }
  } catch (error) {
    logSql(`ROLLBACK; -- Network Error: ${error.message}`, 'error');
    showToast(`Transfer error: ${error.message}`, 'error');
  } finally {
    setLockIndicator(false);
  }
}

// event listeners & ui helpers

function setupEventListeners() {
  // transfer form & PIN modal
  document.getElementById('openPinModalBtn').addEventListener('click', handleOpenPinModal);
  document.getElementById('btnPinCancel').addEventListener('click', closePinModal);
  document.getElementById('btnPinSubmit').addEventListener('click', submitTransfer);

  // numeric keypad clicks
  document.querySelectorAll('.keypad-btn[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.currentPin.length < 4) {
        state.currentPin += btn.dataset.key;
        updatePinDots();
        if (state.currentPin.length === 4) {
          // auto-submit or enable submit button
          setTimeout(submitTransfer, 200);
        }
      }
    });
  });

  // keypad backspace
  document.getElementById('btnPinBackspace').addEventListener('click', () => {
    if (state.currentPin.length > 0) {
      state.currentPin = state.currentPin.slice(0, -1);
      updatePinDots();
    }
  });

  // physical keyboard support for PIN modal
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('pinModal');
    if (modal && !modal.classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') {
        if (state.currentPin.length < 4) {
          state.currentPin += e.key;
          updatePinDots();
          if (state.currentPin.length === 4) {
            setTimeout(submitTransfer, 200);
          }
        }
      } else if (e.key === 'Backspace') {
        state.currentPin = state.currentPin.slice(0, -1);
        updatePinDots();
      } else if (e.key === 'Escape') {
        closePinModal();
      }
    }
  });

  // internal phone navigation tabs
  const tabTransfer = document.getElementById('tabTransfer');
  const tabHistory = document.getElementById('tabHistory');
  const tabInfo = document.getElementById('tabInfo');

  const panelTransfer = document.getElementById('panelTransfer');
  const panelHistory = document.getElementById('panelHistory');
  const panelInfo = document.getElementById('panelInfo');

  tabTransfer.addEventListener('click', () => {
    tabTransfer.classList.add('active');
    tabHistory.classList.remove('active');
    tabInfo.classList.remove('active');
    panelTransfer.classList.remove('hidden');
    panelHistory.classList.add('hidden');
    panelInfo.classList.add('hidden');
  });

  tabHistory.addEventListener('click', () => {
    tabTransfer.classList.remove('active');
    tabHistory.classList.add('active');
    tabInfo.classList.remove('active');
    panelTransfer.classList.add('hidden');
    panelHistory.classList.remove('hidden');
    panelInfo.classList.add('hidden');
    refreshHistory();
  });

  tabInfo.addEventListener('click', () => {
    tabTransfer.classList.remove('active');
    tabHistory.classList.remove('active');
    tabInfo.classList.add('active');
    panelTransfer.classList.add('hidden');
    panelHistory.classList.add('hidden');
    panelInfo.classList.remove('hidden');
  });

  document.getElementById('refreshHistoryBtn').addEventListener('click', refreshHistory);

  // reset demo balances
  document.getElementById('resetDemoBtn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('All accounts reset to default seed values.', 'success');
        logSql('[RESET] Account balances restored to seed state.', 'info');
        await loadAccounts();
      }
    } catch (e) {
      showToast('Reset failed.', 'error');
    }
  });

  // SQL console inspector tabs
  document.querySelectorAll('.insp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.insp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.insp-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      if (target === 'liveSql') document.getElementById('tabContentLiveSql').classList.add('active');
      if (target === 'acidExplainer') document.getElementById('tabContentAcidExplainer').classList.add('active');
      if (target === 'schemaView') document.getElementById('tabContentSchemaView').classList.add('active');
    });
  });

  document.getElementById('clearLogsBtn').addEventListener('click', () => {
    document.getElementById('sqlTerminal').innerHTML = '<div class="log-line log-system">[LOG CLEARED] Ready for new queries.</div>';
  });

  // mobile SQL panel toggle
  document.getElementById('toggleSqlPanelBtn').addEventListener('click', () => {
    const panel = document.getElementById('sqlInspectorPanel');
    panel.scrollIntoView({ behavior: 'smooth' });
  });
}

// logger & utilities

function logSql(message, type = 'info') {
  const terminal = document.getElementById('sqlTerminal');
  if (!terminal) return;

  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = message;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function setupLiveLog(msg) {
  logSql(msg, 'system');
}

function setLockIndicator(isLocked) {
  const indicator = document.getElementById('concurrencyLockStatus');
  const text = indicator.querySelector('.lock-text');
  if (isLocked) {
    indicator.classList.add('locked');
    text.textContent = 'ROW LOCKED';
  } else {
    indicator.classList.remove('locked');
    text.textContent = 'UNLOCKED';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

function startClock() {
  const update = () => {
    const el = document.getElementById('liveTime');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  update();
  setInterval(update, 1000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
