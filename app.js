// app.js - Fresh Drop POS V3 Core Logic
import { menuItems } from './data/menu.js';
import { recipes } from './data/recipes.js';
import { initialStock } from './data/stock.js';

// ---------- APP STATE ----------
let currentUser = { role: null, pin: null }; // 'staff' or 'admin'
let currentTable = 'table1';
let carts = {
    table1: [], table2: [], table3: [], table4: [], table5: [], takeaway: []
};
let stock = { ...initialStock };
let todaysSales = {
    date: new Date().toDateString(),
    revenue: 0, cost: 0, profit: 0, ordersCount: 0, cupsSold: 0, transactions: []
};
let historyArchive = []; // array of closed days
let receipts = [];

// Helper: save/load localstorage
function saveData() {
    localStorage.setItem('fdpos_stock', JSON.stringify(stock));
    localStorage.setItem('fdpos_carts', JSON.stringify(carts));
    localStorage.setItem('fdpos_todaysSales', JSON.stringify(todaysSales));
    localStorage.setItem('fdpos_history', JSON.stringify(historyArchive));
    localStorage.setItem('fdpos_receipts', JSON.stringify(receipts));
}
function loadData() {
    const savedStock = localStorage.getItem('fdpos_stock');
    if(savedStock) stock = JSON.parse(savedStock);
    const savedCarts = localStorage.getItem('fdpos_carts');
    if(savedCarts) carts = JSON.parse(savedCarts);
    const savedSales = localStorage.getItem('fdpos_todaysSales');
    if(savedSales) todaysSales = JSON.parse(savedSales);
    const savedHistory = localStorage.getItem('fdpos_history');
    if(savedHistory) historyArchive = JSON.parse(savedHistory);
    const savedReceipts = localStorage.getItem('fdpos_receipts');
    if(savedReceipts) receipts = JSON.parse(savedReceipts);
    
    // ensure date consistency: if new day, reset if date changed
    const todayStr = new Date().toDateString();
    if(todaysSales.date !== todayStr && todaysSales.revenue !== undefined && currentUser) {
        // do not auto reset without close-day; but for safety, we don't reset automatically.
        // Instead, system uses close-day to archive.
    }
}

// ---------- UTILS ----------
function computeCostForOrder(orderItems) {
    let totalCost = 0;
    for(let item of orderItems) {
        const recipe = recipes[item.id];
        if(recipe) {
            for(let ing of recipe.ingredients) {
                let pricePerUnit = getIngredientPricePerGramOrML(ing.name);
                totalCost += (ing.amount * pricePerUnit);
            }
        }
        totalCost += 30; // cupset per item
    }
    return totalCost;
}
function getIngredientPricePerGramOrML(name) {
    const pricing = { 
        "Sugar": 280/1000, "Lime Powder": 500/500, "Fresh Milk": 450/1000, "Ice": 800/1000, "Pepper": 500/250,
        "Lemon": 450/1000, "Mango": 350/1000, "Orange": 1000/1000, "Pineapple": 350/1000, "Papaya": 300/1000,
        "Watermelon": 300/1000, "Avocado": 700/1000, "CupSet": 30
    };
    return pricing[name] || 0;
}

function deductStockAndCup(orderItems) {
    let success = true;
    const tempStock = JSON.parse(JSON.stringify(stock));
    for(let item of orderItems) {
        const recipe = recipes[item.id];
        if(recipe) {
            for(let ing of recipe.ingredients) {
                const currentQty = tempStock[ing.name];
                if(currentQty < ing.amount) { success = false; return false; }
                tempStock[ing.name] -= ing.amount;
            }
        }
        if(tempStock.CupSet < 1) { success = false; return false; }
        tempStock.CupSet -= 1;
    }
    if(success) stock = tempStock;
    return success;
}

function addTransaction(tableName, orderItems, totalRevenue) {
    const orderCost = computeCostForOrder(orderItems);
    todaysSales.revenue += totalRevenue;
    todaysSales.cost += orderCost;
    todaysSales.profit = todaysSales.revenue - todaysSales.cost;
    todaysSales.ordersCount += 1;
    todaysSales.cupsSold += orderItems.length;
    const receipt = {
        id: 'RCP-' + Date.now(),
        date: new Date().toISOString(),
        table: tableName,
        items: orderItems.map(i=>({name: i.name, qty: i.qty, price: i.price})),
        total: totalRevenue,
        cost: orderCost
    };
    receipts.push(receipt);
    todaysSales.transactions.push(receipt);
    saveData();
    return receipt;
}

// ---------- RENDER MENU & CARTS ----------
function renderMenu() {
    const container = document.getElementById('menuGrid');
    if(!container) return;
    container.innerHTML = '';
    menuItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-name">${item.name}</div>
            <div class="product-price">LKR ${item.price}</div>
            <div class="qty-selector">
                <button class="qty-btn dec-qty" data-id="${item.id}">-</button>
                <span id="qty-${item.id}">1</span>
                <button class="qty-btn inc-qty" data-id="${item.id}">+</button>
            </div>
            <button class="add-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">➕ Add</button>
        `;
        container.appendChild(card);
    });
    document.querySelectorAll('.dec-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const span = document.getElementById(`qty-${id}`);
            let val = parseInt(span.innerText);
            if(val > 1) span.innerText = val-1;
        });
    });
    document.querySelectorAll('.inc-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const span = document.getElementById(`qty-${id}`);
            let val = parseInt(span.innerText);
            span.innerText = val+1;
        });
    });
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const price = parseInt(btn.dataset.price);
            const qtySpan = document.getElementById(`qty-${id}`);
            let qty = parseInt(qtySpan.innerText);
            const menuItem = menuItems.find(m => m.id === id);
            for(let i=0; i<qty; i++) {
                carts[currentTable].push({ id, name, price, timestamp: Date.now() });
            }
            renderCart();
            saveData();
        });
    });
}

function renderCart() {
    const cart = carts[currentTable];
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if(!container) return;
    if(cart.length === 0) { container.innerHTML = '<div class="empty-cart">✨ Cart empty. Add juices!</div>'; totalSpan.innerText = '0'; return; }
    let total = 0;
    container.innerHTML = '';
    cart.forEach((item, idx) => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `<span>${item.name}</span><span>LKR ${item.price}</span><button class="remove-item" data-index="${idx}">🗑️</button>`;
        container.appendChild(div);
    });
    totalSpan.innerText = total;
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.index);
            carts[currentTable].splice(idx, 1);
            renderCart();
            saveData();
        });
    });
}

// Checkout
async function checkout() {
    const cart = carts[currentTable];
    if(cart.length === 0) { alert('Cart empty'); return; }
    const totalRev = cart.reduce((s,i)=>s+i.price,0);
    const canDeduct = deductStockAndCup(cart);
    if(!canDeduct) { alert('❌ Insufficient stock! Please restock ingredients.'); return; }
    const receipt = addTransaction(currentTable, cart, totalRev);
    carts[currentTable] = [];
    renderCart();
    saveData();
    alert(`✅ Order completed! ${receipt.id}\nTotal: LKR ${totalRev}\nStock deducted.`);
    updateDashboardAndStockViews();
    renderStockList();
}

// Stock view render
function renderStockList() {
    const container = document.getElementById('stockList');
    if(!container) return;
    const search = document.getElementById('stockSearch')?.value.toLowerCase() || '';
    let lowCount = 0;
    container.innerHTML = '';
    for(let [name, qty] of Object.entries(stock)) {
        if(search && !name.toLowerCase().includes(search)) continue;
        const isLow = (qty < 200 && name !== 'CupSet') || (name === 'CupSet' && qty < 30);
        if(isLow) lowCount++;
        const div = document.createElement('div');
        div.className = `stock-item ${isLow ? 'low-stock' : ''}`;
        div.innerHTML = `
            <span><strong>${name}</strong><br>${qty} ${name.includes('Milk')?'ml':(name==='CupSet'?'units':'g')}</span>
            <div>
                ${currentUser.role === 'admin' ? `<button class="edit-stock-btn" data-name="${name}">✏️ Edit</button>` : ''}
                ${currentUser.role === 'admin' ? `<button class="restock-btn" data-name="${name}">➕ Restock</button>` : ''}
            </div>
        `;
        container.appendChild(div);
    }
    const banner = document.getElementById('lowStockBanner');
    if(banner) banner.innerText = lowCount > 0 ? `⚠️ Low stock: ${lowCount} ingredients below threshold` : '✅ Stock levels healthy';
    if(currentUser.role === 'admin') attachStockButtons();
}
function attachStockButtons() {
    document.querySelectorAll('.edit-stock-btn').forEach(btn => {
        btn.onclick = () => { let newVal = prompt('Enter new quantity (grams/units):'); if(newVal && !isNaN(newVal)) { stock[btn.dataset.name] = parseInt(newVal); saveData(); renderStockList(); } };
    });
    document.querySelectorAll('.restock-btn').forEach(btn => {
        btn.onclick = () => { let addVal = prompt('Add quantity:'); if(addVal && !isNaN(addVal)) { stock[btn.dataset.name] += parseInt(addVal); saveData(); renderStockList(); } };
    });
}

// Dashboard
function updateDashboardAndStockViews() {
    const container = document.getElementById('dashboardCards');
    if(!container) return;
    const revenue = todaysSales.revenue;
    const cost = todaysSales.cost;
    const profit = todaysSales.profit;
    const orders = todaysSales.ordersCount;
    const cups = todaysSales.cupsSold;
    const lowStockCount = Object.entries(stock).filter(([k,v]) => (v<200 && k!=='CupSet') || (k==='CupSet' && v<30)).length;
    container.innerHTML = `
        <div class="stat-card"><h4>Today's Revenue</h4><div class="stat-number">LKR ${revenue}</div></div>
        <div class="stat-card"><h4>Cost</h4><div class="stat-number">LKR ${cost}</div></div>
        <div class="stat-card"><h4>Profit</h4><div class="stat-number">LKR ${profit}</div></div>
        <div class="stat-card"><h4>Orders</h4><div class="stat-number">${orders}</div></div>
        <div class="stat-card"><h4>Cups Sold</h4><div class="stat-number">${cups}</div></div>
        <div class="stat-card"><h4>⚠️ Low Stock</h4><div class="stat-number">${lowStockCount}</div></div>
    `;
    const runningTables = Object.entries(carts).filter(([t,arr]) => arr.length>0).length;
    const runningHtml = `<div class="stat-card"><h4>Running Tables</h4><div class="stat-number">${runningTables}</div></div>`;
    container.insertAdjacentHTML('beforeend', runningHtml);
}
// Reports
function dailyReport() { showReport(`📅 Daily Summary\nRevenue: LKR ${todaysSales.revenue}\nCost: LKR ${todaysSales.cost}\nProfit: LKR ${todaysSales.profit}\nOrders: ${todaysSales.ordersCount}\nCups: ${todaysSales.cupsSold}`); }
function weeklyReport() { showReport(`📆 Weekly Trend (Last 7 days simulated from history)\n- Based on archived data: ${historyArchive.length} days archived. Avg Profit: ${historyArchive.length? (historyArchive.reduce((a,b)=>a+b.profit,0)/historyArchive.length).toFixed(0):0}`); }
function monthlyReport() { showReport(`📈 Monthly (from archive): Total revenue: ${historyArchive.reduce((a,b)=>a+b.revenue,0)} LKR`); }
function showReport(msg) { const el = document.getElementById('reportDisplay'); if(el) el.innerHTML = `<pre>${msg}</pre>`; }

// Admin actions
function closeDay() {
    if(currentUser.role !== 'admin') { alert('Admin only'); return; }
    const summary = {
        date: todaysSales.date,
        revenue: todaysSales.revenue,
        cost: todaysSales.cost,
        profit: todaysSales.profit,
        orders: todaysSales.ordersCount,
        cups: todaysSales.cupsSold
    };
    historyArchive.push(summary);
    // reset today
    todaysSales = {
        date: new Date().toDateString(),
        revenue: 0, cost: 0, profit: 0, ordersCount: 0, cupsSold: 0, transactions: []
    };
    saveData();
    alert('Day closed & archived. New day started.');
    updateDashboardAndStockViews();
    renderHistoryList();
}
function resetDay() {
    if(confirm('Reset today without archiving? Data lost.')) {
        todaysSales = { date: new Date().toDateString(), revenue:0, cost:0, profit:0, ordersCount:0, cupsSold:0, transactions:[] };
        saveData();
        updateDashboardAndStockViews();
        alert('Today reset.');
    }
}
function renderHistoryList() {
    const histDiv = document.getElementById('historyList');
    if(histDiv) histDiv.innerHTML = historyArchive.slice().reverse().map(h => `<div class="history-card">📆 ${h.date} | Rev:LKR ${h.revenue} | Profit:LKR ${h.profit} | Orders:${h.orders}</div>`).join('');
}
// Add ingredient admin only
function addIngredient() { let name = prompt('Ingredient name'); let qty = prompt('Initial qty(g/units)'); if(name && qty) { stock[name]=parseInt(qty); saveData(); renderStockList(); } }

// ---------- INIT & EVENT LISTENERS ----------
function login(pin) {
    if(pin === '2000') { currentUser = { role: 'staff', pin }; }
    else if(pin === '2060') { currentUser = { role: 'admin', pin }; }
    else { alert('Invalid PIN'); return false; }
    document.getElementById('loginView').classList.remove('active');
    document.getElementById('posView').classList.add('active');
    document.getElementById('userRoleBadge').innerText = currentUser.role === 'admin' ? '👑 Admin Mode' : '🥤 Staff Mode';
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(el => { if(currentUser.role === 'admin') el.style.display = 'flex'; else el.style.display = 'none'; });
    const adminTabBtn = document.getElementById('adminTabBtn');
    if(adminTabBtn) adminTabBtn.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    loadData();
    renderMenu();
    renderCart();
    renderStockList();
    updateDashboardAndStockViews();
    renderHistoryList();
    return true;
}
function logout() { currentUser = { role: null, pin: null }; localStorage.clear(); location.reload(); }

window.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('loginBtn')?.addEventListener('click', () => login(document.getElementById('pinInput').value));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
    document.getElementById('clearCartBtn')?.addEventListener('click', () => { carts[currentTable]=[]; renderCart(); saveData(); });
    // table switching
    document.querySelectorAll('.table-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.table-chip').forEach(t=>t.classList.remove('active'));
            btn.classList.add('active');
            currentTable = btn.dataset.table;
            document.getElementById('currentTableName').innerText = btn.innerText;
            renderCart();
        });
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tc=>tc.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(tb=>tb.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}Tab`).classList.add('active');
            if(tab === 'stock') renderStockList();
            if(tab === 'reports') updateDashboardAndStockViews();
            if(tab === 'admin') renderHistoryList();
        });
    });
    document.getElementById('dailyReportBtn')?.addEventListener('click', dailyReport);
    document.getElementById('weeklyReportBtn')?.addEventListener('click', weeklyReport);
    document.getElementById('monthlyReportBtn')?.addEventListener('click', monthlyReport);
    document.getElementById('closeDayBtn')?.addEventListener('click', closeDay);
    document.getElementById('resetDayBtn')?.addEventListener('click', resetDay);
    document.getElementById('addIngredientBtn')?.addEventListener('click', addIngredient);
    document.getElementById('restockSelectedBtn')?.addEventListener('click', () => { alert('Use edit or restock per item'); });
    document.getElementById('stockSearch')?.addEventListener('input', () => renderStockList());
});