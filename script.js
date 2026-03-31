class Dashboard {
    constructor() {
        if (!API.isLoggedIn()) { window.location.href = '/login.html'; return; }
        this.user             = API.getUser();
        this.today            = new Date().toISOString().split('T')[0];
        this.goals            = { calories: 2000, protein: 150, carbs: 250, fats: 65 };
        this.todayLog         = { entries: [], totals: { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 } };
        this.allFoods         = [];
        this.filteredFoods    = [];
        this.cart             = [];
        this.currentModalFood = null;
        this.filters          = { search: '', maxCalories: 9999, minProtein: 0 };
        this.foodPanelOpen    = false;
        this.cartPanelOpen    = false;
        this.filterPanelOpen  = false;
        this.init();
    }

    async init() {
        this.renderHeader();
        this.setupLogout();
        this.setupEventListeners();
        try {
            await Promise.all([this.loadProfile(), this.loadTodayLog(), this.loadFoods()]);
            this.updateStreak();
        } catch (err) {
            this.showToast('Error loading data: ' + err.message, 'error');
        }
    }


    getFoodEmoji(name) {
        const n = name.toLowerCase();
        // Drinks
        if (n.includes('tea') || n.includes('chai'))           return '🍵';
        if (n.includes('coffee') || n.includes('espresso') || n.includes('espreso')) return '☕';
        if (n.includes('lassi'))                               return '🥛';
        if (n.includes('milkshake') || n.includes('milk'))     return '🥛';
        if (n.includes('juice') || n.includes('punch'))        return '🧃';
        if (n.includes('lemonade') || n.includes('nimbu'))     return '🍋';
        if (n.includes('mango drink') || n.includes('aam panna')) return '🥭';
        if (n.includes('lassi') || n.includes('chaas'))        return '🥛';
        if (n.includes('water') || n.includes('pani'))         return '💧';
        if (n.includes('cocoa') || n.includes('chocolate'))    return '🍫';
        if (n.includes('beer') || n.includes('wine') || n.includes('alcohol')) return '🍺';
        if (n.includes('soda') || n.includes('cold drink'))    return '🥤';
        // Eggs
        if (n.includes('egg') || n.includes('anda') || n.includes('omelette') || n.includes('omlet')) return '🥚';
        if (n.includes('boiled egg'))                          return '🥚';
        if (n.includes('scrambled') || n.includes('bhurji'))   return '🍳';
        if (n.includes('fried egg'))                           return '🍳';
        if (n.includes('pancake'))                             return '🥞';
        // Bread & Roti
        if (n.includes('chapati') || n.includes('roti'))       return '🫓';
        if (n.includes('paratha') || n.includes('parantha'))   return '🫓';
        if (n.includes('poori') || n.includes('puri'))         return '🫓';
        if (n.includes('naan'))                                return '🫓';
        if (n.includes('bhatura'))                             return '🫓';
        if (n.includes('bread') || n.includes('toast'))        return '🍞';
        if (n.includes('sandwich'))                            return '🥪';
        if (n.includes('makki'))                               return '🌽';
        // Rice & Pulao
        if (n.includes('biryani') || n.includes('biriyani'))   return '🍛';
        if (n.includes('pulao') || n.includes('pilaf'))        return '🍚';
        if (n.includes('rice') || n.includes('chawal'))        return '🍚';
        if (n.includes('khichdi'))                             return '🍲';
        if (n.includes('fried rice'))                          return '🍳';
        // Noodles & Pasta
        if (n.includes('noodle') || n.includes('chowmein') || n.includes('pasta') || n.includes('spaghetti') || n.includes('penne') || n.includes('fettuccine') || n.includes('lasagne') || n.includes('macaroni')) return '🍝';
        // Dal & Lentils
        if (n.includes('dal') || n.includes('dhal') || n.includes('lentil') || n.includes('sambar')) return '🫘';
        if (n.includes('rajma') || n.includes('kidney bean'))  return '🫘';
        if (n.includes('chole') || n.includes('chickpea') || n.includes('channa') || n.includes('chana')) return '🫘';
        if (n.includes('moong') || n.includes('moth') || n.includes('masoor') || n.includes('urad') || n.includes('lobia') || n.includes('soyabean')) return '🫘';
        // Curry & Sabzi
        if (n.includes('paneer'))                              return '🧀';
        if (n.includes('butter masala') || n.includes('makhani')) return '🍛';
        if (n.includes('curry') || n.includes('masala') || n.includes('sabzi') || n.includes('korma') || n.includes('roghan') || n.includes('yakhni')) return '🍛';
        if (n.includes('kadhi'))                               return '🍲';
        if (n.includes('kofta'))                               return '🍢';
        if (n.includes('saag') || n.includes('sarson') || n.includes('spinach') || n.includes('palak')) return '🥬';
        if (n.includes('avial'))                               return '🥗';
        // Snacks & Street food
        if (n.includes('samosa'))                              return '🥟';
        if (n.includes('pakod') || n.includes('pakora'))       return '🧆';
        if (n.includes('bhel') || n.includes('puri'))          return '🍿';
        if (n.includes('vada') || n.includes('wada'))          return '🧆';
        if (n.includes('dosa'))                                return '🥞';
        if (n.includes('idli'))                                return '🫓';
        if (n.includes('uttapam'))                             return '🥞';
        if (n.includes('chaat') || n.includes('chat'))         return '🍿';
        if (n.includes('poha'))                                return '🍚';
        if (n.includes('upma'))                                return '🍚';
        if (n.includes('kaathi roll') || n.includes('kati roll') || n.includes('roll')) return '🌯';
        // Soups & Stocks
        if (n.includes('soup') || n.includes('stock') || n.includes('consomme')) return '🍜';
        // Porridge & Cereals
        if (n.includes('porridge') || n.includes('daliya') || n.includes('oatmeal') || n.includes('oats')) return '🥣';
        if (n.includes('cornflake') || n.includes('flake') || n.includes('murmura') || n.includes('puffed')) return '🥣';
        // Meat & Poultry
        if (n.includes('chicken'))                             return '🍗';
        if (n.includes('mutton') || n.includes('lamb'))        return '🍖';
        if (n.includes('keema') || n.includes('mince'))        return '🥩';
        if (n.includes('fish') || n.includes('tuna') || n.includes('salmon') || n.includes('prawn') || n.includes('shrimp')) return '🐟';
        if (n.includes('salami') || n.includes('sausage') || n.includes('ham') || n.includes('bacon')) return '🥓';
        if (n.includes('kebab') || n.includes('tikka') || n.includes('tandoori')) return '🍢';
        if (n.includes('shammi') || n.includes('seekh'))       return '🍢';
        if (n.includes('scotch egg'))                          return '🥚';
        // Vegetables
        if (n.includes('potato') || n.includes('aloo'))        return '🥔';
        if (n.includes('tomato') || n.includes('tamatar'))     return '🍅';
        if (n.includes('brinjal') || n.includes('baingan') || n.includes('eggplant')) return '🍆';
        if (n.includes('mushroom'))                            return '🍄';
        if (n.includes('okra') || n.includes('bhindi'))        return '🌿';
        if (n.includes('pea') || n.includes('matar'))          return '🫛';
        if (n.includes('cauliflower') || n.includes('gobhi'))  return '🥦';
        if (n.includes('cabbage') || n.includes('pattagobhi')) return '🥬';
        if (n.includes('carrot') || n.includes('gajar'))       return '🥕';
        if (n.includes('capsicum') || n.includes('shimla mirch') || n.includes('pepper')) return '🫑';
        if (n.includes('cucumber') || n.includes('kheera'))    return '🥒';
        if (n.includes('corn') || n.includes('makka'))         return '🌽';
        if (n.includes('radish') || n.includes('mooli'))       return '🌿';
        if (n.includes('jackfruit') || n.includes('kathal'))   return '🍈';
        if (n.includes('lotus stem') || n.includes('kamal'))   return '🌸';
        if (n.includes('turnip') || n.includes('shalgam'))     return '🌿';
        if (n.includes('gourd') || n.includes('lauki') || n.includes('ghiya') || n.includes('tinda')) return '🥒';
        if (n.includes('raw banana') || n.includes('raw papaya')) return '🍌';
        if (n.includes('methi') || n.includes('fenugreek'))    return '🌿';
        if (n.includes('onion') || n.includes('pyaz'))         return '🧅';
        if (n.includes('garlic') || n.includes('lehsun'))      return '🧄';
        if (n.includes('vegetable') || n.includes('sabzi'))    return '🥗';
        // Fruits
        if (n.includes('mango') || n.includes('aam'))          return '🥭';
        if (n.includes('banana') || n.includes('kela'))        return '🍌';
        if (n.includes('apple') || n.includes('seb'))          return '🍎';
        if (n.includes('orange') || n.includes('narangi'))     return '🍊';
        if (n.includes('pineapple') || n.includes('ananas'))   return '🍍';
        if (n.includes('watermelon'))                          return '🍉';
        if (n.includes('grapes') || n.includes('angur'))       return '🍇';
        if (n.includes('papaya'))                              return '🍈';
        if (n.includes('coconut') || n.includes('nariyal'))    return '🥥';
        if (n.includes('guava') || n.includes('amrood'))       return '🍐';
        if (n.includes('lemon') || n.includes('nimbu'))        return '🍋';
        if (n.includes('fruit'))                               return '🍑';
        // Dairy
        if (n.includes('curd') || n.includes('dahi') || n.includes('yogurt')) return '🥛';
        if (n.includes('cheese'))                              return '🧀';
        if (n.includes('butter') || n.includes('makhan'))      return '🧈';
        if (n.includes('ghee'))                                return '🫙';
        if (n.includes('cream'))                               return '🥛';
        if (n.includes('ice cream'))                           return '🍦';
        // Nuts & Seeds
        if (n.includes('almond') || n.includes('badam'))       return '🌰';
        if (n.includes('peanut') || n.includes('moongfali'))   return '🥜';
        if (n.includes('cashew') || n.includes('kaju'))        return '🌰';
        if (n.includes('walnut') || n.includes('akhrot'))      return '🌰';
        if (n.includes('nut'))                                 return '🥜';
        if (n.includes('sesame') || n.includes('til'))         return '🌾';
        // Sweets & Desserts
        if (n.includes('gulab jamun'))                         return '🍮';
        if (n.includes('halwa') || n.includes('kheer') || n.includes('payasam')) return '🍮';
        if (n.includes('ladoo') || n.includes('laddoo'))       return '🟡';
        if (n.includes('barfi') || n.includes('burfi'))        return '🍬';
        if (n.includes('jalebi'))                              return '🍩';
        if (n.includes('rasgulla') || n.includes('rasmalai'))  return '🍮';
        if (n.includes('khoa') || n.includes('mawa'))          return '🍮';
        if (n.includes('sweet') || n.includes('meetha') || n.includes('dessert')) return '🍮';
        if (n.includes('jam'))                                 return '🫙';
        if (n.includes('cake') || n.includes('pie'))           return '🎂';
        if (n.includes('biscuit') || n.includes('cookie'))     return '🍪';
        // Misc proteins & health
        if (n.includes('whey') || n.includes('protein shake')) return '💪';
        if (n.includes('stock'))                               return '🍲';
        // Default
        return '🍽️';
    }

    renderHeader() {
        document.getElementById('userName').textContent = this.user?.name || 'User';
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    setupLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.addEventListener('click', () => { API.clearSession(); window.location.href = '/login.html'; });
    }

    setupEventListeners() {
        document.getElementById('addFoodBtn').addEventListener('click', () => this.toggleFoodPanel());
        document.getElementById('searchFood').addEventListener('input', e => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filterToggle').addEventListener('click', () => this.toggleFilterPanel());
        document.getElementById('filterCalorie').addEventListener('input', e => {
            document.getElementById('filterCalorieVal').textContent = e.target.value;
        });
        document.getElementById('filterProtein').addEventListener('input', e => {
            document.getElementById('filterProteinVal').textContent = e.target.value;
        });
        document.getElementById('filterSave').addEventListener('click',  () => this.applyFiltersFromUI());
        document.getElementById('filterReset').addEventListener('click', () => this.resetFilters());
        document.getElementById('cartBtn').addEventListener('click',     () => this.toggleCartPanel());
        document.getElementById('addMoreBtn').addEventListener('click',  () => this.toggleCartPanel());
        document.getElementById('clearCartBtn').addEventListener('click',() => this.clearCart());
        document.getElementById('confirmLogBtn').addEventListener('click',() => this.confirmLog());
        document.getElementById('modalClose').addEventListener('click',  () => this.closeModal());
        document.getElementById('modalBackdrop').addEventListener('click',() => this.closeModal());
        document.getElementById('modalAddBtn').addEventListener('click', () => {
            if (this.currentModalFood) { this.addToCart(this.currentModalFood); this.closeModal(); }
        });
    }

    async loadProfile() {
        try {
            const p = await API.profile.get();
            if (p && p.recommended_calories) {
                this.goals = {
                    calories: p.recommended_calories,
                    protein:  p.recommended_protein,
                    carbs:    p.recommended_carbs,
                    fats:     p.recommended_fats
                };
            }
        } catch {}
        document.getElementById('caloriesTarget').textContent = this.goals.calories;
        document.getElementById('proteinTarget').textContent  = this.goals.protein;
        document.getElementById('carbsTarget').textContent    = this.goals.carbs;
        document.getElementById('fatsTarget').textContent     = this.goals.fats;
    }

    async loadTodayLog() {
        try {
            this.todayLog = await API.logs.get(this.today);
        } catch {
            this.todayLog = { entries: [], totals: { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 } };
        }
        this.updateDisplay();
        this.renderFoodList();
        this.checkAlerts();
        this.renderRecommendations();
    }

    async loadFoods() {
        try {
            const { foods } = await API.foods.list({ limit: 500 });
            this.allFoods      = foods;
            this.filteredFoods = foods;
            this.renderFoodGrid();
        } catch (err) {
            document.getElementById('foodGrid').innerHTML =
                `<div class="empty-state" style="grid-column:1/-1">Could not load foods: ${err.message}</div>`;
        }
    }

    applyFilters() {
        const s = this.filters.search.toLowerCase();
        this.filteredFoods = this.allFoods.filter(f => {
            const matchSearch = !s || f.food_name.toLowerCase().includes(s);
            const matchCal    = f.energy_kcal <= this.filters.maxCalories;
            const matchProt   = f.protein_g   >= this.filters.minProtein;
            return matchSearch && matchCal && matchProt;
        });
        this.renderFoodGrid();
    }

    applyFiltersFromUI() {
        this.filters.maxCalories = parseInt(document.getElementById('filterCalorie').value) || 9999;
        this.filters.minProtein  = parseInt(document.getElementById('filterProtein').value)  || 0;
        this.applyFilters();
        this.toggleFilterPanel();
    }

    resetFilters() {
        this.filters = { search: '', maxCalories: 9999, minProtein: 0 };
        document.getElementById('searchFood').value = '';
        document.getElementById('filterCalorie').value = 900;
        document.getElementById('filterCalorieVal').textContent = '900';
        document.getElementById('filterProtein').value = 0;
        document.getElementById('filterProteinVal').textContent = '0';
        this.filteredFoods = this.allFoods;
        this.renderFoodGrid();
    }

    renderFoodGrid() {
        const grid = document.getElementById('foodGrid');
        document.getElementById('totalItems').textContent = this.filteredFoods.length;

        if (this.filteredFoods.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No foods match your search.</div>';
            return;
        }

        grid.innerHTML = this.filteredFoods.map(f => `
            <div class="food-card">
                <button class="add-btn" data-id="${f.id}" title="Add to cart">＋</button>
                <button class="info-btn" data-id="${f.id}" title="View details">ℹ</button>
                <div class="food-emoji">${this.getFoodEmoji(f.food_name)}</div>
                <div class="food-name">${f.food_name}</div>
                <div class="food-cal">${Math.round(f.energy_kcal)} kcal</div>
            </div>
        `).join('');

        grid.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const food = this.allFoods.find(f => f.id == btn.dataset.id);
                if (food) this.addToCart(food);
            });
        });
        grid.querySelectorAll('.info-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const food = this.allFoods.find(f => f.id == btn.dataset.id);
                if (food) this.showFoodModal(food);
            });
        });
    }

    addToCart(food) {
        const existing = this.cart.find(i => i.id === food.id);
        if (existing) existing.qty += 1;
        else this.cart.push({ ...food, qty: 1 });
        this.updateCartCount();
        this.showToast(`🛒 ${food.food_name} added to cart`);
        if (this.cartPanelOpen) this.renderCartTable();
    }

    updateCartCount() {
        document.getElementById('cartCount').textContent = this.cart.reduce((s, i) => s + i.qty, 0);
    }

    toggleFoodPanel() {
        this.foodPanelOpen = !this.foodPanelOpen;
        document.getElementById('foodPanel').style.display = this.foodPanelOpen ? 'block' : 'none';
        if (!this.foodPanelOpen) {
            this.cartPanelOpen   = false;
            this.filterPanelOpen = false;
            document.getElementById('cartPanel').style.display   = 'none';
            document.getElementById('filterPanel').style.display = 'none';
        }
    }

    toggleFilterPanel() {
        this.filterPanelOpen = !this.filterPanelOpen;
        document.getElementById('filterPanel').style.display = this.filterPanelOpen ? 'grid' : 'none';
        document.getElementById('filterToggle').classList.toggle('active', this.filterPanelOpen);
    }

    toggleCartPanel() {
        this.cartPanelOpen = !this.cartPanelOpen;
        document.getElementById('cartPanel').style.display = this.cartPanelOpen ? 'block' : 'none';
        if (this.cartPanelOpen) this.renderCartTable();
    }

    renderCartTable() {
        const tbody = document.getElementById('cartTableBody');
        const tfoot = document.getElementById('cartTableFoot');

        if (this.cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-4);padding:1.5rem">🛒 Cart is empty — add some foods!</td></tr>';
            tfoot.innerHTML = '';
            return;
        }

        let totCal = 0, totProt = 0, totCarb = 0, totFat = 0;

        tbody.innerHTML = this.cart.map((item, idx) => {
            const cal  = Math.round(item.energy_kcal * item.qty);
            const prot = +(item.protein_g * item.qty).toFixed(1);
            const carb = +(item.carb_g    * item.qty).toFixed(1);
            const fat  = +(item.fat_g     * item.qty).toFixed(1);
            totCal += cal; totProt += prot; totCarb += carb; totFat += fat;

            return `<tr>
                <td style="color:var(--ink-4);font-size:0.85rem">${idx + 1}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem">
                        <span style="font-size:1.6rem;line-height:1;flex-shrink:0">${this.getFoodEmoji(item.food_name)}</span>
                        <span style="font-weight:600">${item.food_name}</span>
                    </div>
                </td>
                <td>
                    <div class="cart-qty">
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                </td>
                <td><span class="cart-badge cal-badge">🔥 ${cal} kcal</span></td>
                <td><span class="cart-badge prot-badge">💪 ${prot}g</span></td>
                <td><span class="cart-badge carb-badge">🌾 ${carb}g</span></td>
                <td><span class="cart-badge fat-badge">🥑 ${fat}g</span></td>
                <td>
                    <button class="remove-row-btn" data-id="${item.id}" title="Remove">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        tfoot.innerHTML = `<tr class="cart-total-row">
            <td colspan="3">📊 <strong>Total (${this.cart.reduce((s,i) => s+i.qty, 0)} items)</strong></td>
            <td><strong>🔥 ${Math.round(totCal)} kcal</strong></td>
            <td><strong>💪 ${totProt.toFixed(1)}g</strong></td>
            <td><strong>🌾 ${totCarb.toFixed(1)}g</strong></td>
            <td><strong>🥑 ${totFat.toFixed(1)}g</strong></td>
            <td></td>
        </tr>`;

        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = this.cart.find(i => i.id == btn.dataset.id);
                if (item) {
                    item.qty = Math.max(1, item.qty + parseInt(btn.dataset.delta));
                    this.updateCartCount();
                    this.renderCartTable();
                }
            });
        });
        document.querySelectorAll('.remove-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.cart = this.cart.filter(i => i.id != btn.dataset.id);
                this.updateCartCount();
                this.renderCartTable();
                this.showToast('Item removed from cart', 'warning');
            });
        });
    }

    clearCart() {
        this.cart = [];
        this.updateCartCount();
        this.renderCartTable();
        this.showToast('🗑️ Cart cleared', 'warning');
    }

    async confirmLog() {
        if (this.cart.length === 0) { this.showToast('🛒 Cart is empty!', 'warning'); return; }
        const btn = document.getElementById('confirmLogBtn');
        btn.disabled    = true;
        btn.textContent = '⏳ Saving…';

        try {
            // Send entire cart in ONE batch request → inserts into daily_logs + updates daily_summary
            const items = this.cart.map(i => ({ food_item_id: i.id, quantity: i.qty }));
            await API.logs.addBatch(items, this.today);

            const count = this.cart.reduce((s, i) => s + i.qty, 0);
            this.cart = [];
            this.updateCartCount();
            this.cartPanelOpen = false;
            this.foodPanelOpen = false;
            document.getElementById('cartPanel').style.display = 'none';
            document.getElementById('foodPanel').style.display = 'none';

            await this.loadTodayLog();
            await this.updateStreak();
            this.showToast(`✅ Logged ${count} item${count > 1 ? 's' : ''} successfully!`, 'success');
        } catch (err) {
            this.showToast('❌ Error saving log: ' + err.message, 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = '✔ Confirm Log';
        }
    }

    showFoodModal(food) {
        this.currentModalFood = food;
        document.getElementById('modalHero').innerHTML =
            `<div class="modal-emoji-hero">${this.getFoodEmoji(food.food_name)}</div>`;
        document.getElementById('modalName').textContent = food.food_name;
        const badge = document.getElementById('modalType');
        badge.textContent = food.serving_unit ? `per ${food.serving_unit}` : 'per 100g';
        badge.className   = 'modal-type-badge veg';
        document.getElementById('modalCalories').textContent = `${Math.round(food.unit_kcal || food.energy_kcal)} kcal`;
        document.getElementById('modalProtein').textContent  = `${(food.unit_protein || food.protein_g).toFixed(1)}g`;
        document.getElementById('modalCarbs').textContent    = `${(food.unit_carb    || food.carb_g).toFixed(1)}g`;
        document.getElementById('modalFats').textContent     = `${(food.unit_fat     || food.fat_g).toFixed(1)}g`;
        document.getElementById('foodModal').style.display   = 'flex';
    }

    closeModal() {
        document.getElementById('foodModal').style.display = 'none';
        this.currentModalFood = null;
    }

    updateDisplay() {
        const t = this.todayLog.totals;
        const vals = {
            calories: Math.round(t.total_calories || 0),
            protein:  Math.round(t.total_protein  || 0),
            carbs:    Math.round(t.total_carbs    || 0),
            fats:     Math.round(t.total_fats     || 0)
        };
        document.getElementById('caloriesConsumed').textContent = vals.calories;
        document.getElementById('proteinConsumed').textContent  = vals.protein;
        document.getElementById('carbsConsumed').textContent    = vals.carbs;
        document.getElementById('fatsConsumed').textContent     = vals.fats;

        this.updateProgressBar('calories', vals.calories, this.goals.calories);
        this.updateProgressBar('protein',  vals.protein,  this.goals.protein);
        this.updateProgressBar('carbs',    vals.carbs,    this.goals.carbs);
        this.updateProgressBar('fats',     vals.fats,     this.goals.fats);

        document.getElementById('caloriesRemaining').textContent = `${Math.max(0, this.goals.calories - vals.calories)} kcal remaining`;
        document.getElementById('proteinRemaining').textContent  = `${Math.max(0, this.goals.protein  - vals.protein)}g remaining`;
        document.getElementById('carbsRemaining').textContent    = `${Math.max(0, this.goals.carbs    - vals.carbs)}g remaining`;
        document.getElementById('fatsRemaining').textContent     = `${Math.max(0, this.goals.fats     - vals.fats)}g remaining`;
    }

    updateProgressBar(type, consumed, target) {
        const pct = Math.min(100, (consumed / (target || 1)) * 100);
        const bar = document.getElementById(`${type}Progress`);
        bar.style.width = pct + '%';
        bar.classList.toggle('over', consumed > target);
    }

    renderFoodList() {
        const list    = document.getElementById('foodList');
        const entries = this.todayLog.entries || [];
        if (entries.length === 0) {
            list.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🍽️</span>No foods logged yet. Click "Add Food" to get started.</div>`;
            return;
        }
        list.innerHTML = entries.map(e => `
            <div class="food-item">
                <span class="food-item-emoji" style="font-size:2rem;line-height:1;flex-shrink:0;width:40px;text-align:center">${this.getFoodEmoji(e.food_name)}</span>
                <div class="food-item-info">
                    <div class="food-item-name">
                        ${e.food_name}${e.quantity > 1 ? ` <span style="color:var(--ink-4);font-size:0.8rem">×${e.quantity}</span>` : ''}
                    </div>
                    <div class="food-item-nutrients">
                        🔥 ${Math.round(e.total_calories)} kcal &nbsp;·&nbsp;
                        💪 ${(+e.total_protein).toFixed(1)}g protein &nbsp;·&nbsp;
                        🌾 ${(+e.total_carbs).toFixed(1)}g carbs &nbsp;·&nbsp;
                        🥑 ${(+e.total_fats).toFixed(1)}g fat
                    </div>
                </div>
                <button class="delete-btn" data-log-id="${e.id}">🗑️ Remove</button>
            </div>
        `).join('');

        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteEntry(btn.dataset.logId, btn));
        });
    }

    async deleteEntry(logId, btn) {
        btn.disabled    = true;
        btn.textContent = '⏳';
        try {
            await API.logs.remove(logId);
            await this.loadTodayLog();
        } catch (err) {
            this.showToast('Could not remove entry: ' + err.message, 'error');
            btn.disabled    = false;
            btn.textContent = '🗑️ Remove';
        }
    }

    checkAlerts() {
        const container = document.getElementById('alertContainer');
        const t   = this.todayLog.totals || {};
        const cal  = t.total_calories || 0;
        const prot = t.total_protein  || 0;
        const g    = this.goals;
        const alerts = [];

        if (cal > g.calories * 1.15)
            alerts.push({ type: 'danger',  icon: '⚠️', msg: `Exceeded calorie goal by ${Math.round(cal - g.calories)} kcal. Try lighter meals for the rest of the day.` });
        else if (cal > g.calories)
            alerts.push({ type: 'warning', icon: '⚡', msg: `You've just reached your daily calorie goal!` });
        else if (cal > g.calories * 0.9)
            alerts.push({ type: 'info',    icon: 'ℹ️', msg: `Only ${Math.round(g.calories - cal)} kcal left in your daily budget.` });

        if (prot < g.protein * 0.5 && cal > 400)
            alerts.push({ type: 'warning', icon: '💪', msg: `Protein is low (${Math.round(prot)}g of ${g.protein}g). Try adding dal, paneer, or eggs.` });

        container.innerHTML = alerts.map(a =>
            `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><span>${a.msg}</span></div>`
        ).join('');
    }

    renderRecommendations() {
        const section = document.getElementById('recommendationSection');
        const content = document.getElementById('recommendationContent');
        const cal  = this.todayLog.totals?.total_calories || 0;
        const prot = this.todayLog.totals?.total_protein  || 0;
        const g    = this.goals;

        if (cal < 200) { section.style.display = 'none'; return; }
        section.style.display = 'block';

        const recs = [];
        if (cal > g.calories) {
            recs.push({ title: '🏃 Burn it off', items: ['30 min brisk walk (~150 kcal)', '20 min cycling (~180 kcal)', '15 min jump rope (~200 kcal)', '45 min yoga (~130 kcal)'] });
        } else if (cal < g.calories * 0.6) {
            recs.push({ title: '🍽️ Eat more today', items: ['A handful of mixed nuts (+185 kcal)', 'Banana with peanut butter (+285 kcal)', 'Milk smoothie (+150 kcal)', 'Bowl of oats (+200 kcal)'] });
        }
        if (prot < g.protein * 0.7) {
            recs.push({ title: '💪 Boost protein', items: ['2 boiled eggs (+12g)', 'Greek yogurt / dahi (+17g)', '100g paneer (+18g)', 'Dal tadka bowl (+10g)'] });
        }
        if (recs.length === 0) {
            recs.push({ title: '🌟 On track!', items: ['Great balanced macros today', 'Drink 8 glasses of water', 'Keep the streak going!', 'Consider a 15-min evening walk'] });
        }

        content.innerHTML = recs.map(r => `
            <div class="rec-card">
                <p class="rec-card-title">${r.title}</p>
                <ul class="rec-list">${r.items.map(i => `<li>• ${i}</li>`).join('')}</ul>
            </div>`).join('');
    }

    async updateStreak() {
        try {
            const { streak } = await API.analytics.streak();
            document.getElementById('streakLabel').textContent = `${streak} day streak`;
        } catch {}
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className   = `toast show ${type}`;
        clearTimeout(this._t);
        this._t = setTimeout(() => toast.classList.remove('show'), 2800);
    }
}

document.addEventListener('DOMContentLoaded', () => { new Dashboard(); });
