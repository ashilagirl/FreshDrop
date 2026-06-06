// app.js - Fresh Drop POS V3 Complete Edition
import { initialStock } from './data/stock.js';

// ---------- INITIAL DATA ----------
const defaultCategories = [
  { id: "fresh_juice", name: "🍹 Fresh Juice", icon: "🍊" },
  { id: "milkshake", name: "🥛 Milkshake", icon: "🥤" },
  { id: "special_drink", name: "✨ Special Drink", icon: "⭐" },
  { id: "seasonal_special", name: "🌸 Seasonal Special", icon: "🌸" }
];

const defaultMenuItems = [
  { id: "lime_juice", name: "Lime Juice", price: 200, category: "fresh_juice", active: true, recipe: { "Lemon": 50, "Sugar": 40, "Ice": 50 } },
  { id: "watermelon_juice", name: "Watermelon Juice", price: 300, category: "fresh_juice", active: true, recipe: { "Watermelon": 300, "Ice": 50 } },
  { id: "papaya_juice", name: "Papaya Juice", price: 300, category: "fresh_juice", active: true, recipe: { "Papaya": 250, "Sugar": 20, "Ice": 50 } },
  { id: "pineapple_juice", name: "Pineapple Juice", price: 400, category: "fresh_juice", active: true, recipe: { "Pineapple": 250, "Sugar": 20, "Ice": 50 } },
  { id: "orange_juice", name: "Orange Juice", price: 400, category: "fresh_juice", active: true, recipe: { "Orange": 250, "Sugar": 25, "Ice": 50 } },
  { id: "mango_juice", name: "Mango Juice", price: 400, category: "fresh_juice", active: true, recipe: { "Mango": 250, "Sugar": 25, "Ice": 50 } },
  { id: "mixed_fruit_juice", name: "Mixed Fruit Juice", price: 450, category: "fresh_juice", active: true, recipe: { "Mango": 80, "Pineapple": 80, "Papaya": 60, "Orange": 60, "Sugar": 20, "Ice": 50 } },
  { id: "avocado_juice", name: "Avocado Juice", price: 500, category: "fresh_juice", active: true, recipe: { "Avocado": 180, "Fresh Milk": 180, "Sugar": 30, "Ice": 50 } },
  { id: "fruit_salad", name: "Fruit Salad", price: 500, category: "fresh_juice", active: true, recipe: { "Watermelon": 80, "Mango": 60, "Pineapple": 60, "Papaya": 60, "Lemon": 10, "Sugar": 15 } }
];

const defaultTables = [
  "Table 1", "Table 2", "Table 3", "Table 4", "Table 5",
  "Table 6", "Table 7", "Table 8", "Table 9", "Table 10"
];

// ---------- APP STATE ----------
let currentRole = 'staff';
let currentTable = 0; // index
let currentCategory = 'all';
let tables = [...defaultTables];
let categories = [...defaultCategories];
let menuItems = [...defaultMenuItems];
let carts = {};
let stock = { ...initialStock };
let todaysSales = { date: new Date().toDateString(), revenue: 0, cost: 0, profit: 0, ordersCount: 0, cupsSold: 0, transactions: [] };
let historyArchive = [];
let receipts = [];
let pendingCart = null;
let pendingTotal = null;

// Shop info
const SHOP_NAME = "FRESH DROP JUICE BAR";
const SHOP_PHONE = "0773503720";
const THANK_YOU_MSG = "Thank you for your order! 🌟";
const WELCOME_MSG = "Welcome again! 🍹";

// ---------- INITIALIZATION ----------
function initializeCarts() {
  tables.forEach((_, index) => {
    carts[`table_${index}`] = [];
  });
  carts['takeaway'] = [];
}

function loadData() {
  const savedTables = localStorage.getItem('fdpos_tables');
  if(savedTables) tables = JSON.parse(savedTables);
  
  const savedCategories = localStorage.getItem('fdpos_categories');
  if(savedCategories) categories = JSON.parse(savedCategories);
  
  const savedMenu = localStorage.getItem('fdpos_menu');
  if(savedMenu) menuItems = JSON.parse(savedMenu);
  
  const savedStock = localStorage.getItem('fdpos_stock');
  if(savedStock) stock = JSON.parse(savedStock);
  
  const savedCarts = localStorage.getItem('fdpos_carts');
  if(savedCarts) carts = JSON.parse(savedCarts);
  else initializeCarts();
  
  const savedSales = localStorage.getItem('fdpos_todaysSales');
  if(savedSales) todaysSales = JSON.parse(savedSales);
  
  const savedHistory = localStorage.getItem('fdpos_history');
  if(savedHistory) historyArchive = JSON.parse(savedHistory);
  
  const savedReceipts = localStorage.getItem('fdpos_receipts');
  if(savedReceipts) receipts = JSON.parse(savedReceipts);
}

function saveData() {
  localStorage.setItem('fdpos_tables', JSON.stringify(tables));
  localStorage.setItem('fdpos_categories', JSON.stringify(categories));
  localStorage.setItem('fdpos_menu', JSON.stringify(menuItems));
  localStorage.setItem('fdpos_stock', JSON.stringify(stock));
  localStorage.setItem('fdpos_carts', JSON.stringify(carts));
  localStorage.setItem('fdpos_todaysSales', JSON.stringify(todaysSales));
  localStorage.setItem('fdpos_history', JSON.stringify(historyArchive));
  localStorage.setItem('fdpos_receipts', JSON.stringify(receipts));
}

// ---------- UTILITY FUNCTIONS ----------
function getIngredientPricePerUnit(name) {
  const pricing = { 
    "Sugar": 280/1000, "Lime Powder": 500/500, "Fresh Milk": 450/1000, 
    "Ice": 800/1000, "Pepper": 500/250, "Lemon": 450/1000, "Mango": 350/1000, 
    "Orange": 1000/1000, "Pineapple": 350/1000, "Papaya": 300/1000,
    "Watermelon": 300/1000, "Avocado": 700/1000, "CupSet": 30
  };
  return pricing[name] || 0;
}

function computeCostForOrder(orderItems) {
  let totalCost = 0;
  for(let item of orderItems) {
    const menuItem = menuItems.find(m => m.id === item.id);
    if(menuItem && menuItem.recipe) {
      for(let [ingredient, amount] of Object.entries(menuItem.recipe)) {
        totalCost += amount * getIngredientPricePerUnit(ingredient);
      }
    }
    totalCost += 30; // CupSet
  }
  return totalCost;
}

function deductStock(orderItems) {
  const tempStock = { ...stock };
  for(let item of orderItems) {
    const menuItem = menuItems.find(m => m.id === item.id);
    if(menuItem && menuItem.recipe) {
      for(let [ingredient, amount] of Object.entries(menuItem.recipe)) {
        if(!tempStock[ingredient] || tempStock[ingredient] < amount) {
          alert(`❌ Insufficient ${ingredient}! Need ${amount}g but only ${tempStock[ingredient] || 0}g available.`);
          return false;
        }
        tempStock[ingredient] -= amount;
      }
    }
    if(!tempStock.CupSet || tempStock.CupSet < 1) {
      alert('❌ Insufficient cups! Please restock CupSet.');
      return false;
    }
    tempStock.CupSet -= 1;
  }
  stock = tempStock;
  return true;
}

// ---------- RENDER FUNCTIONS ----------
function renderTables() {
  const container = document.getElementById('tablesContainer');
  if(!container) return;
  
  container.innerHTML = '';
  tables.forEach((tableName, idx) => {
    const btn = document.createElement('button');
    btn.className = `table-chip ${currentTable === idx ? 'active' : ''}`;
    btn.dataset.table = idx;
    btn.innerHTML = `🍽️ ${tableName}`;
    btn.onclick = () => {
      document.querySelectorAll('.table-chip').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      currentTable = idx;
      document.getElementById('currentTableName').innerText = tableName;
      renderCart();
    };
    container.appendChild(btn);
  });
  
  // Takeaway
  const takeawayBtn = document.createElement('button');
  takeawayBtn.className = `table-chip ${currentTable === 'takeaway' ? 'active' : ''}`;
  takeawayBtn.dataset.table = 'takeaway';
  takeawayBtn.innerHTML = '🛍️ Takeaway';
  takeawayBtn.onclick = () => {
    document.querySelectorAll('.table-chip').forEach(t => t.classList.remove('active'));
    takeawayBtn.classList.add('active');
    currentTable = 'takeaway';
    document.getElementById('currentTableName').innerText = 'Takeaway';
    renderCart();
  };
  container.appendChild(takeawayBtn);
}

function renderCategories() {
  const container = document.getElementById('categoryBar');
  if(!container) return;
  
  container.innerHTML = '<button class="category-btn active" data-category="all">📋 All Items</button>';
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.category = cat.id;
    btn.innerHTML = `${cat.icon || '📌'} ${cat.name}`;
    btn.onclick = () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = cat.id;
      renderMenu();
    };
    container.appendChild(btn);
  });
}

function renderMenu() {
  const container = document.getElementById('menuGrid');
  if(!container) return;
  
  let filteredItems = menuItems.filter(item => item.active !== false);
  if(currentCategory !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === currentCategory);
  }
  
  container.innerHTML = '';
  filteredItems.forEach(item => {
    const category = categories.find(c => c.id === item.category);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${currentRole === 'admin' ? '<button class="edit-item-btn" data-id="' + item.id + '">✏️</button>' : ''}
      <div class="product-category">${category ? category.name : 'Juice'}</div>
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
  
  // Attach events
  document.querySelectorAll('.dec-qty').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const span = document.getElementById(`qty-${id}`);
      let val = parseInt(span.innerText);
      if(val > 1) span.innerText = val-1;
    };
  });
  
  document.querySelectorAll('.inc-qty').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const span = document.getElementById(`qty-${id}`);
      let val = parseInt(span.innerText);
      span.innerText = val+1;
    };
  });
  
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseInt(btn.dataset.price);
      const qtySpan = document.getElementById(`qty-${id}`);
      let qty = parseInt(qtySpan.innerText);
      
      const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
      for(let i=0; i<qty; i++) {
        carts[cartKey].push({ id, name, price, timestamp: Date.now() });
      }
      renderCart();
      saveData();
    };
  });
  
  if(currentRole === 'admin') {
    document.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.onclick = () => openEditItemModal(btn.dataset.id);
    });
  }
}

function renderCart() {
  const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
  const cart = carts[cartKey] || [];
  const container = document.getElementById('cartItems');
  const totalSpan = document.getElementById('cartTotal');
  
  if(!container) return;
  
  if(cart.length === 0) {
    container.innerHTML = '<div class="empty-cart">✨ Cart empty. Add items!</div>';
    totalSpan.innerText = '0';
    return;
  }
  
  let total = 0;
  container.innerHTML = '';
  cart.forEach((item, idx) => {
    total += item.price;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <span>${item.name}</span>
      <span>LKR ${item.price}</span>
      <button class="remove-item" data-index="${idx}">🗑️</button>
    `;
    container.appendChild(div);
  });
  totalSpan.innerText = total;
  
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index);
      cart.splice(idx, 1);
      renderCart();
      saveData();
    };
  });
}

// ---------- CHECKOUT & RECEIPT ----------
function checkout() {
  const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
  const cart = carts[cartKey] || [];
  
  if(cart.length === 0) {
    alert('Cart is empty!');
    return;
  }
  
  pendingCart = cart;
  pendingTotal = cart.reduce((s,i) => s + i.price, 0);
  
  // Show customer name modal
  document.getElementById('customerModal').style.display = 'block';
  document.getElementById('customerName').value = '';
}

function generateReceipt(customerName) {
  const cart = pendingCart;
  const total = pendingTotal;
  if(!cart || cart.length === 0) return;
  
  const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
  const tableName = currentTable === 'takeaway' ? 'Takeaway' : tables[currentTable];
  
  // Deduct stock
  if(!deductStock(cart)) {
    alert('Stock deduction failed!');
    return;
  }
  
  // Calculate cost and add transaction
  const orderCost = computeCostForOrder(cart);
  todaysSales.revenue += total;
  todaysSales.cost += orderCost;
  todaysSales.profit = todaysSales.revenue - todaysSales.cost;
  todaysSales.ordersCount += 1;
  todaysSales.cupsSold += cart.length;
  
  const receipt = {
    id: 'RCP-' + Date.now(),
    date: new Date().toISOString(),
    customerName: customerName,
    table: tableName,
    items: cart.map(i => ({ name: i.name, price: i.price })),
    total: total,
    cost: orderCost
  };
  
  receipts.push(receipt);
  todaysSales.transactions.push(receipt);
  
  // Clear cart
  carts[cartKey] = [];
  renderCart();
  saveData();
  updateDashboardAndStockViews();
  renderStockList();
  
  // Display receipt
  displayReceipt(receipt);
  pendingCart = null;
  pendingTotal = null;
  
  // Close customer modal
  document.getElementById('customerModal').style.display = 'none';
}

function displayReceipt(receipt) {
  const now = new Date();
  const receiptHTML = `
    <pre style="font-family: 'Courier New', monospace; font-size: 12px;">
${'='.repeat(40)}
<b>${SHOP_NAME}</b>
${'='.repeat(40)}
📞 ${SHOP_PHONE}
📅 ${now.toLocaleDateString()}
⏰ ${now.toLocaleTimeString()}
${'='.repeat(40)}
👤 Customer: ${receipt.customerName}
🍽️ ${receipt.table}
${'='.repeat(40)}
Item                     Price
${'-'.repeat(40)}
${receipt.items.map(item => `${item.name.padEnd(25)} LKR ${item.price}`).join('\n')}
${'-'.repeat(40)}
TOTAL${' '.repeat(30)} LKR ${receipt.total}
${'='.repeat(40)}
${THANK_YOU_MSG}
${WELCOME_MSG}
${'='.repeat(40)}
Receipt #: ${receipt.id}
    </pre>
  `;
  
  document.getElementById('receiptContent').innerHTML = receiptHTML;
  document.getElementById('receiptModal').style.display = 'block';
}

// ---------- RECEIPT ACTIONS ----------
function printReceipt() {
  const receiptContent = document.getElementById('receiptContent').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head><title>Receipt</title></head>
      <body>${receiptContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function downloadPDF() {
  const element = document.getElementById('receiptContent');
  html2pdf().from(element).save('receipt.pdf');
}

function sendWhatsApp() {
  const receiptText = document.getElementById('receiptContent').innerText;
  const encodedText = encodeURIComponent(receiptText);
  window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}

// ---------- ADMIN FUNCTIONS ----------
function openEditItemModal(itemId) {
  const item = menuItems.find(i => i.id === itemId);
  if(!item) return;
  
  document.getElementById('itemFormTitle').innerText = 'Edit Item';
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemCategory').value = item.category;
  
  renderIngredientsForm(item.recipe || {});
  document.getElementById('itemFormModal').style.display = 'block';
}

function renderIngredientsForm(recipe) {
  const container = document.getElementById('ingredientsList');
  if(!container) return;
  
  container.innerHTML = '';
  const allIngredients = Object.keys(stock).filter(i => i !== 'CupSet');
  
  for(let [ingredient, amount] of Object.entries(recipe)) {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
      <select class="ingredient-name">
        ${allIngredients.map(ing => `<option value="${ing}" ${ing === ingredient ? 'selected' : ''}>${ing}</option>`).join('')}
      </select>
      <input type="number" class="ingredient-amount" value="${amount}" placeholder="Amount (g/ml)">
      <button type="button" class="remove-ingredient">✖️</button>
    `;
    container.appendChild(div);
  }
  
  document.querySelectorAll('.remove-ingredient').forEach(btn => {
    btn.onclick = () => btn.parentElement.remove();
  });
}

function saveItemForm(e) {
  e.preventDefault();
  
  const itemId = document.getElementById('itemId').value;
  const name = document.getElementById('itemName').value;
  const price = parseInt(document.getElementById('itemPrice').value);
  const category = document.getElementById('itemCategory').value;
  
  const recipe = {};
  document.querySelectorAll('.ingredient-row').forEach(row => {
    const ingredient = row.querySelector('.ingredient-name').value;
    const amount = parseInt(row.querySelector('.ingredient-amount').value);
    if(ingredient && amount) recipe[ingredient] = amount;
  });
  
  if(itemId) {
    // Edit existing
    const index = menuItems.findIndex(i => i.id === itemId);
    if(index !== -1) {
      menuItems[index] = { ...menuItems[index], name, price, category, recipe };
    }
  } else {
    // Add new
    const newId = name.toLowerCase().replace(/ /g, '_') + '_' + Date.now();
    menuItems.push({ id: newId, name, price, category, recipe, active: true });
  }
  
  saveData();
  renderMenu();
  document.getElementById('itemFormModal').style.display = 'none';
}

function openAddItemModal() {
  document.getElementById('itemFormTitle').innerText = 'Add New Item';
  document.getElementById('itemId').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemCategory').value = 'fresh_juice';
  document.getElementById('ingredientsList').innerHTML = '';
  document.getElementById('itemFormModal').style.display = 'block';
}

function manageTables() {
  const container = document.getElementById('tablesList');
  if(!container) return;
  
  container.innerHTML = '';
  tables.forEach((table, idx) => {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
      <input type="text" value="${table}" id="table_${idx}" style="flex:1;">
      <button class="remove-ingredient" data-idx="${idx}">🗑️</button>
    `;
    container.appendChild(div);
  });
  
  document.querySelectorAll('#tablesList .remove-ingredient').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      tables.splice(idx, 1);
      manageTables();
    };
  });
  
  document.getElementById('tablesModal').style.display = 'block';
}

function addNewTable() {
  tables.push(`Table ${tables.length + 1}`);
  carts[`table_${tables.length - 1}`] = [];
  manageTables();
  saveData();
  renderTables();
}

function saveTables() {
  tables.forEach((_, idx) => {
    const input = document.getElementById(`table_${idx}`);
    if(input) tables[idx] = input.value;
  });
  saveData();
  renderTables();
  document.getElementById('tablesModal').style.display = 'none';
}

// ---------- STOCK FUNCTIONS ----------
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
      <span><strong>${name}</strong><br>${qty} ${name.includes('Milk') ? 'ml' : (name === 'CupSet' ? 'units' : 'g')}</span>
      <div>
        <button class="edit-stock-btn" data-name="${name}">✏️ Edit</button>
        <button class="restock-btn" data-name="${name}">➕ Restock</button>
      </div>
    `;
    container.appendChild(div);
  }
  
  const banner = document.getElementById('lowStockBanner');
  if(banner) banner.innerText = lowCount > 0 ? `⚠️ Low stock: ${lowCount} ingredients below threshold` : '✅ Stock levels healthy';
  
  // Attach stock buttons
  document.querySelectorAll('.edit-stock-btn').forEach(btn => {
    btn.onclick = () => {
      let newVal = prompt('Enter new quantity:');
      if(newVal && !isNaN(newVal)) {
        stock[btn.dataset.name] = parseInt(newVal);
        saveData();
        renderStockList();
      }
    };
  });
  
  document.querySelectorAll('.restock-btn').forEach(btn => {
    btn.onclick = () => {
      let addVal = prompt('Add quantity:');
      if(addVal && !isNaN(addVal)) {
        stock[btn.dataset.name] += parseInt(addVal);
        saveData();
        renderStockList();
      }
    };
  });
}

function addIngredient() {
  let name = prompt('Ingredient name:');
  let qty = prompt('Initial quantity (g/ml/units):');
  if(name && qty && !isNaN(qty)) {
    stock[name] = parseInt(qty);
    saveData();
    renderStockList();
  }
}

// ---------- DASHBOARD & REPORTS ----------
function updateDashboardAndStockViews() {
  const container = document.getElementById('dashboardCards');
  if(!container) return;
  
  const lowStockCount = Object.entries(stock).filter(([k,v]) => 
    (v < 200 && k !== 'CupSet') || (k === 'CupSet' && v < 30)
  ).length;
  
  container.innerHTML = `
    <div class="stat-card"><h4>Today's Revenue</h4><div class="stat-number">LKR ${todaysSales.revenue}</div></div>
    <div class="stat-card"><h4>Cost</h4><div class="stat-number">LKR ${todaysSales.cost}</div></div>
    <div class="stat-card"><h4>Profit</h4><div class="stat-number">LKR ${todaysSales.profit}</div></div>
    <div class="stat-card"><h4>Orders</h4><div class="stat-number">${todaysSales.ordersCount}</div></div>
    <div class="stat-card"><h4>Cups Sold</h4><div class="stat-number">${todaysSales.cupsSold}</div></div>
    <div class="stat-card"><h4>⚠️ Low Stock</h4><div class="stat-number">${lowStockCount}</div></div>
  `;
  
  const runningCount = Object.values(carts).filter(arr => arr.length > 0).length;
  container.innerHTML += `<div class="stat-card"><h4>Active Tables</h4><div class="stat-number">${runningCount}</div></div>`;
}

function dailyReport() {
  showReport(`📅 DAILY SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━\nRevenue: LKR ${todaysSales.revenue}\nCost: LKR ${todaysSales.cost}\nProfit: LKR ${todaysSales.profit}\nOrders: ${todaysSales.ordersCount}\nCups: ${todaysSales.cupsSold}\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function weeklyReport() {
  showReport(`📆 WEEKLY TREND\n━━━━━━━━━━━━━━━━━━━━━━━━━\nArchived Days: ${historyArchive.length}\nTotal Revenue: LKR ${historyArchive.reduce((a,b)=>a+b.revenue,0)}\nTotal Profit: LKR ${historyArchive.reduce((a,b)=>a+b.profit,0)}\nAvg Daily: LKR ${historyArchive.length ? (historyArchive.reduce((a,b)=>a+b.revenue,0)/historyArchive.length).toFixed(0) : 0}\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function monthlyReport() {
  showReport(`📈 MONTHLY SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Revenue: LKR ${historyArchive.reduce((a,b)=>a+b.revenue,0)}\nTotal Profit: LKR ${historyArchive.reduce((a,b)=>a+b.profit,0)}\nDays: ${historyArchive.length}\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function showReport(msg) {
  const el = document.getElementById('reportDisplay');
  if(el) el.innerHTML = `<pre>${msg}</pre>`;
}

function closeDay() {
  const summary = {
    date: todaysSales.date,
    revenue: todaysSales.revenue,
    cost: todaysSales.cost,
    profit: todaysSales.profit,
    orders: todaysSales.ordersCount,
    cups: todaysSales.cupsSold
  };
  historyArchive.push(summary);
  todaysSales = {
    date: new Date().toDateString(),
    revenue: 0, cost: 0, profit: 0, ordersCount: 0, cupsSold: 0, transactions: []
  };
  saveData();
  alert('✅ Day closed & archived!');
  updateDashboardAndStockViews();
  renderHistoryList();
}

function resetDay() {
  if(confirm('Reset today without archiving?')) {
    todaysSales = { date: new Date().toDateString(), revenue:0, cost:0, profit:0, ordersCount:0, cupsSold:0, transactions: [] };
    saveData();
    updateDashboardAndStockViews();
    alert('Today reset.');
  }
}

function renderHistoryList() {
  const histDiv = document.getElementById('historyList');
  if(histDiv) {
    histDiv.innerHTML = historyArchive.slice().reverse().map(h => 
      `<div class="history-card">📆 ${h.date} | Revenue: LKR ${h.revenue} | Profit: LKR ${h.profit} | Orders: ${h.orders}</div>`
    ).join('');
    if(historyArchive.length === 0) histDiv.innerHTML = '<div class="history-card">No archived days yet.</div>';
  }
}

function resetAllData() {
  if(confirm('⚠️ WARNING: Reset ALL data? This cannot be undone!')) {
    localStorage.clear();
    location.reload();
  }
}

// ---------- EVENT LISTENERS ----------
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  if(!localStorage.getItem('fdpos_initialized')) {
    initializeCarts();
    saveData();
    localStorage.setItem('fdpos_initialized', 'true');
  }
  
  renderTables();
  renderCategories();
  renderMenu();
  renderCart();
  renderStockList();
  updateDashboardAndStockViews();
  renderHistoryList();
  
  // Role switcher
  document.getElementById('roleSwitcher').addEventListener('change', (e) => {
    currentRole = e.target.value;
    renderMenu();
  });
  
  // Buttons
  document.getElementById('resetAllBtn').addEventListener('click', resetAllData);
  document.getElementById('manageTablesBtn').addEventListener('click', manageTables);
  document.getElementById('manageItemsBtn').addEventListener('click', openAddItemModal);
  document.getElementById('checkoutBtn').addEventListener('click', checkout);
  document.getElementById('clearCartBtn').addEventListener('click', () => {
    const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
    carts[cartKey] = [];
    renderCart();
    saveData();
  });
  document.getElementById('addTableBtn').addEventListener('click', addNewTable);
  document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);
  document.getElementById('restockSelectedBtn').addEventListener('click', () => {
    let name = prompt('Ingredient name:');
    if(name && stock[name] !== undefined) {
      let addVal = prompt('Add quantity:');
      if(addVal && !isNaN(addVal)) {
        stock[name] += parseInt(addVal);
        saveData();
        renderStockList();
      }
    } else alert('Ingredient not found!');
  });
  document.getElementById('dailyReportBtn').addEventListener('click', dailyReport);
  document.getElementById('weeklyReportBtn').addEventListener('click', weeklyReport);
  document.getElementById('monthlyReportBtn').addEventListener('click', monthlyReport);
  document.getElementById('closeDayBtn').addEventListener('click', closeDay);
  document.getElementById('resetDayBtn').addEventListener('click', resetDay);
  document.getElementById('stockSearch').addEventListener('input', () => renderStockList());
  
  // Receipt modals
  document.getElementById('printReceiptBtn').addEventListener('click', printReceipt);
  document.getElementById('pdfReceiptBtn').addEventListener('click', downloadPDF);
  document.getElementById('whatsappReceiptBtn').addEventListener('click', sendWhatsApp);
  document.getElementById('confirmCustomerBtn').addEventListener('click', () => {
    const customerName = document.getElementById('customerName').value;
    if(customerName) generateReceipt(customerName);
    else alert('Please enter customer name');
  });
  
  // Item form
  document.getElementById('itemForm').addEventListener('submit', saveItemForm);
  document.getElementById('addIngredientFieldBtn').addEventListener('click', () => {
    const container = document.getElementById('ingredientsList');
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
      <input type="text" class="ingredient-name" placeholder="Ingredient name" list="ingredientsDatalist">
      <input type="number" class="ingredient-amount" placeholder="Amount">
      <button type="button" class="remove-ingredient">✖️</button>
    `;
    container.appendChild(div);
    div.querySelector('.remove-ingredient').onclick = () => div.remove();
  });
  
  // Close modals
  document.querySelectorAll('.close, .close-tables, .close-items, .close-item-form').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('tablesModal').style.display = 'none';
      document.getElementById('itemsModal').style.display = 'none';
      document.getElementById('itemFormModal').style.display = 'none';
      document.getElementById('receiptModal').style.display = 'none';
      document.getElementById('customerModal').style.display = 'none';
    };
  });
  
  // Save tables on modal close
  const saveTablesBtn = document.createElement('button');
  saveTablesBtn.textContent = '💾 Save Tables';
  saveTablesBtn.className = 'btn btn-primary';
  saveTablesBtn.style.marginTop = '1rem';
  saveTablesBtn.onclick = saveTables;
  document.getElementById('tablesList').parentElement.appendChild(saveTablesBtn);
});