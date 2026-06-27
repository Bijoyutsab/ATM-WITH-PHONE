// ============ ULTRA-REALISTIC ATM & MOBILE BANKING APP SIMULATOR ============

// ============ DATABASE & STATE ============
let atmState = {
    currentAccount: null,
    currentCardNumber: null,
    currentCardType: null, 
    pinAttempts: 0,
    atmCash: 50000,
    sessionActive: false,
    transactionID: 0,
    mobileLoggedIn: false
};

// User Accounts Database
const accountsDB = {
    '1234': {
        type: 'debit',
        pin: '1111',
        balance: 5000,
        creditLimit: 0,
        transactions: [],
        phoneNumber: '+1-234-567-8900'
    },
    '5678': {
        type: 'credit',
        pin: '2222',
        balance: 3000,
        creditLimit: 10000,
        transactions: [],
        phoneNumber: '+1-234-567-8901'
    },
    '9999': {
        type: 'debit',
        pin: '3333',
        balance: 500,
        creditLimit: 0,
        transactions: [],
        phoneNumber: '+1-234-567-8902'
    }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    updateATMStatus();
    updateMobileTime();
    setInterval(updateMobileTime, 1000);
});

// ============ LOCAL STORAGE ============
function loadFromLocalStorage() {
    const saved = localStorage.getItem('atmData');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(accountsDB, data.accounts);
        atmState.atmCash = data.atmCash || 50000;
    }
}

function saveToLocalStorage() {
    const data = {
        accounts: accountsDB,
        atmCash: atmState.atmCash
    };
    localStorage.setItem('atmData', JSON.stringify(data));
}

// ============ CARD SELECTION ============
function toggleTestCards() {
    const testInfo = document.getElementById('testCardsInfo');
    testInfo.style.display = testInfo.style.display === 'none' ? 'block' : 'none';
}

function selectCard(cardType, cardNumber) {
    const account = accountsDB[cardNumber];
    if (!account) {
        showError('insertError', 'Card not found');
        return;
    }

    playSound('beep');
    atmState.currentCardType = cardType;
    atmState.currentCardNumber = cardNumber;
    atmState.currentAccount = account;
    atmState.pinAttempts = 0;

    const cardDisplay = document.getElementById('cardVisualLarge');
    cardDisplay.classList.add('inserting');
    
    setTimeout(() => {
        document.getElementById('displayCardNum').textContent = '****' + cardNumber;
        goToScreen('pinScreen');
    }, 500);
}

// ============ PIN AUTHENTICATION ============
let pinBuffer = '';

function appendPin(digit) {
    if (pinBuffer.length < 4) {
        pinBuffer += digit;
        updatePinDisplay();
        playSound('type');
    }
}

function updatePinDisplay() {
    const dots = '• '.repeat(pinBuffer.length);
    document.getElementById('pinDisplay').textContent = dots || '• • • •';
}

function clearPin() {
    pinBuffer = '';
    document.getElementById('pinDisplay').textContent = '• • • •';
    clearError('pinError');
}

function verifyPin() {
    if (pinBuffer.length !== 4) {
        showError('pinError', 'Please enter 4-digit PIN');
        playSound('error');
        return;
    }

    const account = atmState.currentAccount;
    if (pinBuffer === account.pin) {
        atmState.sessionActive = true;
        atmState.pinAttempts = 0;
        playSound('success');
        updateUserGreeting();
        goToScreen('mainMenuScreen');
    } else {
        atmState.pinAttempts++;
        playSound('error');
        if (atmState.pinAttempts >= 3) {
            showError('pinError', 'Too many attempts. Card blocked.');
            setTimeout(() => {
                cancelTransaction();
            }, 2000);
        } else {
            showError('pinError', `Wrong PIN. Attempts left: ${3 - atmState.pinAttempts}`);
        }
        clearPin();
    }
}

// ============ SCREEN NAVIGATION ============
function goToScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'mainMenuScreen') {
        updateATMStatus();
    } else if (screenId === 'balanceScreen') {
        displayBalance();
    } else if (screenId === 'withdrawScreen') {
        updateWithdrawScreen();
    } else if (screenId === 'statementScreen') {
        displayStatement();
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// ============ USER GREETING ============
function updateUserGreeting() {
    const cardType = atmState.currentCardType.toUpperCase();
    const greeting = `Welcome! ${cardType} Card Holder`;
    document.getElementById('userGreeting').textContent = greeting;
    document.getElementById('mobileUserName').textContent = greeting;
}

// ============ BALANCE CHECK ============
function displayBalance() {
    const account = atmState.currentAccount;
    const balance = account.balance;

    document.getElementById('balanceAmount').textContent = '$' + balance.toFixed(2);
    document.getElementById('balanceType').textContent = account.type === 'debit' ? 'Debit Account' : 'Credit Card';
    document.getElementById('cardTypeDisplay').textContent = account.type.toUpperCase();
    document.getElementById('cardNumberDisplay').textContent = '****' + atmState.currentCardNumber;

    if (account.transactions.length > 0) {
        const lastTx = account.transactions[account.transactions.length - 1];
        document.getElementById('lastTransaction').textContent = lastTx.description + ' - $' + lastTx.amount;
    } else {
        document.getElementById('lastTransaction').textContent = 'None';
    }
}

// ============ ATM STATUS ============
function updateATMStatus() {
    const atmStatus = document.getElementById('atmStatus');
    if (atmState.atmCash < 1000) {
        atmStatus.innerHTML = '⚠️ <strong>LOW CASH:</strong> Limited withdrawals available.';
        atmStatus.style.color = '#ff6b6b';
    } else {
        atmStatus.innerHTML = '✓ ATM Operating Normally';
        atmStatus.style.color = '#51cf66';
    }
}

// ============ WITHDRAWAL SYSTEM ============
function updateWithdrawScreen() {
    const account = atmState.currentAccount;
    const available = account.type === 'debit' ? account.balance : account.creditLimit;
    document.getElementById('withdrawBalance').textContent = available.toFixed(2);
}

function quickWithdraw(amount) {
    initiateWithdrawal(amount);
}

function customWithdraw() {
    const amountInput = document.getElementById('customAmount');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        showError('withdrawError', 'Please enter a valid amount');
        playSound('error');
        return;
    }

    if (amount % 10 !== 0) {
        showError('withdrawError', 'Amount must be in multiples of $10');
        playSound('error');
        return;
    }

    initiateWithdrawal(amount);
}

function initiateWithdrawal(amount) {
    const account = atmState.currentAccount;
    const available = account.type === 'debit' ? account.balance : account.creditLimit;

    if (amount > available) {
        goToScreen('insufficientFundsScreen');
        document.getElementById('availableBalance').textContent = available.toFixed(2);
        playSound('error');
        return;
    }

    if (amount > atmState.atmCash) {
        goToScreen('atmOutOfCashScreen');
        playSound('error');
        return;
    }

    atmState.withdrawalAmount = amount;
    document.getElementById('withdrawAmount').textContent = '$' + amount.toFixed(2);
    document.getElementById('confirmCardType').textContent = account.type === 'debit' ? 'Debit' : 'Credit';
    goToScreen('confirmWithdrawScreen');
}

function processWithdrawal() {
    playSound('processing');
    goToScreen('processingScreen');
    
    simulateProgressBar();
    
    setTimeout(() => {
        const account = atmState.currentAccount;
        const amount = atmState.withdrawalAmount;

        account.balance -= amount;
        atmState.atmCash -= amount;

        atmState.transactionID++;
        const txID = 'TXN' + String(atmState.transactionID).padStart(6, '0');

        const transaction = {
            type: 'withdrawal',
            amount: amount,
            date: new Date().toLocaleString(),
            description: `Withdrawal at ATM`,
            transactionID: txID
        };
        account.transactions.push(transaction);

        saveToLocalStorage();

        document.getElementById('successAmount').textContent = '$' + amount.toFixed(2);
        document.getElementById('newBalance').textContent = account.balance.toFixed(2);
        document.getElementById('transactionID').textContent = txID;
        document.getElementById('transactionTime').textContent = new Date().toLocaleTimeString();
        
        const smsMsg = `✓ Withdrawal Successful!\n$${amount} withdrawn\nNew Balance: $${account.balance.toFixed(2)}\nTime: ${new Date().toLocaleTimeString()}`;
        document.getElementById('smsNotification').innerHTML = smsMsg.replace(/\n/g, '<br>');

        showCashOutput(amount);
        addMobileNotification(`Withdrawal: $${amount}`, 'Debit');
        playSound('success');

        goToScreen('withdrawSuccessScreen');
    }, 3000);
}

function simulateProgressBar() {
    const steps = ['Verifying account...', 'Checking balance...', 'Dispensing cash...', 'Updating balance...'];
    let step = 0;
    const interval = setInterval(() => {
        if (step < steps.length) {
            document.getElementById('progressText').textContent = steps[step];
            step++;
        } else {
            clearInterval(interval);
        }
    }, 750);
}

function showCashOutput(amount) {
    const cashOutput = document.getElementById('cashOutput');
    cashOutput.innerHTML = `<div class="cash-animation">💵 $${amount}</div>`;
    setTimeout(() => {
        cashOutput.innerHTML = '';
    }, 2000);
}

// ============ SOUND EFFECTS ============
function playSound(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'beep':
            oscillator.frequency.value = 1000;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'type':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
            break;
        case 'success':
            oscillator.frequency.value = 1200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'error':
            oscillator.frequency.value = 300;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case'processing':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
    }
}

// ============ CHANGE PIN ============
function changePin() {
    const currentPin = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    const account = atmState.currentAccount;

    clearError('changePinError');

    if (!currentPin || !newPin || !confirmPin) {
        showError('changePinError', 'All fields required');
        return;
    }

    if (currentPin !== account.pin) {
        showError('changePinError', 'Current PIN incorrect');
        return;
    }

    if (newPin !== confirmPin) {
        showError('changePinError', 'PINs do not match');
        return;
    }

    if (newPin.length !== 4) {
        showError('changePinError', 'PIN must be 4 digits');
        return;
    }

    account.pin = newPin;
    saveToLocalStorage();
    
    clearForm(['currentPin', 'newPin', 'confirmPin']);
    alert('✓ PIN changed successfully!');
    goToScreen('mainMenuScreen');
}

// ============ TRANSFER ============
function processTransfer() {
    const recipientCard = document.getElementById('recipientCard').value;
    const transferAmount = parseFloat(document.getElementById('transferAmount').value);
    const senderAccount = atmState.currentAccount;

    clearError('transferError');

    if (!recipientCard || !transferAmount) {
        showError('transferError', 'Fill all fields');
        return;
    }

    if (transferAmount <= 0) {
        showError('transferError', 'Enter valid amount');
        return;
    }

    if (transferAmount > senderAccount.balance) {
        showError('transferError', 'Insufficient balance');
        return;
    }

    let recipientFound = false;
    for (let cardNum in accountsDB) {
        if (cardNum.endsWith(recipientCard)) {
            const recipient = accountsDB[cardNum];
            
            senderAccount.balance -= transferAmount;
            recipient.balance += transferAmount;

            senderAccount.transactions.push({
                type: 'transfer_out',
                amount: transferAmount,
                date: new Date().toLocaleString(),
                description: `Transfer to Card ${recipientCard}`
            });

            recipient.transactions.push({
                type: 'transfer_in',
                amount: transferAmount,
                date: new Date().toLocaleString(),
                description: `Transfer received`
            });

            saveToLocalStorage();
            recipientFound = true;
            break;
        }
    }

    if (!recipientFound) {
        showError('transferError', 'Card not found');
        return;
    }

    playSound('success');
    addMobileNotification(`Transfer: $${transferAmount}`, 'Transfer');
    alert('✓ Transfer of $' + transferAmount.toFixed(2) + ' successful!');
    clearForm(['recipientCard', 'transferAmount']);
    goToScreen('mainMenuScreen');
}

// ============ MINI STATEMENT ============
function displayStatement() {
    const account = atmState.currentAccount;
    const statementList = document.getElementById('statementList');

    if (account.transactions.length === 0) {
        statementList.innerHTML = '<p class="no-transactions">No transactions yet</p>';
        return;
    }

    let html = '<div class="statement-table">';
    account.transactions.slice(-5).reverse().forEach(tx => {
        const amount = tx.amount.toFixed(2);
        const type = tx.type.includes('withdrawal') || tx.type.includes('transfer_out') ? 'debit' : 'credit';
        html += `
            <div class="statement-row ${type}">
                <div class="tx-desc">${tx.description}</div>
                <div class="tx-amount">$${amount}</div>
                <div class="tx-date">${new Date(tx.date).toLocaleDateString()}</div>
            </div>
        `;
    });
    html += '</div>';
    statementList.innerHTML = html;
}

// ============ LOGOUT ============
function confirmLogout() {
    goToScreen('logoutScreen');
}

function logout() {
    atmState.sessionActive = false;
    atmState.currentAccount = null;
    atmState.currentCardNumber = null;
    atmState.currentCardType = null;
    pinBuffer = '';
    
    clearForm(['currentPin', 'newPin', 'confirmPin', 'customAmount', 'recipientCard', 'transferAmount']);
    
    document.getElementById('cardVisualLarge').classList.remove('inserting');
    goToScreen('insertCardScreen');
    document.getElementById('footerInfo').textContent = 'Card Ejected. Welcome!';
    playSound('beep');
}

function cancelTransaction() {
    logout();
    showError('insertError', 'Session cancelled.');
}

// ============ RECEIPT DOWNLOAD ============
function downloadReceipt() {
    const account = atmState.currentAccount;
    const amount = atmState.withdrawalAmount;
    const receipt = `
BANK RECEIPT
═════════════════════
Transaction: WITHDRAWAL
Amount: $${amount.toFixed(2)}
Card: ****${atmState.currentCardNumber}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
New Balance: $${account.balance.toFixed(2)}
═════════════════════
Thank you for banking with us!
    `.trim();
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt.txt';
    a.click();
}

// ============ MOBILE BANKING ============
function mobileLogin() {
    if (!atmState.sessionActive) {
        alert('Please insert card in ATM first');
        return;
    }
    atmState.mobileLoggedIn = true;
    updateMobileDashboard();
    goToMobileScreen('mobileDashboardScreen');
    playSound('success');
}

function mobileLogout() {
    atmState.mobileLoggedIn = false;
    goToMobileScreen('mobileLoginScreen');
    document.getElementById('mobileFooterInfo').textContent = 'Logged out. Tap Login to start';
}

function goToMobileScreen(screenId) {
    document.querySelectorAll('.mobile-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function updateMobileDashboard() {
    const debitAccount = accountsDB['1234'];
    const creditAccount = accountsDB['5678'];
    
    document.getElementById('mobileDebitBalance').textContent = '$' + debitAccount.balance.toFixed(2);
    document.getElementById('mobileCreditBalance').textContent = '$' + creditAccount.creditLimit.toFixed(2);
    
    updateMobileNotifications();
}

function addMobileNotification(description, type) {
    const notif = {
        description: description,
        type: type,
        time: new Date().toLocaleTimeString()
    };
    
    const notifList = document.getElementById('mobileNotificationsList');
    const item = document.createElement('div');
    item.className = 'mobile-notification-item';
    item.innerHTML = `
        <div>${description}</div>
        <div class="notification-time">${notif.time}</div>
    `;
    notifList.insertBefore(item, notifList.firstChild);
    
    if (notifList.children.length > 5) {
        notifList.removeChild(notifList.lastChild);
    }
}

function updateMobileNotifications() {
    const notifList = document.getElementById('mobileNotificationsList');
    const accounts = [accountsDB['1234'], accountsDB['5678']];
    
    notifList.innerHTML = '';
    accounts.forEach(account => {
        if (account.transactions.length > 0) {
            const lastTx = account.transactions[account.transactions.length - 1];
            const item = document.createElement('div');
            item.className = 'mobile-notification-item';
            item.innerHTML = `
                <div>${lastTx.description}</div>
                <div class="notification-amount">$${lastTx.amount}</div>
                <div class="notification-time">${new Date(lastTx.date).toLocaleTimeString()}</div>
            `;
            notifList.appendChild(item);
        }
    });
}

function mobileRefillAccount() {
    const amount = parseFloat(document.getElementById('refillAmount').value);
    const fromAccount = accountsDB['5678'];
    const toAccount = accountsDB['1234'];
    
    clearError('refillError');
    
    if (!amount || amount <= 0) {
        showError('refillError', 'Enter valid amount');
        return;
    }
    
    if (amount > fromAccount.creditLimit) {
        showError('refillError', 'Insufficient credit limit');
        return;
    }
    
    toAccount.balance += amount;
    fromAccount.creditLimit -= amount;
    
    toAccount.transactions.push({
        type: 'refill',
        amount: amount,
        date: new Date().toLocaleString(),
        description: 'Account refilled via app'
    });
    
    saveToLocalStorage();
    updateMobileDashboard();
    playSound('success');
    alert('✓ Account refilled with $' + amount.toFixed(2));
    document.getElementById('refillAmount').value = '';
    goToMobileScreen('mobileDashboardScreen');
}

function mobileTransferMoney() {
    const to = document.getElementById('mobileTransferTo').value;
    const amount = parseFloat(document.getElementById('mobileTransferAmount').value);
    const from = accountsDB[atmState.currentCardNumber];
    
    clearError('mobileTransferError');
    
    if (!to || !amount || amount <= 0) {
        showError('mobileTransferError', 'Fill all fields');
        return;
    }
    
    if (amount > from.balance) {
        showError('mobileTransferError', 'Insufficient balance');
        return;
    }
    
    let recipientFound = false;
    for (let cardNum in accountsDB) {
        if (cardNum.endsWith(to)) {
            recipientFound = true;
            break;
        }
    }
    
    if (!recipientFound) {
        showError('mobileTransferError', 'Card not found');
        return;
    }
    
    playSound('success');
    alert('Transfer successful!');
    document.getElementById('mobileTransferAmount').value = '';
    document.getElementById('mobileTransferTo').value = '';
    goToMobileScreen('mobileDashboardScreen');
}

function toggleCardStatus(cardType) {
    alert('Card ' + cardType + ' status locked/unlocked');
}

function updateMobileTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('mobileTime').textContent = hours + ':' + minutes;
}

// ============ UTILITY FUNCTIONS ============
function clearForm(fieldIds) {
    fieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}
