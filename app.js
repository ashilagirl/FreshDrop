// app.js - Fresh Drop POS V3 - COMPLETE ENHANCED VERSION WITH DYNAMIC PRICING
import { initialStock } from './data/stock.js';

// ---------- INITIAL DATA ----------
const defaultCategories = [
  { id: "fresh_juice", name: "Fresh Juice", icon: "🍹" },
  { id: "milkshake", name: "Milkshake", icon: "🥤" },
  { id: "special_drink", name: "Special Drink", icon: "⭐" },
  { id: "seasonal_special", name: "Seasonal Special", icon: "🌸" }
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

const defaultTables = Array.from({length: 10}, (_, i) => `Table ${i + 1}`);

// Default ingredient prices (LKR per kg or per unit)
const defaultIngredientPrices = {
    "Sugar": 280, "Lime Powder": 1000, "Fresh Milk": 450, "Ice": 800, "Pepper": 2000,
    "Lemon": 450, "Mango": 350, "Orange": 1000, "Pineapple": 350, "Papaya": 300,
    "Watermelon": 300, "Avocado": 700, "CupSet": 30
};

// ---------- APP STATE ----------
let currentRole = 'staff';
let currentTable = 0;
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
let ingredientPrices = { ...defaultIngredientPrices };
let priceHistory = [];

const SHOP_NAME = "FRESH DROP JUICE BAR";
const SHOP_PHONE = "0773503720";
const THANK_YOU_MSG = "Thank you for your order! 🌟";
const WELCOME_MSG = "Welcome again! 🍹";

// ---------- INITIALIZATION ----------
function initializeCarts() {
  tables.forEach((_, index) => { carts[`table_${index}`] = []; });
  carts['takeaway'] = [];
}

function loadPriceData() {
    const savedPrices = localStorage.getItem('fdpos_ingredient_prices');
    if(savedPrices) {
        ingredientPrices = JSON.parse(savedPrices);
    } else {
        ingredientPrices = { ...defaultIngredientPrices };
    }
    const savedPriceHistory = localStorage.getItem('fdpos_price_history');
    if(savedPriceHistory) {
        priceHistory = JSON.parse(savedPriceHistory);
    }
}

function savePriceData() {
    localStorage.setItem('fdpos_ingredient_prices', JSON.stringify(ingredientPrices));
    localStorage.setItem('fdpos_price_history', JSON.stringify(priceHistory));
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
  loadPriceData();
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
  savePriceData();
}

// ---------- PRICE MANAGEMENT FUNCTIONS ----------
function getCurrentPricePerGram(ingredientName) {
    if (ingredientName === 'CupSet') {
        return ingredientPrices['CupSet'] || 30;
    }
    const pricePerKg = ingredientPrices[ingredientName] || 0;
    return pricePerKg / 1000;
}

function computeCostForOrder(orderItems) {
    let totalCost = 0;
    for(let item of orderItems) {
        const menuItem = menuItems.find(m => m.id === item.id);
        if(menuItem && menuItem.recipe) {
            for(let [ingredient, amount] of Object.entries(menuItem.recipe)) {
                totalCost += amount * getCurrentPricePerGram(ingredient);
            }
        }
        totalCost += getCurrentPricePerGram('CupSet');
    }
    return totalCost;
}

function deductStock(orderItems) {
  const tempStock = { ...stock };
  for(let item of orderItems) {
    const menuItem = menuItems.find(m => m.id === item.id);
    if(!menuItem || !menuItem.recipe) {
      alert(`Recipe not found for ${item.name}`);
      return false;
    }
    for(let [ingredient, amount] of Object.entries(menuItem.recipe)) {
      if(!tempStock[ingredient]) {
        alert(`${ingredient} not found in stock!`);
        return false;
      }
      if(tempStock[ingredient] < amount) {
        alert(`Insufficient ${ingredient}! Need ${amount}g but only ${tempStock[ingredient]}g available.`);
        return false;
      }
      tempStock[ingredient] -= amount;
    }
    if(!tempStock.CupSet || tempStock.CupSet < 1) {
      alert('Insufficient cups!');
      return false;
    }
    tempStock.CupSet -= 1;
  }
  stock = tempStock;
  saveData();
  return true;
}

function recordPriceChange(ingredientName, oldPrice, newPrice) {
    priceHistory.push({
        date: new Date().toISOString(),
        ingredient: ingredientName,
        oldPrice: oldPrice,
        newPrice: newPrice,
        changedBy: currentRole
    });
    if (priceHistory.length > 100) priceHistory = priceHistory.slice(-100);
    savePriceData();
}

function updateIngredientPrice(ingredientName, newPricePerKg) {
    const oldPrice = ingredientPrices[ingredientName];
    if (oldPrice === newPricePerKg) return false;
    ingredientPrices[ingredientName] = newPricePerKg;
    recordPriceChange(ingredientName, oldPrice, newPricePerKg);
    savePriceData();
    recalculateTodayProfit();
    return true;
}

function recalculateTodayProfit() {
    let totalRevenue = 0;
    let totalCost = 0;
    todaysSales.transactions.forEach(receipt => {
        totalRevenue += receipt.total;
        const items = receipt.items.map(item => {
            const menuItem = menuItems.find(m => m.name === item.name);
            return { id: menuItem?.id, name: item.name, price: item.price };
        }).filter(i => i.id);
        totalCost += computeCostForOrder(items);
    });
    todaysSales.revenue = totalRevenue;
    todaysSales.cost = totalCost;
    todaysSales.profit = totalRevenue - totalCost;
    saveData();
    updateDashboardAndStockViews();
}

// ---------- RENDER FUNCTIONS ----------
function renderTables() {
  const container = document.getElementById('tablesContainer');
  if(!container) return;
  container.innerHTML = '';
  tables.forEach((tableName, idx) => {
    const btn = document.createElement('button');
    btn.className = `table-chip ${currentTable === idx ? 'active' : ''}`;
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
  const takeawayBtn = document.createElement('button');
  takeawayBtn.className = `table-chip ${currentTable === 'takeaway' ? 'active' : ''}`;
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
      ${currentRole === 'admin' ? '<button class="edit-item-btn" data-id="' + item.id + '" style="position:absolute; top:5px; right:5px; background:none; border:none; font-size:1rem; cursor:pointer;">✏️</button>' : ''}
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
  document.querySelectorAll('.dec-qty').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const span = document.getElementById(`qty-${id}`);
      let val = parseInt(span.innerText);
      if(val > 1) span.innerText = val - 1;
    };
  });
  document.querySelectorAll('.inc-qty').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const span = document.getElementById(`qty-${id}`);
      let val = parseInt(span.innerText);
      span.innerText = val + 1;
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
      for(let i = 0; i < qty; i++) {
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
    div.innerHTML = `<span>${item.name}</span><span>LKR ${item.price}</span><button class="remove-item" data-index="${idx}">🗑️</button>`;
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

// ---------- STOCK MANAGEMENT ----------
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
      <div style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button class="rename-stock-btn" data-name="${name}" style="background:#2196F3; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">✏️ Rename</button>
        <button class="edit-stock-btn" data-name="${name}" style="background:#FF9800; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">📝 Set</button>
        <button class="restock-btn" data-name="${name}" style="background:#4CAF50; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">➕ Add</button>
        <button class="reduce-stock-btn" data-name="${name}" style="background:#f44336; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">➖ Remove</button>
      </div>
    `;
    container.appendChild(div);
  }
  const banner = document.getElementById('lowStockBanner');
  if(banner) banner.innerText = lowCount > 0 ? `⚠️ Low stock: ${lowCount} items below threshold` : '✅ Stock levels healthy';
  
  document.querySelectorAll('.edit-stock-btn').forEach(btn => {
    btn.onclick = () => {
      let newVal = prompt(`Enter new quantity for ${btn.dataset.name}:`);
      if(newVal && !isNaN(newVal) && parseInt(newVal) >= 0) {
        stock[btn.dataset.name] = parseInt(newVal);
        saveData();
        renderStockList();
        alert(`✅ ${btn.dataset.name} set to ${newVal}`);
      }
    };
  });
  document.querySelectorAll('.restock-btn').forEach(btn => {
    btn.onclick = () => {
      let addVal = prompt(`Add how much to ${btn.dataset.name}:`);
      if(addVal && !isNaN(addVal) && parseInt(addVal) > 0) {
        stock[btn.dataset.name] += parseInt(addVal);
        saveData();
        renderStockList();
        alert(`✅ Added ${addVal} to ${btn.dataset.name}. New total: ${stock[btn.dataset.name]}`);
      }
    };
  });
  document.querySelectorAll('.reduce-stock-btn').forEach(btn => {
    btn.onclick = () => {
      let removeVal = prompt(`Remove how much from ${btn.dataset.name}? (for waste, spoilage, bad fruit, expired milk)`);
      if(removeVal && !isNaN(removeVal) && parseInt(removeVal) > 0) {
        const currentQty = stock[btn.dataset.name];
        const newQty = currentQty - parseInt(removeVal);
        if(newQty >= 0) {
          stock[btn.dataset.name] = newQty;
          saveData();
          renderStockList();
          alert(`✅ Removed ${removeVal} from ${btn.dataset.name}. Remaining: ${newQty}`);
        } else {
          alert(`❌ Cannot remove more than available! Current stock: ${currentQty}`);
        }
      }
    };
  });
  document.querySelectorAll('.rename-stock-btn').forEach(btn => {
    btn.onclick = () => {
      const oldName = btn.dataset.name;
      let newName = prompt(`Rename "${oldName}" to:`, oldName);
      if(newName && newName !== oldName && newName.trim() !== '') {
        if(stock[newName] !== undefined) {
          alert(`❌ "${newName}" already exists!`);
          return;
        }
        stock[newName] = stock[oldName];
        delete stock[oldName];
        menuItems.forEach(item => {
          if(item.recipe && item.recipe[oldName]) {
            item.recipe[newName] = item.recipe[oldName];
            delete item.recipe[oldName];
          }
        });
        saveData();
        renderStockList();
        renderMenu();
        alert(`✅ Renamed "${oldName}" to "${newName}"`);
      }
    };
  });
}

function addIngredient() {
  let name = prompt('Ingredient name:');
  let qty = prompt('Initial quantity (g/ml/units):');
  if(name && qty && !isNaN(qty) && parseInt(qty) >= 0) {
    if(stock[name]) {
      alert(`❌ "${name}" already exists!`);
      return;
    }
    stock[name] = parseInt(qty);
    let price = prompt(`Set price per kg for ${name} (LKR):`);
    if(price && !isNaN(price) && parseInt(price) > 0) {
      ingredientPrices[name] = parseInt(price);
    } else {
      ingredientPrices[name] = 500;
    }
    saveData();
    renderStockList();
    alert(`✅ Added new ingredient: ${name} with ${qty} units at LKR ${ingredientPrices[name]}/kg`);
  }
}

// ---------- ITEM MANAGEMENT ----------
function openEditItemModal(itemId) {
  const item = menuItems.find(i => i.id === itemId);
  if(!item) return;
  document.getElementById('itemFormTitle').innerText = 'Edit Item';
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemCategory').value = item.category;
  const container = document.getElementById('ingredientsList');
  container.innerHTML = '';
  const allIngredients = Object.keys(stock).filter(i => i !== 'CupSet');
  for(let [ingredient, amount] of Object.entries(item.recipe || {})) {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `
      <select class="ingredient-name">${allIngredients.map(ing => `<option value="${ing}" ${ing === ingredient ? 'selected' : ''}>${ing}</option>`).join('')}</select>
      <input type="number" class="ingredient-amount" value="${amount}" placeholder="Amount" step="1">
      <button type="button" class="remove-ingredient">✖️</button>
    `;
    container.appendChild(div);
  }
  document.querySelectorAll('.remove-ingredient').forEach(btn => {
    btn.onclick = () => btn.parentElement.remove();
  });
  document.getElementById('itemFormModal').style.display = 'block';
}

function saveItemForm(e) {
  e.preventDefault();
  const itemId = document.getElementById('itemId').value;
  const name = document.getElementById('itemName').value;
  const price = parseInt(document.getElementById('itemPrice').value);
  const category = document.getElementById('itemCategory').value;
  const recipe = {};
  let hasValidIngredient = false;
  document.querySelectorAll('#ingredientsList .ingredient-row').forEach(row => {
    const ingredient = row.querySelector('.ingredient-name').value;
    const amount = parseInt(row.querySelector('.ingredient-amount').value);
    if(ingredient && amount > 0) {
      recipe[ingredient] = amount;
      hasValidIngredient = true;
    }
  });
  if(!hasValidIngredient) {
    alert('Please add at least one ingredient with amount > 0!');
    return;
  }
  if(itemId) {
    const index = menuItems.findIndex(i => i.id === itemId);
    if(index !== -1) {
      menuItems[index] = { ...menuItems[index], name, price, category, recipe };
      alert(`✅ Item "${name}" updated successfully!`);
    }
  } else {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    menuItems.push({ id: newId, name, price, category, recipe, active: true });
    alert(`✅ New item "${name}" added successfully!`);
  }
  saveData();
  renderMenu();
  renderItemsList();
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

function renderItemsList() {
  const container = document.getElementById('itemsListContainer');
  if(!container) return;
  container.innerHTML = '';
  menuItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'stock-item';
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <div style="flex:1;">
        <strong>${item.name}</strong><br>
        Price: LKR ${item.price} | Category: ${categories.find(c => c.id === item.category)?.name || 'Juice'}<br>
        <small style="color:#666;">Recipe: ${Object.entries(item.recipe || {}).map(([ing, amt]) => `${ing}:${amt}g`).join(', ')}</small>
      </div>
      <div style="display: flex; gap: 5px;">
        <button class="edit-existing-item-btn" data-id="${item.id}" style="background:#FF9800; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">✏️ Edit</button>
        <button class="delete-item-btn" data-id="${item.id}" style="background:#f44336; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑️ Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
  document.querySelectorAll('.edit-existing-item-btn').forEach(btn => {
    btn.onclick = () => openEditItemModal(btn.dataset.id);
  });
  document.querySelectorAll('.delete-item-btn').forEach(btn => {
    btn.onclick = () => {
      const itemToDelete = menuItems.find(i => i.id === btn.dataset.id);
      if(confirm(`Delete "${itemToDelete?.name}" permanently? This cannot be undone.`)) {
        const index = menuItems.findIndex(i => i.id === btn.dataset.id);
        if(index !== -1) {
          menuItems.splice(index, 1);
          saveData();
          renderMenu();
          renderItemsList();
          alert(`✅ Item deleted successfully!`);
        }
      }
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
  pendingTotal = cart.reduce((s, i) => s + i.price, 0);
  document.getElementById('customerModal').style.display = 'block';
  document.getElementById('customerName').value = '';
}

function generateReceipt(customerName) {
  const cart = pendingCart;
  const total = pendingTotal;
  if(!cart || cart.length === 0) return;
  const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`;
  const tableName = currentTable === 'takeaway' ? 'Takeaway' : tables[currentTable];
  if(!deductStock(cart)) {
    alert('Stock deduction failed!');
    return;
  }
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
  carts[cartKey] = [];
  renderCart();
  saveData();
  updateDashboardAndStockViews();
  renderStockList();
  displayReceipt(receipt);
  pendingCart = null;
  pendingTotal = null;
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

function printReceipt() {
  const receiptContent = document.getElementById('receiptContent').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<html><head><title>Receipt</title></head><body>${receiptContent}</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

function downloadPDF() {
  const element = document.getElementById('receiptContent');
  html2pdf().from(element).save('receipt.pdf');
}

function sendWhatsApp() {
  const receiptText = document.getElementById('receiptContent').innerText;
  window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank');
}

// ---------- TABLE MANAGEMENT ----------
function manageTables() {
  const container = document.getElementById('tablesList');
  container.innerHTML = '';
  tables.forEach((table, idx) => {
    const div = document.createElement('div');
    div.className = 'ingredient-row';
    div.innerHTML = `<input type="text" value="${table}" id="table_${idx}" style="flex:1;"><button class="remove-ingredient" data-idx="${idx}">🗑️</button>`;
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

function showProfitBreakdown() {
  const profitMargin = todaysSales.revenue > 0 ? (todaysSales.profit / todaysSales.revenue * 100) : 0;
  const itemSales = {};
  todaysSales.transactions.forEach(receipt => {
    receipt.items.forEach(item => {
      if (!itemSales[item.name]) itemSales[item.name] = { quantity: 0, revenue: 0 };
      itemSales[item.name].quantity += 1;
      itemSales[item.name].revenue += item.price;
    });
  });
  const topItems = Object.entries(itemSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const profitHTML = `
    <div class="profit-breakdown">
      <h3>📊 Profit Breakdown</h3>
      <div class="profit-bar"><div class="profit-bar-fill" style="width: ${profitMargin}%">${profitMargin.toFixed(1)}% Profit</div></div>
      <div class="profit-stats">
        <div class="profit-stat-card"><div class="label">Revenue</div><div class="value">LKR ${todaysSales.revenue}</div></div>
        <div class="profit-stat-card"><div class="label">Cost</div><div class="value">LKR ${todaysSales.cost}</div></div>
        <div class="profit-stat-card"><div class="label">Profit</div><div class="value">LKR ${todaysSales.profit}</div></div>
      </div>
      ${topItems.length > 0 ? `<h3 style="margin-top:15px;">🏆 Top Selling Items</h3>${topItems.map(([name, data]) => `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee;"><span>${name}</span><span>${data.quantity} sold | LKR ${data.revenue}</span></div>`).join('')}</div>` : ''}
    </div>`;
  document.getElementById('reportDisplay').innerHTML = profitHTML;
}

function showProfitTrend() {
  const last7Days = historyArchive.slice(-7);
  if (last7Days.length === 0) {
    showReport('Not enough data for trend analysis. Close some days first.');
    return;
  }
  const avgProfit = last7Days.reduce((a, b) => a + b.profit, 0) / last7Days.length;
  const lastDayProfit = last7Days[last7Days.length - 1]?.profit || 0;
  const trend = lastDayProfit > avgProfit ? 'up' : (lastDayProfit < avgProfit ? 'down' : 'stable');
  const trendHTML = `<div class="profit-breakdown"><h3>📈 Profit Trend Analysis</h3><div class="profit-stats"><div class="profit-stat-card"><div class="label">Avg Daily Profit</div><div class="value">LKR ${Math.round(avgProfit)}</div></div><div class="profit-stat-card"><div class="label">Last Day Profit</div><div class="value">LKR ${lastDayProfit}</div></div><div class="profit-stat-card"><div class="label">Trend</div><div class="value"><span class="trend-badge trend-${trend}">${trend === 'up' ? '📈 Up' : (trend === 'down' ? '📉 Down' : '➡️ Stable')}</span></div></div></div><h4>Daily Profit History:</h4>${last7Days.map(day => `<div style="display:flex; justify-content:space-between; padding:5px 0;"><span>${day.date}</span><span style="color:${day.profit >= 0 ? '#2e7d32' : '#f44336'}">LKR ${day.profit}</span></div>`).join('')}</div>`;
  document.getElementById('reportDisplay').innerHTML = trendHTML;
}

function showPriceManagement() {
    const modalContent = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close-price">&times;</span>
            <h2>💰 Ingredient Price Management</h2>
            <p style="color: #666; margin-bottom: 1rem;">Prices in LKR per kilogram</p>
            <div class="price-header">
                <button id="bulkPriceUpdateBtn" class="price-btn-bulk">📊 Bulk Update</button>
                <button id="priceHistoryBtn" class="price-btn-bulk" style="background: #2196F3;">📜 Price History</button>
            </div>
            <div class="price-list" id="priceListContainer">
                ${Object.entries(ingredientPrices).map(([name, price]) => `
                    <div class="price-item">
                        <div class="price-item-info">
                            <div class="price-item-name">${name}</div>
                            <div class="price-item-current">Current: LKR ${price}/kg</div>
                        </div>
                        <div class="price-item-actions">
                            <input type="number" id="newprice-${name.replace(/ /g, '_')}" placeholder="New price" step="10" class="price-input">
                            <button class="price-btn-edit" data-ingredient="${name}">Update</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    let priceModal = document.getElementById('priceManagementModal');
    if (!priceModal) {
        priceModal = document.createElement('div');
        priceModal.id = 'priceManagementModal';
        priceModal.className = 'modal';
        document.body.appendChild(priceModal);
    }
    priceModal.innerHTML = modalContent;
    priceModal.style.display = 'block';
    priceModal.querySelector('.close-price').onclick = () => priceModal.style.display = 'none';
    priceModal.querySelectorAll('.price-btn-edit').forEach(btn => {
        btn.onclick = () => {
            const ingredient = btn.dataset.ingredient;
            const inputId = `newprice-${ingredient.replace(/ /g, '_')}`;
            const newPrice = parseFloat(document.getElementById(inputId).value);
            if (isNaN(newPrice) || newPrice < 0) { alert('Please enter a valid price!'); return; }
            if (updateIngredientPrice(ingredient, newPrice)) {
                alert(`✅ ${ingredient} price updated to LKR ${newPrice}/kg`);
                showPriceManagement();
                renderStockList();
                updateDashboardAndStockViews();
            }
        };
    });
    priceModal.querySelector('#bulkPriceUpdateBtn').onclick = () => {
        const percentage = parseFloat(prompt('Enter percentage change (e.g., 10 for +10%, -5 for -5%):'));
        if (!isNaN(percentage)) {
            Object.keys(ingredientPrices).forEach(name => {
                const newPrice = ingredientPrices[name] * (1 + percentage / 100);
                updateIngredientPrice(name, Math.round(newPrice));
            });
            alert(`✅ Applied ${percentage}% change to all ingredients!`);
            showPriceManagement();
            renderStockList();
            updateDashboardAndStockViews();
        }
    };
    priceModal.querySelector('#priceHistoryBtn').onclick = () => {
        if (priceHistory.length === 0) { alert('No price changes recorded yet.'); return; }
        alert(priceHistory.slice(-10).map(p => `${new Date(p.date).toLocaleDateString()}: ${p.ingredient} ${p.oldPrice}→${p.newPrice}`).join('\n'));
    };
}

function dailyReport() { showReport(`📅 DAILY SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━\nRevenue: LKR ${todaysSales.revenue}\nCost: LKR ${todaysSales.cost}\nProfit: LKR ${todaysSales.profit}\nProfit Margin: ${todaysSales.revenue > 0 ? ((todaysSales.profit / todaysSales.revenue) * 100).toFixed(1) : 0}%\nOrders: ${todaysSales.ordersCount}\nCups: ${todaysSales.cupsSold}\n━━━━━━━━━━━━━━━━━━━━━━━━━`); }
function weeklyReport() { showReport(`📆 WEEKLY TREND\n━━━━━━━━━━━━━━━━━━━━━━━━━\nArchived Days: ${historyArchive.length}\nTotal Revenue: LKR ${historyArchive.reduce((a,b)=>a+b.revenue,0)}\nTotal Profit: LKR ${historyArchive.reduce((a,b)=>a+b.profit,0)}\nAvg Daily Profit: LKR ${historyArchive.length ? Math.round(historyArchive.reduce((a,b)=>a+b.profit,0)/historyArchive.length) : 0}\n━━━━━━━━━━━━━━━━━━━━━━━━━`); }
function monthlyReport() { showReport(`📈 MONTHLY SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Revenue: LKR ${historyArchive.reduce((a,b)=>a+b.revenue,0)}\nTotal Profit: LKR ${historyArchive.reduce((a,b)=>a+b.profit,0)}\nDays: ${historyArchive.length}\n━━━━━━━━━━━━━━━━━━━━━━━━━`); }
function showReport(msg) { const el = document.getElementById('reportDisplay'); if(el) el.innerHTML = `<pre>${msg}</pre>`; }
function closeDay() { const summary = { date: todaysSales.date, revenue: todaysSales.revenue, cost: todaysSales.cost, profit: todaysSales.profit, orders: todaysSales.ordersCount, cups: todaysSales.cupsSold }; historyArchive.push(summary); todaysSales = { date: new Date().toDateString(), revenue: 0, cost: 0, profit: 0, ordersCount: 0, cupsSold: 0, transactions: [] }; saveData(); alert('✅ Day closed & archived!'); updateDashboardAndStockViews(); renderHistoryList(); }
function resetDay() { if(confirm('Reset today without archiving?')) { todaysSales = { date: new Date().toDateString(), revenue:0, cost:0, profit:0, ordersCount:0, cupsSold:0, transactions: [] }; saveData(); updateDashboardAndStockViews(); alert('Today reset.'); } }
function renderHistoryList() { const histDiv = document.getElementById('historyList'); if(histDiv) { histDiv.innerHTML = historyArchive.slice().reverse().map(h => `<div class="history-card">📆 ${h.date} | Revenue: LKR ${h.revenue} | Profit: LKR ${h.profit} | Orders: ${h.orders}</div>`).join(''); if(historyArchive.length === 0) histDiv.innerHTML = '<div class="history-card">No archived days yet.</div>'; } }
function resetAllData() { if(confirm('⚠️ WARNING: Reset ALL data? This cannot be undone!')) { localStorage.clear(); location.reload(); } }
function switchTab(tabName) { document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); const selectedTab = document.getElementById(`${tabName}Tab`); if(selectedTab) selectedTab.classList.add('active'); const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`); if(selectedBtn) selectedBtn.classList.add('active'); if(tabName === 'stock') renderStockList(); else if(tabName === 'reports') updateDashboardAndStockViews(); else if(tabName === 'admin') renderHistoryList(); }

// ---------- EVENT LISTENERS ----------
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  if(!localStorage.getItem('fdpos_initialized')) { initializeCarts(); saveData(); localStorage.setItem('fdpos_initialized', 'true'); }
  renderTables(); renderCategories(); renderMenu(); renderCart(); renderStockList(); updateDashboardAndStockViews(); renderHistoryList(); renderItemsList();
  document.getElementById('roleSwitcher')?.addEventListener('change', (e) => { currentRole = e.target.value; renderMenu(); });
  document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', () => switchTab(btn.dataset.tab)); });
  document.getElementById('resetAllBtn')?.addEventListener('click', resetAllData);
  document.getElementById('manageTablesBtn')?.addEventListener('click', manageTables);
  document.getElementById('manageItemsBtn')?.addEventListener('click', () => document.getElementById('itemsModal').style.display = 'block');
  document.getElementById('managePricesBtn')?.addEventListener('click', showPriceManagement);
  document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
  document.getElementById('clearCartBtn')?.addEventListener('click', () => { const cartKey = currentTable === 'takeaway' ? 'takeaway' : `table_${currentTable}`; carts[cartKey] = []; renderCart(); saveData(); });
  document.getElementById('addTableBtn')?.addEventListener('click', addNewTable);
  document.getElementById('saveTablesBtn')?.addEventListener('click', saveTables);
  document.getElementById('addIngredientBtn')?.addEventListener('click', addIngredient);
  document.getElementById('dailyReportBtn')?.addEventListener('click', dailyReport);
  document.getElementById('weeklyReportBtn')?.addEventListener('click', weeklyReport);
  document.getElementById('monthlyReportBtn')?.addEventListener('click', monthlyReport);
  document.getElementById('profitTrendBtn')?.addEventListener('click', showProfitTrend);
  document.getElementById('closeDayBtn')?.addEventListener('click', closeDay);
  document.getElementById('resetDayBtn')?.addEventListener('click', resetDay);
  document.getElementById('stockSearch')?.addEventListener('input', () => renderStockList());
  document.getElementById('printReceiptBtn')?.addEventListener('click', printReceipt);
  document.getElementById('pdfReceiptBtn')?.addEventListener('click', downloadPDF);
  document.getElementById('whatsappReceiptBtn')?.addEventListener('click', sendWhatsApp);
  document.getElementById('confirmCustomerBtn')?.addEventListener('click', () => { const customerName = document.getElementById('customerName').value; if(customerName) generateReceipt(customerName); else alert('Please enter customer name'); });
  document.getElementById('itemForm')?.addEventListener('submit', saveItemForm);
  document.getElementById('addNewItemBtn')?.addEventListener('click', openAddItemModal);
  document.getElementById('addIngredientFieldBtn')?.addEventListener('click', () => { const container = document.getElementById('ingredientsList'); const allIngredients = Object.keys(stock).filter(i => i !== 'CupSet'); const div = document.createElement('div'); div.className = 'ingredient-row'; div.innerHTML = `<select class="ingredient-name">${allIngredients.map(ing => `<option value="${ing}">${ing}</option>`).join('')}</select><input type="number" class="ingredient-amount" placeholder="Amount" step="1"><button type="button" class="remove-ingredient">✖️</button>`; container.appendChild(div); div.querySelector('.remove-ingredient').onclick = () => div.remove(); });
  document.querySelectorAll('.close, .close-tables, .close-items, .close-item-form').forEach(btn => { btn.onclick = () => { document.getElementById('tablesModal').style.display = 'none'; document.getElementById('itemsModal').style.display = 'none'; document.getElementById('itemFormModal').style.display = 'none'; document.getElementById('receiptModal').style.display = 'none'; document.getElementById('customerModal').style.display = 'none'; }; });
});