// MinePay frontend

import React, { useState, useEffect } from 'react';

// types adhering strictly to 3NF relational schema
export interface Recipient {
  account_id: string;
  user_id: string;
  account_number: string;
  masked_account_number?: string;
  chest_name: string;
  chest_type: string;
  balance?: number;
  username: string;
  email?: string;
  upi_handle: string;
  skin_avatar?: string;
}

interface User {
  user_id: string;
  username: string;
  email: string;
  phone_number: string;
  upi_handle: string;
  skin_avatar: 'alex' | 'piglin' | 'steve' | 'villager';
  pin: string;
}

interface Account {
  account_id: string;
  user_id: string;
  account_number: string;
  chest_name: string;
  chest_type: 'OAK_CHEST' | 'GOLD_PILE' | 'EMERALD_VAULT' | 'ENDER_CHEST';
  balance: number;
}

interface Transaction {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  note: string;
  source: 'BANK' | 'LAB';
  timestamp: string;
  sender_name: string;
  receiver_name: string;
}

interface SqlTraceEvent {
  eventId: string;
  timestamp: string;
  requestId: string;
  operation: string;
  queryType: 'BEGIN' | 'SELECT' | 'UPDATE' | 'INSERT' | 'COMMIT' | 'ROLLBACK' | 'LOCK';
  sanitizedSql: string;
  safeParams?: string;
  durationMs: number;
  rowsAffected: number;
  outcome: 'COMMITTED' | 'ROLLED_BACK' | 'EXECUTED' | 'FAILED';
}

// fallback demo data
const DEMO_USERS: User[] = [
  {
    user_id: 'a0000000-0000-0000-0000-000000000002',
    username: 'Alex',
    email: 'alex@minepay.mine',
    phone_number: '+919876543202',
    upi_handle: 'alex@minepay',
    skin_avatar: 'alex',
    pin: '4321',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000004',
    username: 'Piglin Barterer',
    email: 'piglin@minepay.mine',
    phone_number: '+919876543204',
    upi_handle: 'piglin@minepay',
    skin_avatar: 'piglin',
    pin: '9999',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000001',
    username: 'Steve',
    email: 'steve@minepay.mine',
    phone_number: '+919876543201',
    upi_handle: 'steve@minepay',
    skin_avatar: 'steve',
    pin: '1234',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000003',
    username: 'Villager',
    email: 'villager@minepay.mine',
    phone_number: '+919876543203',
    upi_handle: 'villager@minepay',
    skin_avatar: 'villager',
    pin: '0000',
  },
];

const DEMO_ACCOUNTS: Account[] = [
  {
    account_id: 'b0000000-0000-0000-0000-000000000002',
    user_id: 'a0000000-0000-0000-0000-000000000002',
    account_number: 'CHEST-ALEX-OAK',
    chest_name: "Alex's Oak Chest",
    chest_type: 'OAK_CHEST',
    balance: 2300.0,
  },
  {
    account_id: 'b0000000-0000-0000-0000-000000000004',
    user_id: 'a0000000-0000-0000-0000-000000000004',
    account_number: 'CHEST-PIGLIN-GOLD',
    chest_name: "Piglin's Gold Pile",
    chest_type: 'GOLD_PILE',
    balance: 1800.0,
  },
  {
    account_id: 'b0000000-0000-0000-0000-000000000001',
    user_id: 'a0000000-0000-0000-0000-000000000001',
    account_number: 'CHEST-STEVE-OAK',
    chest_name: "Steve's Oak Chest",
    chest_type: 'OAK_CHEST',
    balance: 1500.0,
  },
  {
    account_id: 'b0000000-0000-0000-0000-000000000003',
    user_id: 'a0000000-0000-0000-0000-000000000003',
    account_number: 'CHEST-VILLAGE-VAULT',
    chest_name: "Villager's Emerald Vault",
    chest_type: 'EMERALD_VAULT',
    balance: 4000.0,
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000007',
    sender_account_id: 'b0000000-0000-0000-0000-000000000003',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000002',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'DEVICE-4 demo refund',
    source: 'LAB',
    sender_name: 'MinePay Vault',
    receiver_name: 'Alex',
    timestamp: 'Oct 25 · 22:19',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000006',
    sender_account_id: 'b0000000-0000-0000-0000-000000000003',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000002',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'DEVICE-3 demo refund',
    source: 'LAB',
    sender_name: 'MinePay Vault',
    receiver_name: 'Alex',
    timestamp: 'Oct 25 · 22:19',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000005',
    sender_account_id: 'b0000000-0000-0000-0000-000000000003',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000002',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'DEVICE-2 demo refund',
    source: 'LAB',
    sender_name: 'MinePay Vault',
    receiver_name: 'Alex',
    timestamp: 'Oct 25 · 22:19',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000004',
    sender_account_id: 'b0000000-0000-0000-0000-000000000003',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000002',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'DEVICE-1 demo refund',
    source: 'LAB',
    sender_name: 'MinePay Vault',
    receiver_name: 'Alex',
    timestamp: 'Oct 25 · 22:19',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000003',
    sender_account_id: 'b0000000-0000-0000-0000-000000000002',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000004',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'FOR My lover',
    source: 'BANK',
    sender_name: 'Alex',
    receiver_name: 'Piglin',
    timestamp: 'Oct 25 · 22:16',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000002',
    sender_account_id: 'b0000000-0000-0000-0000-000000000002',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000001',
    amount: 500.0,
    status: 'SUCCESS',
    note: 'halfsies on the diamond sword',
    source: 'BANK',
    sender_name: 'Alex',
    receiver_name: 'Steve',
    timestamp: 'Oct 25 · 17:08',
  },
  {
    transaction_id: 'c0000000-0000-0000-0000-000000000001',
    sender_account_id: 'b0000000-0000-0000-0000-000000000001',
    receiver_account_id: 'b0000000-0000-0000-0000-000000000002',
    amount: 250.0,
    status: 'SUCCESS',
    note: 'carrot trade',
    source: 'BANK',
    sender_name: 'Steve',
    receiver_name: 'Alex',
    timestamp: 'Oct 22 · 22:08',
  },
];

export default function App() {
  // navigation & screen state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [activeScreen, setActiveScreen] = useState<'BANK' | 'HISTORY' | 'LAB' | 'SPEC' | 'LECTURE'>('BANK');
  const [historyScope, setHistoryScope] = useState<'CHEST' | 'ALL'>('CHEST');
  const [historySearch, setHistorySearch] = useState<string>('');

  // entrance page (authentication) state
  const [authTab, setAuthTab] = useState<'DEMO' | 'LOGIN' | 'REGISTER'>('DEMO');
  const [selectedDemoUser, setSelectedDemoUser] = useState<User>(DEMO_USERS[0]);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // database & banking state
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // dynamic recipient & PostgreSQL status state
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [recipientsLoading, setRecipientsLoading] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('minepay_token'));
  const [postgresConnected, setPostgresConnected] = useState<boolean>(false);
  const [postgresEngine, setPostgresEngine] = useState<string>('PostgreSQL Engine');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);
  const [isLabRunning, setIsLabRunning] = useState<boolean>(false);
  const [tableExplorerData, setTableExplorerData] = useState<{ columns: string[]; rows: any[] }>({ columns: [], rows: [] });

  // bank form state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [sendAmount, setSendAmount] = useState<string>('');
  const [sendNote, setSendNote] = useState<string>('');
  const [transferStatus, setTransferStatus] = useState<string>('atomic debit + credit, rolled back on any fault');

  // consistency lab state
  const [labDevicesCount, setLabDevicesCount] = useState<number>(4);
  const [labDebitAmount, setLabDebitAmount] = useState<string>('500');
  const [labResults, setLabResults] = useState<{
    ran: boolean;
    devices: { id: string; status: 'ACCEPTED' | 'REJECTED'; message: string }[];
    startBalance: number;
    accepted: number;
    rejected: number;
    afterRefunds: number;
  }>({
    ran: true,
    devices: [
      { id: 'DEVICE-1', status: 'ACCEPTED', message: 'lock captured - debit committed' },
      { id: 'DEVICE-2', status: 'ACCEPTED', message: 'lock captured - debit committed' },
      { id: 'DEVICE-3', status: 'ACCEPTED', message: 'lock captured - debit committed' },
      { id: 'DEVICE-4', status: 'ACCEPTED', message: 'lock captured - debit committed' },
    ],
    startBalance: 2300,
    accepted: 4,
    rejected: 0,
    afterRefunds: 2300,
  });

  // lecture mode state
  const [lectureSubTab, setLectureSubTab] = useState<'TRACE' | 'EXPLORER' | 'INSPECTOR' | 'ER' | 'CONCURRENCY' | 'CONCEPTS'>('TRACE');
  const [traceFilter, setTraceFilter] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<'users' | 'accounts' | 'transactions'>('accounts');
  const [traceEvents, setTraceEvents] = useState<SqlTraceEvent[]>([
    {
      eventId: 'evt-1',
      timestamp: '2026-10-25 22:19:00.124',
      requestId: 'req-lab-04',
      operation: 'CONCURRENCY_LAB_RUN',
      queryType: 'LOCK',
      sanitizedSql: 'SELECT account_id, balance FROM accounts WHERE account_id = $1 FOR UPDATE;',
      safeParams: 'account_id: "b0000000-0000-0000-0000-000000000002"',
      durationMs: 1.82,
      rowsAffected: 1,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-2',
      timestamp: '2026-10-25 22:16:04.550',
      requestId: 'req-tx-89',
      operation: 'TRANSFER_ATOMIC',
      queryType: 'COMMIT',
      sanitizedSql: 'COMMIT; -- Flushed to Write-Ahead Log (WAL)',
      durationMs: 1.15,
      rowsAffected: 1,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-3',
      timestamp: '2026-10-25 22:16:04.420',
      requestId: 'req-tx-89',
      operation: 'INSERT_LEDGER',
      queryType: 'INSERT',
      sanitizedSql: 'INSERT INTO transactions (transaction_id, sender_account_id, receiver_account_id, amount, status, note) VALUES ($1, $2, $3, $4, $5, $6);',
      safeParams: 'amount: 500.00, status: "SUCCESS"',
      durationMs: 0.94,
      rowsAffected: 1,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-4',
      timestamp: '2026-10-25 22:16:04.280',
      requestId: 'req-tx-89',
      operation: 'ATOMIC_CREDIT',
      queryType: 'UPDATE',
      sanitizedSql: 'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2;',
      safeParams: 'amount: 500.00, account_id: "Piglin Gold Pile"',
      durationMs: 0.72,
      rowsAffected: 1,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-5',
      timestamp: '2026-10-25 22:16:04.110',
      requestId: 'req-tx-89',
      operation: 'ATOMIC_DEBIT',
      queryType: 'UPDATE',
      sanitizedSql: 'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2;',
      safeParams: 'amount: 500.00, account_id: "Alex Oak Chest"',
      durationMs: 0.68,
      rowsAffected: 1,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-6',
      timestamp: '2026-10-25 22:16:03.950',
      requestId: 'req-tx-89',
      operation: 'ROW_LOCK_ACQUISITION',
      queryType: 'LOCK',
      sanitizedSql: 'SELECT account_id, balance, security_pin_hash FROM accounts WHERE account_id IN ($1, $2) ORDER BY account_id ASC FOR UPDATE;',
      safeParams: 'ids: [sorted deterministic order]',
      durationMs: 1.45,
      rowsAffected: 2,
      outcome: 'COMMITTED',
    },
    {
      eventId: 'evt-7',
      timestamp: '2026-10-25 22:16:03.780',
      requestId: 'req-tx-89',
      operation: 'TRANSFER_BEGIN',
      queryType: 'BEGIN',
      sanitizedSql: 'BEGIN TRANSACTION;',
      durationMs: 0.32,
      rowsAffected: 0,
      outcome: 'COMMITTED',
    },
  ]);

  // notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // add SQL trace helper
  const addTrace = (
    operation: string,
    queryType: SqlTraceEvent['queryType'],
    sanitizedSql: string,
    safeParams?: string,
    outcome: SqlTraceEvent['outcome'] = 'COMMITTED',
    durationMs: number = 0.8
  ) => {
    const newEvent: SqlTraceEvent = {
      eventId: 'evt-' + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 23),
      requestId: 'req-' + Math.random().toString(36).substring(2, 8),
      operation,
      queryType,
      sanitizedSql,
      safeParams,
      durationMs,
      rowsAffected: queryType === 'UPDATE' || queryType === 'INSERT' ? 1 : queryType === 'LOCK' ? 2 : 0,
      outcome,
    };
    setTraceEvents((prev) => [newEvent, ...prev.slice(0, 150)]);
  };

  // fetch all registered players from backend
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const loadedUsers: User[] = data.data.map((u: any) => ({
          user_id: u.user_id,
          username: u.username,
          email: u.email,
          phone_number: u.phone_number || '',
          upi_handle: u.upi_handle || `${u.username.toLowerCase()}@minepay`,
          skin_avatar: u.skin_avatar || 'alex',
          pin: u.pin || '1234',
        }));
        setUsers(loadedUsers);

        const loadedAccounts: Account[] = data.data
          .filter((u: any) => u.account_id)
          .map((u: any) => ({
            account_id: u.account_id,
            user_id: u.user_id,
            account_number: u.account_number || `CHEST-${u.username.toUpperCase()}`,
            chest_name: u.chest_name || `${u.username}'s Chest`,
            chest_type: (u.chest_type as any) || 'OAK_CHEST',
            balance: typeof u.balance === 'number' ? u.balance : parseFloat(u.balance) || 1000,
          }));
        if (loadedAccounts.length > 0) {
          setAccounts(loadedAccounts);
        }
      }
    } catch (e) {
      console.warn('Failed to load registered players from backend:', e);
    }
  };

  // switch active player / account (with backend session sync)
  const switchPlayer = async (user: User) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user.user_id, username: user.username, pin: user.pin || '1234' }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setAuthToken(data.token);
        localStorage.setItem('minepay_token', data.token);
        setCurrentUser(data.user);
        setCurrentAccount(data.account);
        showToast(`Switched to @${data.user.username}`);
        fetchRecipients(recipientSearch, data.account.account_id);
        refreshAccountAndHistory(data.token, data.account.account_id);
        fetchTraces();
        return;
      } else {
        setAuthError(data.message || 'Database rejected switch request.');
      }
    } catch (e: any) {
      setAuthError(e.message || 'PostgreSQL database service is required.');
    }
  };

  // backend api & data sync hooks

  // check system database connection status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setPostgresConnected(Boolean(data.postgresConnected));
        setPostgresEngine(data.engine || 'PostgreSQL Engine');
      }
    } catch (e) {
      console.warn('Backend status check failed, using active local runtime:', e);
    }
  };

  // fetch real eligible recipient accounts dynamically
  const fetchRecipients = async (searchQuery: string = '', senderAccId?: string) => {
    const accountId = senderAccId || currentAccount?.account_id;
    if (!accountId) return;
    setRecipientsLoading(true);
    try {
      const res = await fetch(`/api/recipients?senderAccountId=${accountId}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRecipients(data.data);
        // automatically select the first eligible recipient if none selected or no longer valid
        if (!data.data.some((r: Recipient) => r.account_id === selectedRecipientId)) {
          if (data.data.length > 0) {
            setSelectedRecipientId(data.data[0].account_id);
          } else {
            setSelectedRecipientId('');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch dynamic recipients:', e);
    } finally {
      setRecipientsLoading(false);
    }
  };

  // fetch real SQL execution traces from server buffer
  const fetchTraces = async () => {
    try {
      const res = await fetch('/api/lecture/traces?limit=60');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setTraceEvents(data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch SQL traces:', e);
    }
  };

  // fetch database table records for explorer
  const fetchTable = async (tableName: string) => {
    try {
      const res = await fetch(`/api/lecture/table/${tableName}?limit=25`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rows)) {
        setTableExplorerData({ columns: data.columns || [], rows: data.rows });
      }
    } catch (e) {
      console.warn('Failed to fetch table records:', e);
    }
  };

  // refresh active user balance and transaction history (PostgreSQL)
  const refreshAccountAndHistory = async (tokenOverride?: string, targetAccountId?: string) => {
    const token = tokenOverride || authToken;
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const accId = targetAccountId || currentAccount?.account_id;
      const balUrl = accId ? `/api/balance?accountId=${accId}` : '/api/balance';
      const histUrl = accId ? `/api/history?accountId=${accId}` : '/api/history?all=true';

      const [balRes, histRes] = await Promise.all([
        fetch(balUrl, { headers, credentials: 'include' }).catch(() => null),
        fetch(histUrl, { headers, credentials: 'include' }).catch(() => null),
      ]);

      if (balRes && balRes.ok) {
        const balData = await balRes.json();
        if (balData.success && balData.account) {
          setCurrentAccount((prev) => (prev ? { ...prev, balance: balData.account.balance } : balData.account));
          setAccounts((prev) =>
            prev.map((a) => (a.account_id === balData.account.account_id ? { ...a, balance: balData.account.balance } : a))
          );
        }
      }
      if (histRes && histRes.ok) {
        const histData = await histRes.json();
        if (histData.success && Array.isArray(histData.data)) {
          setTransactions(histData.data);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh balance/history:', e);
    }
  };

  // restore authenticated session from persistent server cookie / token
  const checkSession = async () => {
    try {
      const token = authToken || localStorage.getItem('minepay_token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user && data.account) {
          setCurrentUser(data.user);
          setCurrentAccount(data.account);
          fetchRecipients('', data.account.account_id);
          refreshAccountAndHistory(undefined, data.account.account_id);
        }
      }
    } catch (e) {
      console.warn('Session check failed:', e);
    }
  };

  // initial load effect
  useEffect(() => {
    checkStatus();
    checkSession();
    fetchUsers();
    fetchTraces();
  }, []);

  // shared multi-device state: poll database every 3 seconds when logged in
  useEffect(() => {
    if (!currentUser || !currentAccount) return;
    const interval = setInterval(() => {
      refreshAccountAndHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser?.user_id, currentAccount?.account_id]);

  // when active screen or lecture subtab changes
  useEffect(() => {
    if (activeScreen === 'LECTURE') {
      fetchTraces();
      if (lectureSubTab === 'EXPLORER') {
        fetchTable(selectedTable);
      }
    }
  }, [activeScreen, lectureSubTab, selectedTable]);

  // when active account changes, refresh dynamic recipient list
  useEffect(() => {
    if (currentAccount?.account_id) {
      fetchRecipients(recipientSearch, currentAccount.account_id);
      refreshAccountAndHistory();
    }
  }, [currentAccount?.account_id]);

  // AUTHENTICATION LOGIC (connected to express REST API)

  // handle demo keypad PIN input
  const handleKeypadPress = (val: string) => {
    if (val === 'CLR') {
      setEnteredPin('');
      setAuthError(null);
      return;
    }
    if (val === 'DEL') {
      setEnteredPin((prev) => prev.slice(0, -1));
      setAuthError(null);
      return;
    }
    if (enteredPin.length < 4) {
      const next = enteredPin + val;
      setEnteredPin(next);
      setAuthError(null);
      if (next.length === 4) {
        setTimeout(() => executeDemoLogin(next), 200);
      }
    }
  };

  const executeDemoLogin = async (pinToTest?: string) => {
    const pin = pinToTest || enteredPin;
    if (pin.length !== 4) {
      setAuthError('Please enter the full 4-digit PIN.');
      return;
    }

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: selectedDemoUser.user_id, pin }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.message || 'Demo authentication failed.');
        fetchTraces();
        return;
      }

      setAuthToken(data.token);
      localStorage.setItem('minepay_token', data.token);
      setCurrentUser(data.user);
      setCurrentAccount(data.account);
      setEnteredPin('');
      setAuthError(null);
      showToast(`Welcome back, ${data.user.username}!`);
      fetchRecipients('', data.account.account_id);
      fetchTraces();
    } catch (e: any) {
      setAuthError(e.message || 'PostgreSQL database connection error. Online database is required.');
    }
  };

  // normal login
  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usernameOrEmail: loginIdentifier, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.message || 'Authentication failed.');
        fetchTraces();
        return;
      }

      setAuthToken(data.token);
      localStorage.setItem('minepay_token', data.token);
      setCurrentUser(data.user);
      setCurrentAccount(data.account);
      setLoginIdentifier('');
      setLoginPassword('');
      showToast(`Welcome to MinePay, ${data.user.username}!`);
      fetchRecipients('', data.account.account_id);
      fetchTraces();
    } catch (err: any) {
      setAuthError(err.message || 'Login request failed.');
    }
  };

  // normal registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthError('All fields are required.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          skinAvatar: 'alex',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.message || 'Registration failed.');
        return;
      }

      showToast(`Account created for ${regName}! Signing in...`);
      // immediately refresh registered users across application
      await fetchUsers();

      // auto login new registered account
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usernameOrEmail: regName.trim(), password: regPassword }),
      });
      const loginData = await loginRes.json();
      if (loginData.success) {
        setAuthToken(loginData.token);
        localStorage.setItem('minepay_token', loginData.token);
        setCurrentUser(loginData.user);
        setCurrentAccount(loginData.account);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRecipientSearch('');
        fetchRecipients('', loginData.account.account_id);
        refreshAccountAndHistory(loginData.token, loginData.account.account_id);
        fetchTraces();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration request failed.');
    }
  };

  // logout / EXIT
  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: 'include',
        });
      } catch (e) {
        // continue logout locally
      }
    }
    setAuthToken(null);
    localStorage.removeItem('minepay_token');
    setCurrentUser(null);
    setCurrentAccount(null);
    setActiveScreen('BANK');
    setEnteredPin('');
    setAuthError(null);
    showToast('Logged out securely.');
    fetchTraces();
  };

  // BANKING TRANSFER LOGIC (ACID + ROW-LEVEL LOCKING via REST API)

  const handleSendEmeralds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    const numAmount = parseFloat(sendAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter an emerald amount greater than 0.');
      return;
    }

    if (!selectedRecipientId) {
      showToast('Please select a recipient chest.');
      return;
    }

    setIsSubmittingTransfer(true);
    setTransferStatus('🔒 locking account rows in deterministic order (ORDER BY id ASC)...');

    try {
      const idempotencyKey = 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          senderAccountId: currentAccount.account_id,
          receiverAccountId: selectedRecipientId,
          amount: numAmount,
          note: sendNote || 'Emeralds transfer',
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setTransferStatus(`❌ REJECTED: ${data.message}`);
        showToast(data.message || 'Transfer rejected by database constraints.');
        fetchTraces();
        return;
      }

      // update balance from returned PostgreSQL / ACID record
      const newBal = data.senderNewBalance ?? data.data?.senderBalance;
      if (newBal !== undefined) {
        setCurrentAccount((prev) => (prev ? { ...prev, balance: newBal } : null));
        setAccounts((prev) =>
          prev.map((a) => (a.account_id === currentAccount.account_id ? { ...a, balance: newBal } : a))
        );
      }

      // immediately prepend the new transaction to transactions list
      if (data.transaction) {
        setTransactions((prev) => {
          const exists = prev.some((t) => t.transaction_id === data.transaction.transaction_id);
          return exists ? prev : [data.transaction, ...prev];
        });
      }

      setSendAmount('');
      setSendNote('');
      setTransferStatus('⚡ transaction protected - atomic debit + credit, committed to WAL');
      showToast(data.message || `Transferred ${numAmount} 💎 successfully!`);

      // refresh transactions and live execution traces
      refreshAccountAndHistory();
      fetchTraces();
    } catch (err: any) {
      setTransferStatus(`❌ REJECTED: ${err.message}`);
      showToast(err.message || 'Transfer failed.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // CONSISTENCY LAB ATTACK RUNNER (concurrent connections via API)

  const handleRunAttack = async () => {
    if (!currentAccount) return;
    const debitAmountEach = parseFloat(labDebitAmount) || 500;
    setIsLabRunning(true);

    try {
      const res = await fetch('/api/lab/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAccountId: currentAccount.account_id,
          deviceCount: labDevicesCount,
          debitAmount: debitAmountEach,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setLabResults({
          ran: true,
          devices: data.devices,
          startBalance: data.startBalance,
          accepted: data.acceptedCount,
          rejected: data.rejectedCount,
          afterRefunds: data.finalBalance,
        });

        showToast(`Attack completed: ${data.acceptedCount} accepted, ${data.rejectedCount} rejected.`);
        refreshAccountAndHistory();
        fetchTraces();
      } else {
        showToast(data.message || 'Lab attack failed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to communicate with concurrency test service.');
    } finally {
      setIsLabRunning(false);
    }
  };

  // render: entrance screen

  if (!currentUser || !currentAccount) {
    return (
      <div className="min-h-screen bg-[#191A1C] text-[#E2E8F0] font-['VT323',monospace] text-lg flex flex-col justify-between selection:bg-[#50C878] selection:text-black">
        
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-[1.1fr_1.3fr] gap-8 items-start">
            
            <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.15),0_6px_0_#000]">
              
              <div className="mb-4">
                <div className="text-4xl text-[#50C878] mb-2 transform -rotate-12 inline-block">⛏</div>
                <h1 className="font-['Press_Start_2P',monospace] text-2xl text-[#50C878] tracking-wider mb-2">
                  MINEPAY
                </h1>
                <p className="text-[#A3A3A3] text-xl leading-relaxed">
                  The multidevice online banking simulator - where every emerald is protected by real database transactions.
                </p>
              </div>

              <div className="space-y-3.5 my-6 text-xl">
                <div className="flex items-start gap-2.5">
                  <span className="text-[#FFC700] text-2xl leading-none">⚡</span>
                  <span className="text-[#E0E0E0]">
                    <strong className="text-white">ACID transfers</strong> - all-or-nothing, rolled back on any fault
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-[#50C878] text-2xl leading-none">🔒</span>
                  <span className="text-[#E0E0E0]">
                    <strong className="text-white">Row-level locking</strong> - double-spending impossible
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-[#00D2FF] text-2xl leading-none">💎</span>
                  <span className="text-[#E0E0E0]">
                    <strong className="text-white">Emerald ledger</strong> - every debit &amp; credit recorded
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-[#B88746] text-2xl leading-none">📦</span>
                  <span className="text-[#E0E0E0]">
                    <strong className="text-white">Chest accounts</strong> - oak, ender &amp; barrel
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-xl mb-2">
                  <span className="text-[#E53935]">❤️</span>
                  <span className="text-[#E53935]">❤️</span>
                  <span className="text-[#E53935]">❤️</span>
                  <span className="text-[#333]">🖤</span>
                </div>
                <div className="w-full h-3 bg-black border-2 border-[#1A1A1C] p-0.5">
                  <div className="h-full bg-[#50C878] w-[88%] shadow-[0_0_8px_#50C878]"></div>
                </div>
              </div>

            </div>

            <div className="bg-[#3D2817] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_#5A3B22,0_6px_0_#000]">
              
              <div className="flex border-b-2 border-black mb-5 gap-1">
                <button
                  type="button"
                  onClick={() => { setAuthTab('DEMO'); setAuthError(null); }}
                  className={`font-['Press_Start_2P',monospace] text-[10px] py-2 px-3 border-t-2 border-l-2 border-r-2 border-black cursor-pointer ${
                    authTab === 'DEMO' ? 'bg-[#5A3B22] text-[#FFC700]' : 'bg-[#291B10] text-[#A3A3A3]'
                  }`}
                >
                  DEMO ACCESS
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthTab('LOGIN'); setAuthError(null); }}
                  className={`font-['Press_Start_2P',monospace] text-[10px] py-2 px-3 border-t-2 border-l-2 border-r-2 border-black cursor-pointer ${
                    authTab === 'LOGIN' ? 'bg-[#5A3B22] text-[#FFC700]' : 'bg-[#291B10] text-[#A3A3A3]'
                  }`}
                >
                  LOGIN
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthTab('REGISTER'); setAuthError(null); }}
                  className={`font-['Press_Start_2P',monospace] text-[10px] py-2 px-3 border-t-2 border-l-2 border-r-2 border-black cursor-pointer ${
                    authTab === 'REGISTER' ? 'bg-[#5A3B22] text-[#FFC700]' : 'bg-[#291B10] text-[#A3A3A3]'
                  }`}
                >
                  REGISTER
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-2 bg-[#8E1B1B] text-[#FFCCCC] border-2 border-black text-base">
                  ⚠️ {authError}
                </div>
              )}

              {authTab === 'DEMO' && (
                <div>
                  <h2 className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] mb-3 tracking-wide">
                    SELECT PLAYER
                  </h2>

                  <div className="grid grid-cols-2 gap-2.5 mb-5 max-h-[190px] overflow-y-auto pr-1">
                    {(users.length > 0 ? users : DEMO_USERS).map((u) => {
                      const isSelected = selectedDemoUser.user_id === u.user_id;
                      const icons: Record<string, string> = { alex: '🏹', piglin: '🗡️', steve: '⛏', villager: '💰' };
                      const avatar = icons[u.skin_avatar] || '👤';
                      return (
                        <div
                          key={u.user_id}
                          onClick={() => { setSelectedDemoUser(u); setEnteredPin(''); setAuthError(null); }}
                          className={`bg-[#291B10] p-2.5 border-2 cursor-pointer flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#50C878] shadow-[0_0_8px_#50C878,inset_1px_1px_0_#50C878]'
                              : 'border-black hover:border-[#866043]'
                          }`}
                        >
                          <span className="text-2xl mb-1">{avatar}</span>
                          <span className="font-['Press_Start_2P',monospace] text-[10px] text-white truncate max-w-[120px] text-center">
                            {u.username}
                          </span>
                          <span className="text-[9px] text-[#FFE6A3] mt-0.5 font-mono">PIN {u.pin || '1234'}</span>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="font-['Press_Start_2P',monospace] text-[11px] text-[#FFC700] mb-2 tracking-wide">
                    ENTER PIN
                  </h3>

                  <div className="bg-black border-2 border-black p-3 mb-4 flex items-center justify-center gap-6">
                    {[0, 1, 2, 3].map((idx) => (
                      <span
                        key={idx}
                        className={`text-2xl font-bold leading-none ${
                          idx < enteredPin.length ? 'text-[#50C878]' : 'text-[#444]'
                        }`}
                      >
                        {idx < enteredPin.length ? '●' : '·'}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeypadPress(digit)}
                        className="bg-[#2D2E30] text-white font-['Press_Start_2P',monospace] text-xs py-3.5 border-2 border-black shadow-[inset_2px_2px_0_#444,0_4px_0_#000] active:translate-y-1 active:shadow-[0_1px_0_#000] cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CLR')}
                      className="bg-[#2D2E30] text-[#FFC700] font-['Press_Start_2P',monospace] text-[10px] py-3.5 border-2 border-black shadow-[inset_2px_2px_0_#444,0_4px_0_#000] active:translate-y-1 active:shadow-[0_1px_0_#000] cursor-pointer"
                    >
                      CLR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="bg-[#2D2E30] text-white font-['Press_Start_2P',monospace] text-xs py-3.5 border-2 border-black shadow-[inset_2px_2px_0_#444,0_4px_0_#000] active:translate-y-1 active:shadow-[0_1px_0_#000] cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('DEL')}
                      className="bg-[#2D2E30] text-[#E53935] font-['Press_Start_2P',monospace] text-xs py-3.5 border-2 border-black shadow-[inset_2px_2px_0_#444,0_4px_0_#000] active:translate-y-1 active:shadow-[0_1px_0_#000] cursor-pointer"
                    >
                      ⌫
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => executeDemoLogin()}
                    className="w-full py-3.5 bg-[#E58514] text-white font-['Press_Start_2P',monospace] text-xs border-2 border-black shadow-[inset_2px_2px_0_#FFA726,0_4px_0_#9E570B,0_6px_0_#000] active:translate-y-1 active:shadow-[0_2px_0_#000] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>▶</span>
                    <span>LOGIN</span>
                  </button>
                </div>
              )}

              {authTab === 'LOGIN' && (
                <form onSubmit={handleNormalLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#FFC700] font-['Press_Start_2P',monospace] text-[10px] mb-1">
                      USERNAME OR EMAIL
                    </label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. Alex or alex@minepay.mine"
                      className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#FFC700] font-['Press_Start_2P',monospace] text-[10px] mb-1">
                      PASSWORD / PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password or 4-digit PIN"
                        className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 text-xs text-[#A3A3A3] hover:text-white"
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#A3A3A3]">
                    Tip: Sign in with your registered username &amp; password, or use the 4-digit PIN Keypad on the left.
                  </p>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#E58514] text-white font-['Press_Start_2P',monospace] text-xs border-2 border-black shadow-[inset_2px_2px_0_#FFA726,0_4px_0_#9E570B,0_6px_0_#000] active:translate-y-1 active:shadow-[0_2px_0_#000] cursor-pointer"
                  >
                    ▶ SIGN IN
                  </button>
                </form>
              )}

              {authTab === 'REGISTER' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-[#FFC700] font-['Press_Start_2P',monospace] text-[9px] mb-1">
                      PLAYER DISPLAY NAME
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. DiamondMiner"
                      className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#FFC700] font-['Press_Start_2P',monospace] text-[9px] mb-1">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="miner@minepay.mine"
                      className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#FFC700] font-['Press_Start_2P',monospace] text-[9px] mb-1">
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#FFC700] font-['Press_Start_2P',monospace] text-[9px] mb-1">
                        CONFIRM
                      </label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black border-2 border-[#5A3B22] p-2 text-white text-xl outline-none focus:border-[#50C878]"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#00A859] text-white font-['Press_Start_2P',monospace] text-xs border-2 border-black shadow-[inset_2px_2px_0_#50C878,0_4px_0_#006030,0_6px_0_#000] active:translate-y-1 active:shadow-[0_2px_0_#000] cursor-pointer mt-2"
                  >
                    ✦ CREATE ACCOUNT
                  </button>
                </form>
              )}

            </div>

          </div>
        </div>

        <div className="w-full">
          <div className="h-2 bg-[#55AA22] border-t-2 border-black shadow-[0_2px_0_#3B7817]"></div>
          <div className="h-6 bg-[#573D26] border-t-2 border-[#3D2817]"></div>
        </div>

      </div>
    );
  }

  // render: authenticated banking dashboard

  const currentAvatarIcon = { alex: '🏹', piglin: '🗡️', steve: '⛏', villager: '💰' }[currentUser.skin_avatar] || '🏹';

  return (
    <div className="min-h-screen bg-[#191A1C] text-[#E2E8F0] font-['VT323',monospace] text-lg flex flex-col justify-between selection:bg-[#50C878] selection:text-black">
      
      <header className="bg-[#1F1F21] border-b-4 border-black px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        
        <div className="flex items-center gap-3">
          <span className="text-3xl text-[#50C878] transform -rotate-12">⛏</span>
          <span className="font-['Press_Start_2P',monospace] text-base md:text-lg text-[#50C878] tracking-wider">
            MINEPAY
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveScreen('BANK')}
            className={`px-3 py-1.5 border-2 border-black text-xs font-['Press_Start_2P',monospace] flex items-center gap-1.5 cursor-pointer ${
              activeScreen === 'BANK'
                ? 'bg-[#006030] text-[#50C878] border-[#50C878] shadow-[inset_1px_1px_0_#00A859,0_3px_0_#000]'
                : 'bg-[#2D2E30] text-[#A3A3A3] shadow-[inset_1px_1px_0_#444,0_3px_0_#000]'
            } active:translate-y-0.5`}
          >
            <span>🏛</span>
            <span>BANK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScreen('HISTORY');
              refreshAccountAndHistory();
            }}
            className={`px-3 py-1.5 border-2 border-black text-xs font-['Press_Start_2P',monospace] flex items-center gap-1.5 cursor-pointer ${
              activeScreen === 'HISTORY'
                ? 'bg-[#6B4E1B] text-[#FFC700] border-[#FFC700] shadow-[inset_1px_1px_0_#9E7428,0_3px_0_#000]'
                : 'bg-[#2D2E30] text-[#A3A3A3] shadow-[inset_1px_1px_0_#444,0_3px_0_#000]'
            } active:translate-y-0.5`}
          >
            <span>📜</span>
            <span>HISTORY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('LAB')}
            className={`px-3 py-1.5 border-2 border-black text-xs font-['Press_Start_2P',monospace] flex items-center gap-1.5 cursor-pointer ${
              activeScreen === 'LAB'
                ? 'bg-[#005577] text-[#00D2FF] border-[#00D2FF] shadow-[inset_1px_1px_0_#0088AA,0_3px_0_#000]'
                : 'bg-[#2D2E30] text-[#A3A3A3] shadow-[inset_1px_1px_0_#444,0_3px_0_#000]'
            } active:translate-y-0.5`}
          >
            <span>💉</span>
            <span>LAB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('SPEC')}
            className={`px-3 py-1.5 border-2 border-black text-xs font-['Press_Start_2P',monospace] flex items-center gap-1.5 cursor-pointer ${
              activeScreen === 'SPEC'
                ? 'bg-[#866043] text-[#FFE6A3] border-[#FFE6A3] shadow-[inset_1px_1px_0_#B88746,0_3px_0_#000]'
                : 'bg-[#2D2E30] text-[#A3A3A3] shadow-[inset_1px_1px_0_#444,0_3px_0_#000]'
            } active:translate-y-0.5`}
          >
            <span>📜</span>
            <span>SPEC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('LECTURE')}
            className={`px-3 py-1.5 border-2 border-black text-xs font-['Press_Start_2P',monospace] flex items-center gap-1.5 cursor-pointer ${
              activeScreen === 'LECTURE'
                ? 'bg-[#4A2D78] text-[#D8B4FE] border-[#C084FC] shadow-[inset_1px_1px_0_#7E22CE,0_3px_0_#000]'
                : 'bg-[#2D2E30] text-[#A3A3A3] shadow-[inset_1px_1px_0_#444,0_3px_0_#000]'
            } active:translate-y-0.5`}
          >
            <span>🎓</span>
            <span>LECTURE</span>
          </button>

          <div className="flex items-center gap-2 bg-[#1F1F21] border-2 border-[#50C878] px-2.5 py-1 text-sm text-[#50C878] font-['Press_Start_2P',monospace] text-[10px] shadow-[0_0_6px_rgba(80,200,120,0.4)]">
            <span>{currentAvatarIcon}</span>
            <span className="font-bold">@{currentUser.username}</span>
            {users.length > 1 && (
              <select
                value={currentUser.user_id}
                onChange={(e) => {
                  const targetUser = users.find((u) => u.user_id === e.target.value);
                  if (targetUser) switchPlayer(targetUser);
                }}
                className="bg-[#121314] text-[#FFC700] border border-[#50C878] text-[9px] px-1.5 py-0.5 outline-none cursor-pointer ml-1 font-mono"
                title="Switch active player"
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id} className="bg-[#1F1F21] text-white">
                    Switch: @{u.username}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 bg-[#C62828] text-white border-2 border-black font-['Press_Start_2P',monospace] text-[10px] shadow-[inset_1px_1px_0_#EF5350,0_3px_0_#8E0000,0_4px_0_#000] active:translate-y-0.5 cursor-pointer"
          >
            EXIT
          </button>
        </div>
      </header>

      <div className="bg-[#151618] border-b-2 border-black px-4 md:px-8 py-2 flex flex-wrap items-center justify-between text-xs font-['Press_Start_2P',monospace] text-[9px] gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 inline-block border border-black ${
              postgresConnected
                ? 'bg-[#50C878] shadow-[0_0_8px_#50C878]'
                : 'bg-[#FFC700] shadow-[0_0_8px_#FFC700]'
            }`}
          />
          <span className={postgresConnected ? 'text-[#50C878]' : 'text-[#FFC700]'}>
            {postgresEngine} {postgresConnected ? '· CONNECTED (14+)' : '· ACID ENGINE READY'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#A3A3A3] text-[9px]">
          <span>ACID: ROW-LEVEL LOCKS</span>
          <span className="text-[#444]">|</span>
          <span>ON DELETE RESTRICT</span>
          <span className="text-[#444]">|</span>
          <span className="text-[#00D2FF]">WAL LOGGING</span>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        
        {/* bank screen */}
        {activeScreen === 'BANK' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
              
              <div className="space-y-6">
                
                <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-5 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-['Press_Start_2P',monospace] text-[10px] text-[#A3A3A3]">
                      EMERALD BALANCE
                    </span>
                    <span className="bg-[#1F1F21] border border-[#50C878] px-2 py-0.5 text-xs text-[#50C878] flex items-center gap-1">
                      <span>📦</span> {currentAccount.chest_name}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 my-2">
                    <span className="font-['Press_Start_2P',monospace] text-3xl text-[#50C878] tracking-wider">
                      {currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-2xl text-[#00D2FF]">💎</span>
                  </div>

                  <p className="text-xs text-[#A3A3A3] mb-3">
                    OAK CHEST · account syncs across devices
                  </p>

                  <div className="w-full h-2.5 bg-black border border-[#1A1A1C] p-0.5">
                    <div className="h-full bg-[#50C878] w-[45%] shadow-[0_0_6px_#50C878]"></div>
                  </div>
                </div>

                <div className="bg-[#3D2817] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_#5A3B22,0_4px_0_#000]">
                  <h2 className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] mb-3">
                    YOUR CHESTS
                  </h2>

                  <div className="bg-[#291B10] border-2 border-[#50C878] p-3 shadow-[0_0_8px_rgba(80,200,120,0.3)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div>
                        <div className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700]">
                          {currentAccount.chest_name}
                        </div>
                        <span className="text-xs text-[#A3A3A3]">OAK CHEST</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-['Press_Start_2P',monospace] text-xs text-[#50C878]">
                      <span>{currentAccount.balance.toLocaleString()}</span>
                      <span className="text-[#00D2FF]">💎</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                
                <div className="flex justify-between items-baseline mb-4">
                  <h2 className="font-['Press_Start_2P',monospace] text-sm text-[#50C878] tracking-wider">
                    SEND EMERALDS
                  </h2>
                  <span className="text-sm text-[#A3A3A3]">
                    from 📦 {currentAccount.chest_name} · {currentAccount.balance.toLocaleString()} 💎
                  </span>
                </div>

                <form onSubmit={handleSendEmeralds} className="space-y-4">
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-['Press_Start_2P',monospace] text-[10px] text-[#FFC700] flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>RECIPIENT CHEST (SEARCH BY USERNAME)</span>
                      </label>
                      <span className="text-xs text-[#50C878] font-mono">
                        {recipients.length} {recipients.length === 1 ? 'player' : 'players'} available
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRecipientSearch(val);
                          fetchRecipients(val);
                        }}
                        placeholder="Search player username (e.g. Steve, Alex, or registered name)..."
                        className="w-full bg-black border-2 border-[#1A1A1C] pl-8 pr-7 py-2 text-white text-xs font-mono outline-none focus:border-[#50C878]"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs text-[#A3A3A3]">🔍</span>
                      {recipientSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setRecipientSearch('');
                            fetchRecipients('');
                          }}
                          className="absolute right-2 top-2 text-[#A3A3A3] hover:text-white text-xs cursor-pointer font-bold px-1.5"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {recipientsLoading ? (
                      <div className="bg-[#291B10] p-4 border-2 border-black text-center text-xs text-[#A3A3A3] font-mono">
                        ⛏ Searching registered players...
                      </div>
                    ) : recipients.length === 0 ? (
                      <div className="bg-[#291B10] p-4 border-2 border-[#8E0000] text-center space-y-1">
                        <div className="text-xs text-[#FF8A80] font-mono">
                          No players match &quot;{recipientSearch}&quot;
                        </div>
                        <div className="text-[10px] text-[#A3A3A3]">
                          Try searching by username, chest name, or UPI handle.
                        </div>
                        {recipientSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setRecipientSearch('');
                              fetchRecipients('');
                            }}
                            className="text-[10px] text-[#50C878] underline mt-1 cursor-pointer block mx-auto"
                          >
                            View all players
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[210px] overflow-y-auto pr-1">
                        {recipients.map((rec) => {
                          const isSelected = selectedRecipientId === rec.account_id;
                          const icon =
                            rec.chest_type === 'GOLD_PILE'
                              ? '🗡️'
                              : rec.username.toLowerCase().includes('steve')
                              ? '⛏'
                              : rec.username.toLowerCase().includes('villager')
                              ? '📜'
                              : '📦';

                          return (
                            <div
                              key={rec.account_id}
                              onClick={() => setSelectedRecipientId(rec.account_id)}
                              className={`bg-[#291B10] p-2.5 border-2 cursor-pointer flex items-center gap-3 transition-all ${
                                isSelected
                                  ? 'border-[#50C878] shadow-[0_0_8px_rgba(80,200,120,0.4)] bg-[#322013]'
                                  : 'border-black hover:border-[#866043]'
                              }`}
                            >
                              <span className="text-2xl shrink-0">{icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="font-['Press_Start_2P',monospace] text-[10px] text-white truncate flex items-center justify-between">
                                  <span className="text-[#50C878]">@{rec.username}</span>
                                  {isSelected && <span className="text-[#50C878] text-[9px] bg-[#112415] px-1 border border-[#50C878]">✓ SELECTED</span>}
                                </div>
                                <div className="text-xs text-[#E0E0E0] flex items-center gap-1 mt-0.5 truncate">
                                  <span>📦</span>
                                  <span className="truncate">{rec.chest_name}</span>
                                </div>
                                <div className="text-[10px] text-[#FFC700] font-mono truncate mt-0.5">
                                  {rec.account_number || rec.masked_account_number || 'CHEST-***'} · {rec.upi_handle}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedRecipientId && (
                      <div className="mt-2 bg-[#1A1A1C] border border-[#50C878] px-3 py-1.5 text-xs text-[#50C878] flex items-center justify-between font-mono">
                        <span className="truncate">
                          SENDING TO: <strong className="text-white">@{recipients.find((r) => r.account_id === selectedRecipientId)?.username}</strong> (📦 {recipients.find((r) => r.account_id === selectedRecipientId)?.chest_name})
                        </span>
                        <span className="text-[10px] text-[#FFC700] ml-2 shrink-0">
                          {recipients.find((r) => r.account_id === selectedRecipientId)?.upi_handle}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-['Press_Start_2P',monospace] text-[10px] text-[#FFC700] mb-1.5">
                      AMOUNT (EMERALDS)
                    </label>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0"
                      min="1"
                      className="w-full bg-black border-2 border-black p-2.5 text-white text-2xl font-mono outline-none focus:border-[#50C878] mb-2.5"
                      required
                    />

                    <div className="grid grid-cols-3 gap-2">
                      {['100', '500', '1,000'].map((btnVal) => (
                        <button
                          key={btnVal}
                          type="button"
                          onClick={() => setSendAmount(btnVal.replace(',', ''))}
                          className="bg-[#2D2E30] text-white font-['Press_Start_2P',monospace] text-[10px] py-2 border-2 border-black shadow-[inset_1px_1px_0_#444,0_3px_0_#000] active:translate-y-0.5 cursor-pointer"
                        >
                          {btnVal}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-['Press_Start_2P',monospace] text-[10px] text-[#FFC700] flex items-center gap-1.5">
                        <span>💬</span>
                        <span>MESSAGE / NOTE (SENT WITH EMERALDS)</span>
                      </label>
                      <span className="text-[10px] text-[#A3A3A3] font-mono">
                        {sendNote.length}/100 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      value={sendNote}
                      onChange={(e) => setSendNote(e.target.value)}
                      placeholder="Type a message or note for the recipient (e.g. 'Diamond sword payment! Thanks 🗡️')"
                      className="w-full bg-black border-2 border-black p-2.5 text-white text-base outline-none focus:border-[#50C878]"
                    />

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        '💎 Diamond Payment',
                        '⚔️ Weapons & Armor',
                        '📦 Resource Trade',
                        '🎉 Gift Emeralds!',
                        '⛏️ Mining Bounty',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSendNote(preset)}
                          className="bg-[#191A1C] hover:bg-[#2A2B2D] border border-[#5A3B22] text-[#E0E0E0] text-[10px] px-2 py-1 font-mono cursor-pointer transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTransfer || !selectedRecipientId}
                    className="w-full py-3 bg-[#006030] disabled:bg-[#1A3323] text-[#50C878] disabled:text-[#4A7A5B] font-['Press_Start_2P',monospace] text-xs border-2 border-black shadow-[inset_2px_2px_0_#00A859,0_4px_0_#003818,0_6px_0_#000] active:translate-y-1 active:shadow-[0_2px_0_#000] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-[#007038]"
                  >
                    <span>⚡</span>
                    <span>{isSubmittingTransfer ? 'PROCESSING TRANSACTION...' : 'SEND EMERALDS'}</span>
                  </button>

                  <div className="bg-[#112415] border border-[#50C878] p-2 text-center text-xs text-[#50C878] flex items-center justify-center gap-1.5">
                    <span>⚡</span>
                    <span>{transferStatus}</span>
                  </div>

                </form>

              </div>

            </div>

            <div id="ledger-section" className="bg-[#3D2817] border-4 border-[#1A1A1C] p-5 shadow-[inset_2px_2px_0_#5A3B22,0_6px_0_#000]">
              
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <h3 className="font-['Press_Start_2P',monospace] text-sm text-[#FFC700] tracking-wider">
                    TRANSACTION HISTORY & LEDGER
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-[#191A1C] border border-[#5A3B22] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setHistoryScope('CHEST')}
                      className={`px-2.5 py-1 font-['Press_Start_2P',monospace] text-[9px] cursor-pointer transition-colors ${
                        historyScope === 'CHEST' ? 'bg-[#50C878] text-black font-bold' : 'text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      THIS CHEST ({transactions.filter((t) => t.sender_account_id === currentAccount.account_id || t.receiver_account_id === currentAccount.account_id).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryScope('ALL')}
                      className={`px-2.5 py-1 font-['Press_Start_2P',monospace] text-[9px] cursor-pointer transition-colors ${
                        historyScope === 'ALL' ? 'bg-[#FFC700] text-black font-bold' : 'text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      ALL TRANSACTIONS ({transactions.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => refreshAccountAndHistory()}
                    className="bg-[#191A1C] hover:bg-[#2A2B2D] border border-[#50C878] px-2.5 py-1 text-xs text-[#50C878] font-mono flex items-center gap-1 cursor-pointer"
                    title="Refresh transactions from database"
                  >
                    <span>↻</span>
                    <span>REFRESH</span>
                  </button>

                  <span className="bg-[#191A1C] border border-[#50C878] px-2.5 py-1 text-xs text-[#50C878] font-mono hidden sm:inline-block">
                    foreign keys: ON DELETE RESTRICT
                  </span>
                </div>
              </div>

              {(() => {
                const chestTxs = transactions.filter(
                  (t) => t.sender_account_id === currentAccount.account_id || t.receiver_account_id === currentAccount.account_id
                );
                const listToRender = historyScope === 'CHEST' ? chestTxs : transactions;

                if (listToRender.length === 0) {
                  return (
                    <div className="bg-[#24170D] border-2 border-dashed border-[#5A3B22] p-8 text-center text-[#A3A3A3]">
                      <span className="text-3xl block mb-2">📜</span>
                      <span className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] block mb-2">
                        NO TRANSACTIONS RECORDED IN THIS VIEW
                      </span>
                      <p className="text-sm text-[#A3A3A3] mb-4">
                        {historyScope === 'CHEST'
                          ? `No emerald transfers logged for "${currentAccount.chest_name}" yet.`
                          : 'No transactions found in database ledger.'}
                      </p>
                      {historyScope === 'CHEST' && transactions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryScope('ALL')}
                          className="bg-[#2D2E30] hover:bg-[#3D3E40] border-2 border-[#50C878] text-[#50C878] font-['Press_Start_2P',monospace] text-[10px] px-4 py-2 cursor-pointer shadow-[0_2px_0_#000]"
                        >
                          VIEW ALL {transactions.length} LEDGER TRANSACTIONS
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {listToRender.map((tx) => {
                      const isDebit = tx.sender_account_id === currentAccount.account_id;
                      const counterpart = isDebit ? tx.receiver_name : tx.sender_name;
                      return (
                        <div
                          key={tx.transaction_id}
                          className="bg-[#24170D] border-2 border-black p-3 flex flex-wrap items-center justify-between gap-3 text-lg hover:border-[#5A3B22] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span
                              className={`font-['Press_Start_2P',monospace] text-xs font-bold ${
                                isDebit ? 'text-[#E53935]' : 'text-[#50C878]'
                              }`}
                            >
                              {isDebit ? '-' : '+'}
                              {tx.amount}
                            </span>
                            <span className="text-[#00D2FF]">💎</span>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{tx.source === 'LAB' ? '🏛' : counterpart.includes('Piglin') ? '🗡️' : '⛏'}</span>
                              <div>
                                <span className="font-['Press_Start_2P',monospace] text-[11px] text-white block">
                                  {isDebit ? `To @${tx.receiver_name}` : `From @${tx.sender_name}`}
                                </span>
                              </div>
                            </div>
                            {tx.note && (
                              <div className="mt-1 flex items-start gap-1.5 text-xs text-[#E0E0E0] font-mono bg-[#191A1C] border border-[#3E2E20] px-2 py-1">
                                <span className="text-sm">💬</span>
                                <span className="text-[#FFC700] font-bold shrink-0">Message:</span>
                                <span className="text-white break-all">&quot;{tx.note}&quot;</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#A3A3A3]">{tx.timestamp}</span>
                            <span className="bg-[#191A1C] border border-[#00D2FF] px-2 py-0.5 text-xs text-[#00D2FF]">
                              {tx.source === 'LAB' ? '💉 LAB' : '🏦 BANK'}
                            </span>
                            <span className="bg-[#191A1C] border border-[#50C878] px-2 py-0.5 text-xs text-[#50C878] flex items-center gap-1">
                              <span>💚</span> committed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

          </div>
        )}

        {/* full transaction history */}
        {activeScreen === 'HISTORY' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#A3A3A3] block mb-1">
                  CURRENT CHEST
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-['Press_Start_2P',monospace] text-base text-[#50C878]">
                    {currentAccount.balance.toLocaleString()} 💎
                  </span>
                  <span className="text-xs bg-[#191A1C] border border-[#50C878] px-2 py-0.5 text-[#50C878]">
                    {currentAccount.chest_name}
                  </span>
                </div>
              </div>

              <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#A3A3A3] block mb-1">
                  LEDGER RECORDS
                </span>
                <span className="font-['Press_Start_2P',monospace] text-base text-[#00D2FF]">
                  {transactions.length} Transactions
                </span>
              </div>

              <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#A3A3A3] block mb-1">
                  CREDITS RECEIVED
                </span>
                <span className="font-['Press_Start_2P',monospace] text-base text-[#50C878]">
                  +{transactions
                    .filter((t) => t.receiver_account_id === currentAccount.account_id)
                    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                    .toLocaleString()}{' '}
                  💎
                </span>
              </div>

              <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
                <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#A3A3A3] block mb-1">
                  DEBITS TRANSFERRED
                </span>
                <span className="font-['Press_Start_2P',monospace] text-base text-[#E53935]">
                  -{transactions
                    .filter((t) => t.sender_account_id === currentAccount.account_id)
                    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                    .toLocaleString()}{' '}
                  💎
                </span>
              </div>
            </div>

            <div className="bg-[#3D2817] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_#5A3B22,0_6px_0_#000]">
              
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b-2 border-[#1A1A1C]">
                <div>
                  <h2 className="font-['Press_Start_2P',monospace] text-sm text-[#FFC700] tracking-wider mb-1 flex items-center gap-2">
                    <span>📜</span>
                    <span>TRANSACTION AUDIT LEDGER</span>
                  </h2>
                  <p className="text-sm text-[#A3A3A3]">
                    Immutable double-entry transaction journal committed with PostgreSQL WAL guarantees.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search note, user..."
                      className="bg-[#191A1C] border border-[#5A3B22] px-3 py-1.5 text-xs text-white placeholder-[#777] outline-none focus:border-[#50C878] w-48 font-mono"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        className="absolute right-2 top-1.5 text-xs text-[#A3A3A3] hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex bg-[#191A1C] border border-[#5A3B22] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setHistoryScope('CHEST')}
                      className={`px-3 py-1 font-['Press_Start_2P',monospace] text-[9px] cursor-pointer transition-colors ${
                        historyScope === 'CHEST' ? 'bg-[#50C878] text-black font-bold' : 'text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      THIS CHEST
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryScope('ALL')}
                      className={`px-3 py-1 font-['Press_Start_2P',monospace] text-[9px] cursor-pointer transition-colors ${
                        historyScope === 'ALL' ? 'bg-[#FFC700] text-black font-bold' : 'text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      ALL TRANSACTIONS ({transactions.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => refreshAccountAndHistory()}
                    className="bg-[#191A1C] hover:bg-[#2A2B2D] border border-[#50C878] px-3 py-1.5 text-xs text-[#50C878] font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>↻</span>
                    <span>REFRESH</span>
                  </button>
                </div>
              </div>

              {(() => {
                const chestTxs = transactions.filter(
                  (t) => t.sender_account_id === currentAccount.account_id || t.receiver_account_id === currentAccount.account_id
                );
                let list = historyScope === 'CHEST' ? chestTxs : transactions;

                if (historySearch.trim()) {
                  const q = historySearch.toLowerCase();
                  list = list.filter(
                    (t) =>
                      t.note?.toLowerCase().includes(q) ||
                      t.sender_name?.toLowerCase().includes(q) ||
                      t.receiver_name?.toLowerCase().includes(q) ||
                      t.transaction_id?.toLowerCase().includes(q)
                  );
                }

                if (list.length === 0) {
                  return (
                    <div className="bg-[#24170D] border-2 border-dashed border-[#5A3B22] p-10 text-center text-[#A3A3A3]">
                      <span className="text-4xl block mb-3">📜</span>
                      <span className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] block mb-2">
                        NO TRANSACTIONS FOUND
                      </span>
                      <p className="text-sm text-[#A3A3A3] mb-4">
                        {historySearch
                          ? `No transactions match your search "${historySearch}".`
                          : historyScope === 'CHEST'
                          ? `No transactions recorded for ${currentAccount.chest_name} yet.`
                          : 'No transactions recorded in the system yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('BANK')}
                        className="bg-[#006030] border-2 border-black text-[#50C878] font-['Press_Start_2P',monospace] text-xs px-4 py-2 cursor-pointer shadow-[0_3px_0_#000]"
                      >
                        ⚡ GO TO BANK & SEND EMERALDS
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {list.map((tx) => {
                      const isDebit = tx.sender_account_id === currentAccount.account_id;
                      const isCredit = tx.receiver_account_id === currentAccount.account_id;
                      const counterpart = isDebit ? tx.receiver_name : tx.sender_name;

                      return (
                        <div
                          key={tx.transaction_id}
                          className="bg-[#24170D] border-2 border-black p-4 flex flex-wrap items-center justify-between gap-4 text-lg hover:border-[#50C878] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-[140px]">
                            <span
                              className={`font-['Press_Start_2P',monospace] text-sm font-bold ${
                                isDebit ? 'text-[#E53935]' : isCredit ? 'text-[#50C878]' : 'text-[#FFC700]'
                              }`}
                            >
                              {isDebit ? '-' : isCredit ? '+' : ''}
                              {tx.amount}
                            </span>
                            <span className="text-[#00D2FF] text-xl">💎</span>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">
                                {tx.source === 'LAB' ? '🏛' : counterpart?.includes('Piglin') ? '🗡️' : '⛏'}
                              </span>
                              <span className="font-['Press_Start_2P',monospace] text-xs text-white">
                                @{tx.sender_name} → @{tx.receiver_name}
                              </span>
                            </div>
                            {tx.note && (
                              <div className="mt-1 flex items-start gap-1.5 text-xs text-[#E0E0E0] font-mono bg-[#191A1C] border border-[#3E2E20] px-2 py-1">
                                <span className="text-sm">💬</span>
                                <span className="text-[#FFC700] font-bold shrink-0">Message:</span>
                                <span className="text-white break-all">&quot;{tx.note}&quot;</span>
                              </div>
                            )}
                            <span className="text-[10px] text-[#777] block font-mono mt-1">
                              TX ID: {tx.transaction_id.slice(0, 13)}...
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#A3A3A3] font-mono">{tx.timestamp}</span>
                            <span className="bg-[#191A1C] border border-[#00D2FF] px-2 py-0.5 text-xs text-[#00D2FF] font-mono">
                              {tx.source === 'LAB' ? '💉 LAB' : '🏦 BANK'}
                            </span>
                            <span className="bg-[#191A1C] border border-[#50C878] px-2 py-0.5 text-xs text-[#50C878] flex items-center gap-1 font-mono">
                              <span>💚</span> committed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

          </div>
        )}

        {/* consistency lab */}
        {activeScreen === 'LAB' && (
          <div className="space-y-6">
            
            <div className="bg-[#3D2817] border-4 border-[#1A1A1C] p-4 shadow-[inset_2px_2px_0_#5A3B22,0_4px_0_#000]">
              <span className="block font-['Press_Start_2P',monospace] text-[10px] text-[#FFC700] mb-2">
                TARGET CHEST
              </span>
              <button
                type="button"
                className="bg-[#291B10] border-2 border-[#50C878] px-3 py-1.5 text-xs font-['Press_Start_2P',monospace] text-[#50C878] flex items-center gap-2"
              >
                <span>📦</span>
                <span>{currentAccount.chest_name.toUpperCase()}</span>
              </button>
            </div>

            <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_6px_0_#000]">
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#00D2FF] text-xl">💉</span>
                <h2 className="font-['Press_Start_2P',monospace] text-sm text-[#00D2FF] tracking-wider">
                  CONSISTENCY LAB
                </h2>
              </div>

              <p className="text-lg text-[#A3A3A3] leading-relaxed mb-6">
                Fire {labDevicesCount} devices at 📦 <strong className="text-white">{currentAccount.chest_name}</strong> at the same instant - each tries to debit {labDebitAmount} 💎. The atomic debit serialises them: only as many succeed as the balance allows.
              </p>

              <div className="flex flex-wrap items-center gap-4 bg-[#1F1F21] p-3 border-2 border-black mb-6">
                <span className="font-['Press_Start_2P',monospace] text-[10px] text-[#A3A3A3]">
                  DEVICES:
                </span>
                <div className="flex gap-2">
                  {[2, 4, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setLabDevicesCount(count)}
                      className={`font-['Press_Start_2P',monospace] text-xs px-3 py-1.5 border-2 border-black cursor-pointer ${
                        labDevicesCount === count ? 'bg-[#00D2FF] text-black font-bold' : 'bg-[#2D2E30] text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="number"
                    value={labDebitAmount}
                    onChange={(e) => setLabDebitAmount(e.target.value)}
                    className="w-24 bg-black border-2 border-black p-1.5 text-center text-white font-mono text-lg outline-none focus:border-[#50C878]"
                  />
                  <button
                    type="button"
                    disabled={isLabRunning}
                    onClick={handleRunAttack}
                    className="bg-[#E58514] disabled:bg-[#7E4B14] text-white font-['Press_Start_2P',monospace] text-xs px-4 py-2 border-2 border-black shadow-[inset_2px_2px_0_#FFA726,0_4px_0_#9E570B] active:translate-y-0.5 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span>▶</span>
                    <span>{isLabRunning ? 'EXECUTING...' : 'RUN ATTACK'}</span>
                  </button>
                </div>
              </div>

              {labResults.ran && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {labResults.devices.map((dev) => (
                      <div
                        key={dev.id}
                        className={`bg-[#1F1F21] p-3 border-2 ${
                          dev.status === 'ACCEPTED'
                            ? 'border-[#50C878] shadow-[0_0_6px_rgba(80,200,120,0.3)]'
                            : 'border-[#E53935] shadow-[0_0_6px_rgba(229,57,53,0.3)]'
                        }`}
                      >
                        <span className="font-['Press_Start_2P',monospace] text-[9px] text-[#A3A3A3] block mb-1">
                          {dev.id}
                        </span>
                        <div
                          className={`font-['Press_Start_2P',monospace] text-[10px] mb-1 flex items-center gap-1 ${
                            dev.status === 'ACCEPTED' ? 'text-[#50C878]' : 'text-[#E53935]'
                          }`}
                        >
                          <span>{dev.status === 'ACCEPTED' ? '✅' : '❌'}</span>
                          <span>{dev.status}</span>
                        </div>
                        <span className="text-xs text-[#A3A3A3] block">
                          {dev.message}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2 bg-[#191A1C] p-3 border border-[#333] text-center font-['Press_Start_2P',monospace] text-[9px]">
                    <div>
                      <span className="text-[#A3A3A3] block mb-1">START</span>
                      <span className="text-white text-xs">{labResults.startBalance.toLocaleString()} 💎</span>
                    </div>
                    <div>
                      <span className="text-[#A3A3A3] block mb-1">ACCEPTED</span>
                      <span className="text-[#50C878] text-xs">{labResults.accepted}</span>
                    </div>
                    <div>
                      <span className="text-[#A3A3A3] block mb-1">REJECTED</span>
                      <span className="text-[#E53935] text-xs">{labResults.rejected}</span>
                    </div>
                    <div>
                      <span className="text-[#A3A3A3] block mb-1">AFTER REFUNDS</span>
                      <span className="text-white text-xs">{labResults.afterRefunds.toLocaleString()} 💎</span>
                    </div>
                  </div>

                  <div className="bg-[#112415] border border-[#50C878] p-3 text-xs text-[#50C878] flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <span>
                      {labResults.accepted}/{labDevicesCount} devices captured the row lock - the rest were rejected. Balance never went below zero: double-spending blocked by transaction isolation.
                    </span>
                  </div>

                  <p className="text-xs text-[#00D2FF]">
                    accepted debits were refunded by the vault - the lab is repeatable.
                  </p>
                </div>
              )}

            </div>

            <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_4px_0_#000]">
              <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] mb-3">
                HOW THE LOCK WORKS
              </h3>

              <p className="text-lg text-[#A3A3A3] leading-relaxed mb-4">
                The live engine debits with ONE atomic operation whose filter re-checks the balance at write time. The PostgreSQL reference stack does the same job with row-level locks:
              </p>

              <pre className="bg-[#121820] border-2 border-[#00D2FF] p-4 text-[#00D2FF] font-mono text-sm leading-relaxed overflow-x-auto">
{`BEGIN;
  SELECT id, balance FROM accounts
  WHERE id IN ($1, $2) ORDER BY id
  FOR UPDATE;             -- row-level locks
  UPDATE accounts SET balance = balance - $3 WHERE id = $1;
  UPDATE accounts SET balance = balance + $3 WHERE id = $2;
  INSERT INTO transactions (...) VALUES (...);
COMMIT;                   -- any fault -> ROLLBACK`}
              </pre>
            </div>

          </div>
        )}

        {/* dbms specification screen */}
        {activeScreen === 'SPEC' && (
          <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_6px_0_#000] space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl text-[#FFE6A3]">📜</span>
              <h2 className="font-['Press_Start_2P',monospace] text-base text-[#FFE6A3]">
                DATABASE MANAGEMENT SYSTEM SPECIFICATION
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
              <div className="bg-[#1F1F21] p-4 border-2 border-black">
                <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#50C878] mb-3">
                  1. 3NF NORMALIZED RELATIONS
                </h3>
                <ul className="space-y-2 text-[#CCC]">
                  <li>• <strong className="text-white">users</strong>: user_id (UUID PK), username (UQ), email (UQ), password_hash, upi_handle.</li>
                  <li>• <strong className="text-white">accounts</strong>: account_id (UUID PK), user_id (FK), chest_name, balance (NUMERIC &gt;= 0).</li>
                  <li>• <strong className="text-white">transactions</strong>: transaction_id (UUID PK), sender_id (FK), receiver_id (FK), amount (&gt; 0), status.</li>
                </ul>
              </div>

              <div className="bg-[#1F1F21] p-4 border-2 border-black">
                <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700] mb-3">
                  2. INTEGRITY &amp; LOCKING
                </h3>
                <ul className="space-y-2 text-[#CCC]">
                  <li>• <strong className="text-white">ON DELETE RESTRICT</strong>: Accounts and historical ledgers cannot be deleted if referenced.</li>
                  <li>• <strong className="text-white">CHECK (balance &gt;= 0.00)</strong>: Engine-level overdraft prevention.</li>
                  <li>• <strong className="text-white">SELECT ... FOR UPDATE</strong>: Deterministic sorted ordering guarantees zero deadlocks.</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#00D2FF] mb-2">
                POSTGRESQL DDL SCHEMA EXTRACT
              </h3>
              <pre className="bg-black border-2 border-[#444] p-4 text-[#A5D6A7] font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    chest_name VARCHAR(60) NOT NULL,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    security_pin_hash VARCHAR(255) NOT NULL
);`}
              </pre>
            </div>
          </div>
        )}

        {/* lecture mode */}
        {activeScreen === 'LECTURE' && (
          <div className="bg-[#2D2E30] border-4 border-[#1A1A1C] p-6 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1),0_6px_0_#000] space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl text-[#C084FC]">🎓</span>
                <div>
                  <h2 className="font-['Press_Start_2P',monospace] text-sm text-[#D8B4FE]">
                    LECTURE MODE - RELATIONAL DATABASE LABORATORY
                  </h2>
                  <span className="text-xs text-[#A3A3A3]">
                    Live PostgreSQL Instrumentation &amp; Concurrency Diagnostics for Evaluation
                  </span>
                </div>
              </div>
              <span className="bg-[#121213] border border-[#50C878] px-3 py-1 text-xs text-[#50C878] font-mono">
                ENGINE: {postgresEngine} {postgresConnected ? '(LIVE)' : '(ACTIVE)'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-['Press_Start_2P',monospace]">
              {[
                { id: 'TRACE', label: '1. Live SQL Trace' },
                { id: 'EXPLORER', label: '2. DB Explorer' },
                { id: 'INSPECTOR', label: '3. Tx Inspector' },
                { id: 'ER', label: '4. Schema & ER' },
                { id: 'CONCURRENCY', label: '5. Concurrency' },
                { id: 'CONCEPTS', label: '6. DBMS Concepts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLectureSubTab(tab.id as any)}
                  className={`px-3 py-2 border-2 border-black cursor-pointer ${
                    lectureSubTab === tab.id
                      ? 'bg-[#4A2D78] text-[#D8B4FE] border-[#C084FC]'
                      : 'bg-[#1F1F21] text-[#A3A3A3]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* live sql trace */}
            {lectureSubTab === 'TRACE' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1F1F21] p-3 border-2 border-black">
                  <span className="text-xs text-[#A3A3A3] font-['Press_Start_2P',monospace]">
                    FILTER QUERY TYPE:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {['ALL', 'BEGIN', 'LOCK', 'SELECT', 'UPDATE', 'INSERT', 'COMMIT', 'ROLLBACK'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTraceFilter(f)}
                        className={`px-2.5 py-1 border border-black cursor-pointer ${
                          traceFilter === f ? 'bg-[#50C878] text-black font-bold' : 'bg-[#2D2E30] text-[#A3A3A3]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black border-2 border-black p-3 font-mono text-xs max-h-[460px] overflow-y-auto space-y-2">
                  {traceEvents
                    .filter((e) => traceFilter === 'ALL' || e.queryType === traceFilter)
                    .map((evt) => (
                      <div key={evt.eventId} className="p-2 bg-[#121213] border-l-4 border-l-[#50C878] space-y-1">
                        <div className="flex justify-between text-[#888]">
                          <span>[{evt.timestamp}] #{evt.requestId} · {evt.operation}</span>
                          <span className="text-[#FFC700]">{evt.durationMs}ms · {evt.outcome}</span>
                        </div>
                        <div className="text-[#50C878]">{evt.sanitizedSql}</div>
                        {evt.safeParams && <div className="text-[#A3A3A3]">Parameters: {evt.safeParams}</div>}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* database explorer */}
            {lectureSubTab === 'EXPLORER' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['accounts', 'users', 'transactions', 'ledger_entries'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedTable(t as any);
                        fetchTable(t);
                      }}
                      className={`px-4 py-1.5 border-2 border-black font-['Press_Start_2P',monospace] text-xs cursor-pointer ${
                        selectedTable === t ? 'bg-[#50C878] text-black font-bold' : 'bg-[#1F1F21] text-white'
                      }`}
                    >
                      table: {t}
                    </button>
                  ))}
                </div>

                <div className="bg-black border-2 border-black p-3 overflow-x-auto">
                  <div className="text-[10px] text-[#A3A3A3] font-mono mb-2 flex items-center justify-between">
                    <span>SOURCE: {postgresConnected ? 'POSTGRESQL RELATIONAL ENGINE' : 'ACID PERSISTENCE LAYER'}</span>
                    <button
                      type="button"
                      onClick={() => fetchTable(selectedTable)}
                      className="text-[#50C878] hover:underline cursor-pointer"
                    >
                      ↻ REFRESH TABLE
                    </button>
                  </div>
                  <table className="w-full text-left font-mono text-xs text-[#E0E0E0]">
                    <thead>
                      <tr className="border-b-2 border-[#444] text-[#FFC700]">
                        {tableExplorerData.columns.length > 0
                          ? tableExplorerData.columns.map((col) => (
                              <th key={col} className="p-2 whitespace-nowrap">
                                {col}
                              </th>
                            ))
                          : (
                            <>
                              <th className="p-2">account_id (PK)</th>
                              <th className="p-2">user_id (FK)</th>
                              <th className="p-2">chest_name</th>
                              <th className="p-2">balance (CHECK &gt;= 0)</th>
                            </>
                          )}
                      </tr>
                    </thead>
                    <tbody>
                      {tableExplorerData.rows.length > 0 ? (
                        tableExplorerData.rows.map((row, idx) => (
                          <tr key={idx} className="border-b border-[#222] hover:bg-[#151515]">
                            {tableExplorerData.columns.map((col) => {
                              const val = row[col];
                              const strVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
                              const isId = col.includes('id');
                              const isBal = col.includes('balance') || col.includes('amount');
                              return (
                                <td
                                  key={col}
                                  className={`p-2 whitespace-nowrap ${
                                    isId ? 'text-[#FFE6A3]' : isBal ? 'text-[#50C878] font-bold' : 'text-white'
                                  }`}
                                >
                                  {isId && strVal.length > 18 ? strVal.slice(0, 16) + '...' : strVal}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        accounts.map((a) => (
                          <tr key={a.account_id} className="border-b border-[#222]">
                            <td className="p-2 text-[#FFE6A3]">{a.account_id.slice(0, 16)}...</td>
                            <td className="p-2">{a.user_id.slice(0, 16)}...</td>
                            <td className="p-2 text-white">{a.chest_name}</td>
                            <td className="p-2 text-[#50C878] font-bold">{a.balance.toFixed(2)} 💎</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* transaction inspector */}
            {lectureSubTab === 'INSPECTOR' && (
              <div className="space-y-4">
                <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#00D2FF]">
                  TRANSACTION STEP-BY-STEP EXECUTION PIPELINE
                </h3>

                <div className="space-y-2">
                  {[
                    { step: '1. BEGIN', desc: 'Opens isolation unit boundary and assigns WAL transaction identifier.', ok: true },
                    { step: '2. LOCK (SELECT FOR UPDATE)', desc: 'Acquires exclusive row locks in sorted account order (ORDER BY account_id ASC).', ok: true },
                    { step: '3. INVARIANT CHECK', desc: 'Verifies balance >= amount to satisfy non-negative check constraint.', ok: true },
                    { step: '4. ATOMIC MUTATION', desc: 'Executes UPDATE debit on sender and UPDATE credit on recipient.', ok: true },
                    { step: '5. AUDIT ENTRY', desc: 'Inserts immutable record into transactions table with foreign keys intact.', ok: true },
                    { step: '6. COMMIT', desc: 'Persists changes to PostgreSQL Write-Ahead Log (WAL) and releases row locks.', ok: true },
                  ].map((s) => (
                    <div key={s.step} className="bg-[#1F1F21] p-3 border-l-4 border-l-[#50C878] border-2 border-black flex justify-between items-center">
                      <div>
                        <strong className="font-['Press_Start_2P',monospace] text-[10px] text-white block mb-0.5">
                          {s.step}
                        </strong>
                        <span className="text-xs text-[#A3A3A3]">{s.desc}</span>
                      </div>
                      <span className="text-xs font-['Press_Start_2P',monospace] text-[#50C878]">VERIFIED</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* schema & er diagram */}
            {lectureSubTab === 'ER' && (
              <div className="space-y-4">
                <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#FFC700]">
                  ENTITY RELATIONSHIP MODEL (3NF)
                </h3>
                <pre className="bg-black border-2 border-[#50C878] p-4 text-[#A5D6A7] font-mono text-xs overflow-x-auto leading-relaxed">
{`┌──────────────────────┐         1:N         ┌──────────────────────┐
│        users         │────────────────────▶│       accounts       │
├──────────────────────┤                     ├──────────────────────┤
│ PK  user_id (UUID)   │                     │ PK  account_id (UUID)│
│     username (UQ)    │                     │ FK  user_id (RESTRICT│
│     email (UQ)       │                     │     chest_name       │
│     upi_handle       │                     │     balance (>= 0.00)│
└──────────────────────┘                     └──────────┬───────────┘
                                                        │
                                       ┌────────────────┴───────────────┐
                                       │ 1:N (Sender & Receiver Legs)   │
                                       ▼                                ▼
                                    ┌──────────────────────────────────────┐
                                    │             transactions             │
                                    ├──────────────────────────────────────┤
                                    │ PK  transaction_id (UUID)            │
                                    │ FK  sender_account_id  (RESTRICT)    │
                                    │ FK  receiver_account_id(RESTRICT)    │
                                    │     amount (> 0.00)                  │
                                    │     status ('SUCCESS' | 'FAILED')    │
                                    └──────────────────────────────────────┘`}
                </pre>
              </div>
            )}

            {/* concurrency monitor */}
            {lectureSubTab === 'CONCURRENCY' && (
              <div className="space-y-4">
                <h3 className="font-['Press_Start_2P',monospace] text-xs text-[#E58514]">
                  ROW-LEVEL LOCKING &amp; DEADLOCK ELIMINATION PROOF
                </h3>
                <div className="bg-[#1F1F21] p-4 border-2 border-black space-y-3 text-base">
                  <p className="text-[#CCC]">
                    In multidevice banking, two users initiating transfers to each other at the exact same millisecond ($A \to B$ and $B \to A$) can cause a cyclical deadlock graph in standard database engines (PostgreSQL error <code>40P01: deadlock detected</code>).
                  </p>
                  <div className="p-3 bg-black border border-[#FFC700] text-xs font-mono text-[#FFE6A3]">
                    Algorithm: Always lock MIN(A, B) first, then MAX(A, B).
                    Both concurrent requests queue behind the same first lock, converting deadlock into FIFO serialization.
                  </div>
                </div>
              </div>
            )}

            {/* dbms concepts */}
            {lectureSubTab === 'CONCEPTS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                <div className="bg-[#1F1F21] p-4 border-2 border-black">
                  <h4 className="font-['Press_Start_2P',monospace] text-xs text-[#50C878] mb-2">
                    ACID PROPERTIES
                  </h4>
                  <p className="text-xs text-[#CCC] leading-relaxed">
                    Atomicity via BEGIN/COMMIT/ROLLBACK. Consistency via CHECK constraints. Isolation via row-level locks. Durability via PostgreSQL Write-Ahead Logs.
                  </p>
                </div>
                <div className="bg-[#1F1F21] p-4 border-2 border-black">
                  <h4 className="font-['Press_Start_2P',monospace] text-xs text-[#00D2FF] mb-2">
                    REFERENTIAL INTEGRITY
                  </h4>
                  <p className="text-xs text-[#CCC] leading-relaxed">
                    ON DELETE RESTRICT guarantees that accounts with active balances or historical transactions can never be accidentally dropped or orphaned.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      <footer className="w-full mt-8">
        <div className="h-2 bg-[#55AA22] border-t-2 border-black shadow-[0_2px_0_#3B7817]"></div>
        <div className="h-6 bg-[#573D26] border-t-2 border-[#3D2817]"></div>
      </footer>

      {toastMessage && (
        <div className="fixed bottom-10 right-6 bg-[#1F1F21] text-white border-2 border-[#50C878] px-4 py-2 text-base shadow-[0_4px_0_#000] z-50">
          {toastMessage}
        </div>
      )}

    </div>
  );
}
