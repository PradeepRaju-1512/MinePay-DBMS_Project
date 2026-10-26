// integration tests for db.js (needs a running postgres, see README)

import assert from 'assert';
import {
  initDatabase,
  registerUser,
  loginUser,
  transferFunds,
  getEligibleRecipients,
  runConcurrencyLab,
  getAllAccountsWithUsers,
  getAccountBalance,
  createSession,
  getSession,
  pool,
} from '../db.js';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  [PASS]: ${name}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`  [FAIL]: ${name}`);
      console.error(`     Error: ${err.message}`);
      failedTests++;
    });
}

async function main() {
  console.log('\n======================================================');
  console.log('MinePay DBMS & Concurrency Test Runner (PostgreSQL)');
  console.log('======================================================\n');

  // ensure DB schema and default records are initialized
  await initDatabase();

  // user registration
  await runTest('1. User Registration & Password Hashing', async () => {
    const testUsername = 'TestMiner_' + Math.random().toString(36).slice(2, 6);
    const reg = await registerUser({
      username: testUsername,
      email: `${testUsername.toLowerCase()}@minepay.mine`,
      password: 'testPassword123',
    });

    assert.ok(reg.user.user_id, 'User ID should be generated');
    assert.ok(reg.account.account_id, 'Chest account should be created');
    assert.strictEqual(reg.account.balance, 1000.0, 'Default balance should be 1000');

    // duplicate rejection
    let duplicateRejected = false;
    try {
      await registerUser({
        username: testUsername,
        email: 'other@minepay.mine',
        password: 'password',
      });
    } catch (e) {
      duplicateRejected = true;
    }
    assert.ok(duplicateRejected, 'Duplicate username must be rejected');
  });

  // successful transfer
  await runTest('2. Successful Atomic Transfer (Debit & Credit in PostgreSQL)', async () => {
    const accounts = await getAllAccountsWithUsers();
    assert.ok(accounts.length >= 2, 'Need at least 2 accounts');
    const sender = accounts.find(a => a.username === 'Alex') || accounts[0];
    const receiver = accounts.find(a => a.username === 'Steve') || accounts[1];
    
    const senderStartAcc = await getAccountBalance(sender.account_id);
    const receiverStartAcc = await getAccountBalance(receiver.account_id);
    const senderStart = senderStartAcc.balance;
    const receiverStart = receiverStartAcc.balance;
    const amount = 100.0;

    const result = await transferFunds({
      senderAccountId: sender.account_id,
      receiverAccountId: receiver.account_id,
      amount,
      note: 'Test transfer between real accounts',
    });

    assert.ok(result.success, 'Transfer should succeed');
    const senderAfter = await getAccountBalance(sender.account_id);
    const receiverAfter = await getAccountBalance(receiver.account_id);

    assert.strictEqual(senderAfter.balance, +(senderStart - amount).toFixed(2), 'Sender balance must be debited in DB');
    assert.strictEqual(receiverAfter.balance, +(receiverStart + amount).toFixed(2), 'Receiver balance must be credited in DB');
  });

  // insufficient funds & rollback
  await runTest('3. Insufficient Funds Rejection & Rollback Invariant', async () => {
    const accounts = await getAllAccountsWithUsers();
    const sender = accounts[0];
    const receiver = accounts[1];
    const senderStartAcc = await getAccountBalance(sender.account_id);
    const receiverStartAcc = await getAccountBalance(receiver.account_id);
    const excessiveAmount = senderStartAcc.balance + 999999;

    let rejected = false;
    try {
      await transferFunds({
        senderAccountId: sender.account_id,
        receiverAccountId: receiver.account_id,
        amount: excessiveAmount,
      });
    } catch (e) {
      rejected = true;
      assert.ok(e.message.includes('Insufficient Balance'), 'Must specify insufficient balance');
    }

    assert.ok(rejected, 'Excessive transfer must be rejected');
    const senderAfter = await getAccountBalance(sender.account_id);
    const receiverAfter = await getAccountBalance(receiver.account_id);
    assert.strictEqual(senderAfter.balance, senderStartAcc.balance, 'Sender balance must remain unchanged after rollback');
    assert.strictEqual(receiverAfter.balance, receiverStartAcc.balance, 'Receiver balance must remain unchanged after rollback');
  });

  // idempotency key & duplicate retries
  await runTest('4. Idempotency Key & Duplicate Retries Prevention', async () => {
    const accounts = await getAllAccountsWithUsers();
    const sender = accounts[0];
    const receiver = accounts[1];
    const senderStartAcc = await getAccountBalance(sender.account_id);
    const idempotencyKey = 'idemp-test-' + Math.random().toString(36).slice(2, 9);
    const amount = 50.0;

    // first attempt
    const res1 = await transferFunds({
      senderAccountId: sender.account_id,
      receiverAccountId: receiver.account_id,
      amount,
      idempotencyKey,
    });
    assert.ok(res1.success, 'First transfer must succeed');
    const senderAfterFirst = await getAccountBalance(sender.account_id);

    // retry with identical idempotency key
    const res2 = await transferFunds({
      senderAccountId: sender.account_id,
      receiverAccountId: receiver.account_id,
      amount,
      idempotencyKey,
    });
    assert.ok(res2.success, 'Retry must return success');
    assert.ok(res2.duplicateHandled, 'Retry must be marked as duplicate handled');
    const senderAfterRetry = await getAccountBalance(sender.account_id);
    assert.strictEqual(senderAfterRetry.balance, senderAfterFirst.balance, 'Duplicate retry must NOT move funds a second time');
  });

  // self-transfer rejection
  await runTest('5. Self-Transfer Constraint (sender <> receiver)', async () => {
    const accounts = await getAllAccountsWithUsers();
    const sender = accounts[0];
    let rejected = false;
    try {
      await transferFunds({
        senderAccountId: sender.account_id,
        receiverAccountId: sender.account_id,
        amount: 25.0,
      });
    } catch (e) {
      rejected = true;
    }
    assert.ok(rejected, 'Self-transfer must be rejected');
  });

  // ownership authorization check
  await runTest('6. Account Ownership Authorization Check (Multi-User Isolation)', async () => {
    const accounts = await getAllAccountsWithUsers();
    const sender = accounts[0];
    const receiver = accounts[1];
    const fakeUserId = 'a0000000-0000-0000-0000-999999999999';

    let rejected = false;
    try {
      await transferFunds({
        senderAccountId: sender.account_id,
        receiverAccountId: receiver.account_id,
        amount: 20.0,
        authenticatedUserId: fakeUserId,
      });
    } catch (e) {
      rejected = true;
      assert.ok(e.message.includes('Unauthorized'), 'Should fail authorization');
    }
    assert.ok(rejected, 'Transfer from unowned account must be rejected');
  });

  // dynamic recipient query & self-exclusion
  await runTest('7. Dynamic Recipient Query Excludes Sender', async () => {
    const accounts = await getAllAccountsWithUsers();
    const senderAcc = accounts[0];
    const recipients = await getEligibleRecipients({
      senderAccountId: senderAcc.account_id,
    });

    assert.ok(recipients.length > 0, 'Should find eligible recipients');
    const senderFound = recipients.some(r => r.account_id === senderAcc.account_id);
    assert.strictEqual(senderFound, false, 'Sender own account must be excluded from recipient list');

    // partial search test
    const searchRes = await getEligibleRecipients({
      senderAccountId: senderAcc.account_id,
      searchQuery: 'Steve',
    });
    assert.ok(searchRes.some(r => r.username.includes('Steve')), 'Search query must match Steve');
  });

  // concurrent withdrawals serialization
  await runTest('8. Concurrent Withdrawals & Non-Negative Balance', async () => {
    const accounts = await getAllAccountsWithUsers();
    const target = accounts.find(a => a.username === 'Steve') || accounts[0];
    const lab = await runConcurrencyLab({
      targetAccountId: target.account_id,
      deviceCount: 4,
      debitAmount: 500,
    });

    assert.ok(lab.devices.length === 4, 'Should execute 4 devices');
    assert.ok(lab.finalBalance >= 0, 'Balance must never drop below 0');
    assert.strictEqual(lab.acceptedCount + lab.rejectedCount, 4, 'All workers must be accounted for');
  });

  // newly registered user: search by username, transfer money, and send messages
  await runTest('9. Registered User Username Search, Emeralds & Message Transfer', async () => {
    // register a brand-new user
    const uniqueUser = 'MinerHero_' + Math.random().toString(36).slice(2, 7);
    const regRes = await registerUser({
      username: uniqueUser,
      email: `${uniqueUser.toLowerCase()}@minepay.mine`,
      password: 'mypassword123',
    });
    assert.ok(regRes.user.user_id, 'Registered user ID must exist');
    assert.ok(regRes.account.account_id, 'Registered user chest account must exist');

    // other user (Alex) searches for the new user by username
    const accounts = await getAllAccountsWithUsers();
    const alexAcc = accounts.find(a => a.username === 'Alex') || accounts[0];
    const searchByName = await getEligibleRecipients({
      senderAccountId: alexAcc.account_id,
      searchQuery: uniqueUser,
    });
    assert.ok(searchByName.length >= 1, 'Search query must find the newly registered user by username');
    const matchedRecipient = searchByName.find(r => r.username === uniqueUser);
    assert.ok(matchedRecipient, 'Matched recipient must have exact username');
    assert.strictEqual(matchedRecipient.account_id, regRes.account.account_id, 'Account ID must match');

    // Alex sends money + a message/note to the new user
    const testMessage = 'Welcome to the realm! Here are 120 emeralds';
    const alexStartBal = (await getAccountBalance(alexAcc.account_id)).balance;
    const transferRes = await transferFunds({
      senderAccountId: alexAcc.account_id,
      receiverAccountId: regRes.account.account_id,
      amount: 120.0,
      note: testMessage,
    });
    assert.ok(transferRes.success, 'Transfer to new user must succeed');
    assert.strictEqual(transferRes.senderNewBalance, +(alexStartBal - 120.0).toFixed(2), 'Alex balance debited');
    assert.strictEqual(transferRes.receiverNewBalance, 1000.0 + 120.0, 'New user credited 1000 + 120');
    assert.strictEqual(transferRes.transaction.note, testMessage, 'Transaction note/message must be stored intact');

    // new user can search for any other user and send money + message back
    const newSearchSteve = await getEligibleRecipients({
      senderAccountId: regRes.account.account_id,
      searchQuery: 'Steve',
    });
    assert.ok(newSearchSteve.some(r => r.username.includes('Steve')), 'New user must be able to search and find Steve');
    const steveRecipient = newSearchSteve.find(r => r.username.includes('Steve'));

    const replyMessage = 'Thanks Alex! Passing 30 emeralds to Steve for diamonds';
    const replyRes = await transferFunds({
      senderAccountId: regRes.account.account_id,
      receiverAccountId: steveRecipient.account_id,
      amount: 30.0,
      note: replyMessage,
    });
    assert.ok(replyRes.success, 'New user can send to any other user');
    assert.strictEqual(replyRes.transaction.note, replyMessage, 'Reply message stored');
  });

  // server-side session store in PostgreSQL & password bypass removal
  await runTest('10. Server-Side Sessions in PostgreSQL & Password Bypass Removal', async () => {
    const testUser = 'SessionUser_' + Math.random().toString(36).slice(2, 6);
    const reg = await registerUser({
      username: testUser,
      email: `${testUser.toLowerCase()}@minepay.mine`,
      password: 'realSecretPassword!456',
    });

    // verify session stored in PostgreSQL
    const token = await createSession(reg.user.user_id, reg.account.account_id);
    assert.ok(token, 'Session token should be created');
    const fetchedSession = await getSession(token);
    assert.ok(fetchedSession, 'Session must be retrieved from PostgreSQL sessions table');
    assert.strictEqual(fetchedSession.user.user_id, reg.user.user_id, 'Session user ID must match');
    assert.strictEqual(fetchedSession.account.account_id, reg.account.account_id, 'Session account ID must match');

    // verify hard-coded password bypass is completely removed
    let bypassFailed = false;
    try {
      await loginUser({
        usernameOrEmail: testUser,
        password: 'minecraft123', // Hard-coded bypass that was previously accepted
      });
    } catch (e) {
      bypassFailed = true;
    }
    assert.ok(bypassFailed, 'Hard-coded bypass password "minecraft123" must be rejected when real password differs');

    // correct password succeeds
    const legitLogin = await loginUser({
      usernameOrEmail: testUser,
      password: 'realSecretPassword!456',
    });
    assert.ok(legitLogin.token, 'Legitimate login should generate a session token');
  });

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed.`);
  console.log('------------------------------------------------------\n');

  await pool.end();

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
