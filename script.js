const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// We save audio prefs in currentUser state
let currentUser = {
    username: 'Guest',
    level: 1,
    xp: 0,
    nextXp: 100,
    coins: 0,
    streak: 0,
    isLoggedIn: false,
    settings: { bgm: true, sfx: true } // Default is BGM ON
};

let users = [];

function playSFX(type) {
    if (currentUser.settings && !currentUser.settings.sfx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}
// Mock Mission Data
const missionsData = {
    'airport': {
        id: 'airport',
        title: 'Airport Check-In',
        description: 'You are at the international airport. Talk to the staff to check in your baggage and get your boarding pass.',
        difficulty: 'Beginner',
        xpReward: 100,
        timeEst: '3 Mins',
        icon: 'fa-plane'
    },
    'restaurant': {
        id: 'restaurant',
        title: 'Ordering Food',
        description: 'You are at a fancy restaurant. Order your meal and ask about the menu items.',
        difficulty: 'Intermediate',
        xpReward: 150,
        timeEst: '5 Mins',
        icon: 'fa-utensils'
    },
    'coffee_shop': {
        id: 'coffee_shop',
        title: 'Coffee Shop Order',
        description: 'Practice ordering coffee in a busy cafe.',
        difficulty: 'Beginner',
        xpReward: 50,
        timeEst: '2 Mins',
        icon: 'fa-mug-hot'
    },
    'office': {
        id: 'office',
        title: 'Office Presentation',
        description: 'You are presenting a report at the office. Talk to your boss.',
        difficulty: 'Advanced',
        xpReward: 200,
        timeEst: '7 Mins',
        icon: 'fa-building'
    },
    'architect': {
        id: 'architect',
        title: 'The Blueprint Decoder',
        description: 'Read the spatial instructions and build the facility.',
        difficulty: 'Expert',
        xpReward: 300,
        timeEst: '10 Mins',
        icon: 'fa-helmet-safety'
    },
    'chemistry': {
        id: 'chemistry',
        title: 'The Chemistry Lab',
        description: 'Solve the complex English conditional recipe to brew the potion.',
        difficulty: 'Expert',
        xpReward: 400,
        timeEst: '12 Mins',
        icon: 'fa-flask'
    },
    'courier': {
        id: 'courier',
        title: 'The Courier',
        description: 'Draw the correct delivery route based on GPS directions.',
        difficulty: 'Advanced',
        xpReward: 350,
        timeEst: '9 Mins',
        icon: 'fa-truck-fast'
    }
};

// Immediately protect pages before DOM loads to prevent UI flash
(function checkAuthEarly() {
    const saved = localStorage.getItem('emh_user');
    let isLoggedIn = false;
    if (saved) {
        try {
            const userState = JSON.parse(saved);
            isLoggedIn = userState.isLoggedIn;
        } catch (e) { }
    }

    const path = window.location.pathname;
    const protectedPages = ['dashboard.html', 'map.html', 'gameplay.html', 'result.html', 'achievements.html', 'shop.html', 'settings.html', 'daily_challenge.html'];
    const isProtected = protectedPages.some(p => path.includes(p));

    if (isProtected && !isLoggedIn) {
        window.location.href = 'index.html';
    }
})();

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadUser();
    loadUsers();

    if (currentUser.isLoggedIn) {
        setupProfileHeader();
        applyCosmetics();
    }

    const path = window.location.pathname;
    initPageScripts(path);
});

// SPA Route Init
function initPageScripts(page) {
    if (page.includes('dashboard.html')) {
        updateDashboardUI();
        initFlashcards();
    } else if (page.includes('gameplay.html')) {
        setupGameplay();
    } else if (page.includes('result.html')) {
        setupResult();
    } else if (page.includes('email_triage.html')) {
        initTriageGame();
    } else if (page.includes('shop.html')) {
        updateShopUI();
    } else if (page.includes('daily_challenge.html')) {
        initToneGame();
    } else if (page.includes('settings.html')) {
        setupEditProfileUI();
    } else if (page.includes('map.html')) {
        initMapProgression();
    } else if (page.includes('achievements.html')) {
        updateAchievementsUI();
    }
}

// Ensure first interaction starts audio
document.body.addEventListener('click', () => {
    if (currentUser.settings && !currentUser.settings.bgm) return;
    if (!isBgmPlaying) {
        bgmAudio.play().catch(e => console.log('Autoplay blocked:', e));
        isBgmPlaying = true;
    }
});

// --- NAVIGATION ---
function navigateTo(page) {
    playSFX('click');

    // Route Protection
    const protectedPages = ['dashboard', 'map', 'settings', 'profile', 'gameplay', 'result', 'shop', 'email_triage'];
    const isProtected = protectedPages.some(p => page.includes(p));
    if (isProtected && !currentUser.isLoggedIn) {
        page = 'index.html';
    }

    // Instant navigation without artificial delay
    window.location.href = page;
}

// --- SCROLLING ---
function scrollToSection(id) {
    playSFX('click');
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    } else {
        navigateTo('index.html').then(() => {
            setTimeout(() => {
                const newEl = document.getElementById(id);
                if (newEl) newEl.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        });
    }
}

function openAboutModal() {
    playSFX('click');
    const modal = document.getElementById('about-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeAboutModal() {
    playSFX('click');
    const modal = document.getElementById('about-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// --- FILE UPLOAD UI ---
function updateFileName(input) {
    const wrapper = input.closest('.file-upload-wrapper');
    const nameDisplay = wrapper.querySelector('.file-name-display');
    if (input.files && input.files.length > 0) {
        nameDisplay.innerText = input.files[0].name;

        // Update Preview for edit profile
        if (input.id === 'edit-profile-pic') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('new-avatar-preview');
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.opacity = '1';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    } else {
        nameDisplay.innerText = 'No file chosen';
        if (input.id === 'edit-profile-pic') {
            const previewImg = document.getElementById('new-avatar-preview');
            if (previewImg) {
                previewImg.src = currentUser.profilePic || 'https://via.placeholder.com/80/1e293b/94a3b8?text=User';
                previewImg.style.opacity = '0.5';
            }
        }
    }
}

// --- IMAGE RESIZER ---
function resizeImage(file, maxSize = 200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- AUTHENTICATION ---
async function handleRegister(event) {
    event.preventDefault();
    const emailInput = document.getElementById('reg-email').value;
    const usernameInput = document.getElementById('reg-username').value;
    const ageInput = document.getElementById('reg-age').value;
    const passwordInput = document.getElementById('reg-password').value;
    const fileInput = document.getElementById('reg-profile-pic').files[0];

    if (usernameInput.trim() !== '' && passwordInput.trim() !== '' && emailInput.trim() !== '') {
        const exists = users.find(u => u.username === usernameInput);
        if (exists) {
            alert('Username already exists!');
            return;
        }

        let profilePicData = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + usernameInput;
        if (fileInput) {
            try {
                profilePicData = await resizeImage(fileInput);
            } catch (e) {
                console.error("Failed to process image", e);
            }
        }

        const newUser = {
            email: emailInput,
            username: usernameInput,
            age: ageInput,
            password: passwordInput,
            profilePic: profilePicData,
            level: 1,
            xp: 0,
            nextXp: 100,
            coins: 0,
            streak: 0,
            inventory: [],
            activeTheme: 'default',
            activeBorder: 'default'
        };
        users.push(newUser);
        saveUsers();

        // Show Placement Test instead of redirecting
        showPlacementTest(usernameInput);
    }
}

function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    if (usernameInput.trim() !== '' && passwordInput.trim() !== '') {
        const foundUser = users.find(u => u.username === usernameInput && u.password === passwordInput);

        if (foundUser) {
            currentUser = { ...foundUser, isLoggedIn: true, streak: 1 };
            saveUser();

            // Check level-based achievements (e.g. from placement test)
            if (currentUser.level >= 5) unlockAchievement('ach_level_5');
            if (currentUser.level >= 10) unlockAchievement('ach_level_10');
            if (currentUser.level >= 20) unlockAchievement('ach_level_20');

            navigateTo('dashboard.html');
        } else {
            alert('Invalid username or password!');
        }
    }
}

function logout() {
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = { ...currentUser };
        delete users[userIndex].isLoggedIn;
        saveUsers();
    }

    currentUser.isLoggedIn = false;
    saveUser();
    navigateTo('index.html');
}

// --- PROFILE EDIT ---
function setupEditProfileUI() {
    const editUsername = document.getElementById('edit-username');
    if (editUsername) editUsername.value = currentUser.username;

    const editEmail = document.getElementById('edit-email');
    if (editEmail) editEmail.value = currentUser.email || '';

    const editAge = document.getElementById('edit-age');
    if (editAge) editAge.value = currentUser.age || '';

    const currentPreview = document.getElementById('current-avatar-preview');
    if (currentPreview) {
        currentPreview.src = currentUser.profilePic || 'https://via.placeholder.com/80/1e293b/94a3b8?text=User';
    }

    const newPreview = document.getElementById('new-avatar-preview');
    if (newPreview) {
        newPreview.src = currentUser.profilePic || 'https://via.placeholder.com/80/1e293b/94a3b8?text=User';
        newPreview.style.opacity = '0.5';
    }
}

async function handleEditProfile(event) {
    event.preventDefault();
    const newUsername = document.getElementById('edit-username').value;
    const newEmail = document.getElementById('edit-email').value;
    const newAge = document.getElementById('edit-age').value;
    const fileInput = document.getElementById('edit-profile-pic').files[0];

    if (newUsername.trim() !== '') {
        // Check if username taken by someone else
        if (newUsername !== currentUser.username) {
            const exists = users.find(u => u.username === newUsername);
            if (exists) {
                alert('Username already taken!');
                return;
            }
        }

        let newProfilePic = currentUser.profilePic;
        if (fileInput) {
            try {
                newProfilePic = await resizeImage(fileInput);
            } catch (e) {
                console.error("Failed to process image", e);
            }
        }

        // Update in users array
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].username = newUsername;
            users[userIndex].email = newEmail;
            users[userIndex].age = newAge;
            users[userIndex].profilePic = newProfilePic;
        }

        // Update current user
        currentUser.username = newUsername;
        currentUser.email = newEmail;
        currentUser.age = newAge;
        currentUser.profilePic = newProfilePic;
        saveUser();
        saveUsers();

        alert('Profile updated successfully!');

        // Refresh UI
        setupProfileHeader();
    }
}

// --- UI UPDATES ---
function updateDashboardUI() {
    const dashUsername = document.getElementById('dash-username');
    if (dashUsername) dashUsername.innerText = currentUser.username;

    const dashLevel = document.getElementById('dash-level');
    if (dashLevel) dashLevel.innerText = currentUser.level;

    const streakEls = document.querySelectorAll('#dash-streak');
    streakEls.forEach(el => el.innerText = currentUser.streak);

    const coinsEls = document.querySelectorAll('#dash-coins');
    coinsEls.forEach(el => el.innerText = currentUser.coins);

    updateProgressUI();

    // Inject Profile Header & Modal
    setupProfileHeader();
}

function setupProfileHeader() {
    const profileMiniElements = document.querySelectorAll('.profile-mini');

    // Inject Modal if not exists
    if (!document.getElementById('user-profile-modal')) {
        const modalHtml = `
            <div id="user-profile-modal" class="modal-overlay" onclick="if(event.target===this) this.classList.remove('show')">
                <div class="modal-content glass-card profile-modal-content fade-in-up">
                    <span class="close-btn" onclick="document.getElementById('user-profile-modal').classList.remove('show')"><i class="fa-solid fa-xmark"></i></span>
                    
                    <div class="profile-modal-header">
                        <img id="modal-user-pic" src="" alt="Avatar">
                        <h2 id="modal-user-name" class="glow-text text-accent">Username</h2>
                    </div>
                    
                    <div class="profile-modal-body">
                        <div class="info-row">
                            <i class="fa-solid fa-envelope text-blue"></i>
                            <div>
                                <small>Email Address</small>
                                <span id="modal-user-email">email@example.com</span>
                            </div>
                        </div>
                        <div class="info-row">
                            <i class="fa-solid fa-calendar-day text-gold"></i>
                            <div>
                                <small>Age</small>
                                <span id="modal-user-age">?</span>
                            </div>
                        </div>
                    </div>

                    <div class="profile-modal-stats">
                        <div class="stat-box">
                            <i class="fa-solid fa-star text-blue"></i>
                            <span>Lv. <span id="modal-user-level">1</span></span>
                        </div>
                        <div class="stat-box">
                            <i class="fa-solid fa-coins text-gold"></i>
                            <span id="modal-user-coins">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    profileMiniElements.forEach(el => {
        // Setup Hover DOM if needed
        if (!el.querySelector('.hover-username')) {
            const hoverLabel = document.createElement('div');
            hoverLabel.className = 'hover-username';
            el.insertBefore(hoverLabel, el.firstChild);
        }

        el.querySelector('.hover-username').innerText = currentUser.username;
        const img = el.querySelector('img');
        if (img) {
            img.src = currentUser.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`;
            img.style.objectFit = 'cover';
        }

        // Add click event for modal
        el.style.cursor = 'pointer';
        el.onclick = () => {
            playSFX('click');
            document.getElementById('modal-user-pic').src = currentUser.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`;
            document.getElementById('modal-user-name').innerText = currentUser.username;
            document.getElementById('modal-user-email').innerText = currentUser.email || 'Not provided';
            document.getElementById('modal-user-age').innerText = currentUser.age || 'Unknown';
            document.getElementById('modal-user-level').innerText = currentUser.level;
            document.getElementById('modal-user-coins').innerText = currentUser.coins;
            document.getElementById('user-profile-modal').classList.add('show');
        };
    });
}

function updateProgressUI() {
    const xpEls = document.getElementById('dash-xp');
    if (xpEls) xpEls.innerText = currentUser.xp;
    document.getElementById('dash-next-xp').innerText = currentUser.nextXp;
    document.getElementById('dash-coins').innerText = currentUser.coins;
    document.getElementById('dash-streak').innerText = currentUser.streak;

    const percent = Math.min(100, (currentUser.xp / currentUser.nextXp) * 100);
    document.getElementById('dash-xp-bar').style.width = `${percent}%`;
}

// --- SHOP LOGIC ---
// --- SHOP ITEM DEFINITIONS ---
const shopItems = {
    // Themes
    theme_diamond: { id: 'theme_diamond', name: 'Diamond Theme', desc: 'Icy blue diamond dashboard theme.', price: 1000, category: 'theme', icon: 'fa-gem', iconColor: 'text-blue' },
    theme_neon: { id: 'theme_neon', name: 'Neon Purple Theme', desc: 'Vibrant neon purple glow aesthetic.', price: 800, category: 'theme', icon: 'fa-wand-magic-sparkles', iconColor: 'text-purple' },
    theme_emerald: { id: 'theme_emerald', name: 'Emerald Theme', desc: 'Lush emerald green nature theme.', price: 1200, category: 'theme', icon: 'fa-leaf', iconColor: 'text-success' },
    theme_sunset: { id: 'theme_sunset', name: 'Sunset Theme', desc: 'Warm sunset gradient vibes.', price: 1500, category: 'theme', icon: 'fa-sun', iconColor: 'text-orange' },
    // Borders
    border_gold: { id: 'border_gold', name: 'Golden Border', desc: 'A shiny golden border for your avatar.', price: 500, category: 'border', icon: 'fa-crown', iconColor: 'text-gold' },
    border_diamond: { id: 'border_diamond', name: 'Diamond Border', desc: 'Sparkling diamond-encrusted avatar border.', price: 750, category: 'border', icon: 'fa-diamond', iconColor: 'text-blue' },
    border_fire: { id: 'border_fire', name: 'Fire Border', desc: 'Blazing fire animated avatar border.', price: 600, category: 'border', icon: 'fa-fire', iconColor: 'text-danger' },
    // Boosters (consumable)
    booster_timefreeze: { id: 'booster_timefreeze', name: 'Time Freeze', desc: '+15 seconds in Time-Attack mode.', price: 200, category: 'booster', icon: 'fa-snowflake', iconColor: 'text-blue', consumable: true },
    booster_hint: { id: 'booster_hint', name: 'Hint Reveal', desc: 'Highlights the correct answer for 2 seconds.', price: 150, category: 'booster', icon: 'fa-lightbulb', iconColor: 'text-yellow', consumable: true },
    booster_doublexp: { id: 'booster_doublexp', name: 'Double XP', desc: '2x XP for your next completed mission.', price: 300, category: 'booster', icon: 'fa-arrow-up-right-dots', iconColor: 'text-success', consumable: true }
};

function updateShopUI() {
    const coinsEl = document.getElementById('shop-coins');
    if (coinsEl) coinsEl.innerText = currentUser.coins;

    if (!currentUser.inventory) currentUser.inventory = [];
    if (!currentUser.boosters) currentUser.boosters = {};

    // Render all shop items dynamically
    const shopGrid = document.getElementById('shop-grid-dynamic');
    if (!shopGrid) return;

    shopGrid.innerHTML = '';

    const categories = [
        { key: 'theme', title: 'Dashboard Themes', icon: 'fa-palette' },
        { key: 'border', title: 'Avatar Borders', icon: 'fa-circle-notch' },
        { key: 'booster', title: 'Boosters & Power-Ups', icon: 'fa-rocket' }
    ];

    categories.forEach(cat => {
        const catItems = Object.values(shopItems).filter(i => i.category === cat.key);
        if (catItems.length === 0) return;

        const sectionHTML = `<div class="shop-category">
            <h3 class="shop-category-header"><i class="fa-solid ${cat.icon}"></i> ${cat.title}</h3>
            <div class="shop-grid">
                ${catItems.map(item => {
                    const owned = currentUser.inventory.includes(item.id);
                    const isActive = (item.category === 'theme' && currentUser.activeTheme === item.id.replace('theme_', '')) ||
                                     (item.category === 'border' && currentUser.activeBorder === item.id.replace('border_', ''));
                    const boosterCount = item.consumable ? (currentUser.boosters[item.id] || 0) : 0;

                    let btnText, btnClass, btnAction;
                    if (item.consumable) {
                        if (boosterCount > 0) {
                            btnText = `Use (${boosterCount})`;
                            btnClass = 'btn-booster-use';
                            btnAction = `useBooster('${item.id}')`;
                        } else {
                            btnText = `${item.price} Coins`;
                            btnClass = 'btn-primary';
                            btnAction = `buyItem('${item.id}', ${item.price})`;
                        }
                    } else if (owned && isActive) {
                        btnText = '<i class="fa-solid fa-check"></i> Equipped';
                        btnClass = 'btn-equipped';
                        btnAction = `unequipItem('${item.id}')`;
                    } else if (owned) {
                        btnText = 'Equip';
                        btnClass = 'btn-secondary';
                        btnAction = `equipItem('${item.id}')`;
                    } else {
                        btnText = `${item.price} Coins`;
                        btnClass = 'btn-primary';
                        btnAction = `buyItem('${item.id}', ${item.price})`;
                    }

                    return `<div class="glass-card shop-item ${isActive ? 'shop-item-active' : ''} ${owned ? 'shop-item-owned' : ''}">
                        <div class="item-icon ${item.iconColor}"><i class="fa-solid ${item.icon} fa-2x"></i></div>
                        <h4>${item.name}</h4>
                        <p class="shop-item-desc">${item.desc}</p>
                        ${item.consumable && boosterCount > 0 ? `<div class="booster-stock">Owned: <strong>${boosterCount}</strong></div>` : ''}
                        ${item.consumable ? `<button class="${btnClass} mt-1 shop-btn" onclick="${btnAction}">${btnText}</button>
                        ${boosterCount > 0 ? `<button class="btn-primary mt-1 shop-btn" onclick="buyItem('${item.id}', ${item.price})">Buy More (${item.price})</button>` : ''}` :
                        `<button class="${btnClass} mt-1 shop-btn" onclick="${btnAction}">${btnText}</button>`}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
        shopGrid.insertAdjacentHTML('beforeend', sectionHTML);
    });
}

function buyItem(itemId, price) {
    if (!currentUser.inventory) currentUser.inventory = [];
    if (!currentUser.boosters) currentUser.boosters = {};

    const item = shopItems[itemId];
    if (!item) return;

    // For non-consumable items, check if already owned
    if (!item.consumable && currentUser.inventory.includes(itemId)) {
        alert('You already own this item!');
        return;
    }

    if (currentUser.coins >= price) {
        currentUser.coins -= price;

        if (item.consumable) {
            // Add booster to count
            currentUser.boosters[itemId] = (currentUser.boosters[itemId] || 0) + 1;
        } else {
            currentUser.inventory.push(itemId);
            // Auto-equip on purchase
            if (item.category === 'theme') currentUser.activeTheme = itemId.replace('theme_', '');
            if (item.category === 'border') currentUser.activeBorder = itemId.replace('border_', '');
        }

        // Sync to users array
        syncUserToUsers();
        saveUser();
        saveUsers();
        
        unlockAchievement('ach_shop_buyer');
        
        updateShopUI();
        applyCosmetics();
        showShopNotification(`${item.name} purchased!`, item.consumable ? 'booster' : 'equip');
    } else {
        showShopNotification('Not enough coins!', 'error');
    }
}

function equipItem(itemId) {
    const item = shopItems[itemId];
    if (!item) return;
    playSFX('click');

    if (item.category === 'theme') currentUser.activeTheme = itemId.replace('theme_', '');
    if (item.category === 'border') currentUser.activeBorder = itemId.replace('border_', '');

    syncUserToUsers();
    saveUser();
    saveUsers();
    updateShopUI();
    applyCosmetics();
    showShopNotification(`${item.name} equipped!`, 'equip');

    if (currentUser.activeTheme && currentUser.activeTheme !== 'default' && 
        currentUser.activeBorder && currentUser.activeBorder !== 'default') {
        unlockAchievement('ach_fashionista');
    }
}

function unequipItem(itemId) {
    const item = shopItems[itemId];
    if (!item) return;
    playSFX('click');

    if (item.category === 'theme') currentUser.activeTheme = 'default';
    if (item.category === 'border') currentUser.activeBorder = 'default';

    syncUserToUsers();
    saveUser();
    saveUsers();
    updateShopUI();
    applyCosmetics();
    showShopNotification(`${item.name} unequipped.`, 'info');
}

function useBooster(boosterId) {
    if (!currentUser.boosters) currentUser.boosters = {};
    if (!currentUser.boosters[boosterId] || currentUser.boosters[boosterId] <= 0) {
        showShopNotification('No boosters available!', 'error');
        return;
    }
    playSFX('correct');

    const item = shopItems[boosterId];

    if (boosterId === 'booster_timefreeze') {
        currentUser.boosters[boosterId]--;
        currentUser.pendingBooster = 'timefreeze';
        showShopNotification('Time Freeze activated! +15s on next Time-Attack.', 'booster');
    } else if (boosterId === 'booster_hint') {
        currentUser.boosters[boosterId]--;
        currentUser.pendingBooster = 'hint';
        showShopNotification('Hint Reveal ready! Next mission will reveal answers.', 'booster');
    } else if (boosterId === 'booster_doublexp') {
        currentUser.boosters[boosterId]--;
        currentUser.pendingBooster = 'doublexp';
        showShopNotification('Double XP active! 2x XP on next mission.', 'booster');
    }

    syncUserToUsers();
    saveUser();
    saveUsers();
    updateShopUI();
}

function showShopNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.shop-notification');
    if (existing) existing.remove();

    const iconMap = {
        equip: 'fa-check-circle',
        booster: 'fa-rocket',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    const colorMap = {
        equip: 'var(--success)',
        booster: 'var(--accent-gold)',
        error: 'var(--danger)',
        info: 'var(--primary-blue)'
    };

    const notif = document.createElement('div');
    notif.className = 'shop-notification';
    notif.style.cssText = `position:fixed;bottom:30px;right:30px;background:rgba(15,23,42,0.95);border:1px solid ${colorMap[type] || colorMap.info};color:white;padding:16px 24px;border-radius:16px;z-index:9999;display:flex;align-items:center;gap:12px;font-weight:600;backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,0.4);animation:fadeInUp 0.4s ease-out;max-width:380px;`;
    notif.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info}" style="color:${colorMap[type] || colorMap.info};font-size:1.3rem;"></i> ${message}`;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        notif.style.transition = 'all 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2500);
}

function syncUserToUsers() {
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = { ...currentUser };
        delete users[userIndex].isLoggedIn;
    }
}

// --- ACHIEVEMENTS LOGIC ---
const achievementsData = [
    { id: 'ach_first_mission', title: 'Frequent Flyer', desc: 'Complete your first map mission.', icon: 'fa-plane', iconColor: 'text-blue' },
    { id: 'ach_level_5', title: 'Rising Star', desc: 'Reach Level 5.', icon: 'fa-star', iconColor: 'text-gold' },
    { id: 'ach_level_10', title: 'English Master', desc: 'Reach Level 10.', icon: 'fa-graduation-cap', iconColor: 'text-purple' },
    { id: 'ach_level_20', title: 'English Guru', desc: 'Reach Level 20.', icon: 'fa-crown', iconColor: 'text-gold' },
    { id: 'ach_shop_buyer', title: 'Big Spender', desc: 'Purchase your first item from the Shop.', icon: 'fa-cart-shopping', iconColor: 'text-success' },
    { id: 'ach_wealthy', title: 'Wealthy Learner', desc: 'Accumulate 100 coins.', icon: 'fa-coins', iconColor: 'text-gold' },
    { id: 'ach_fashionista', title: 'Fashionista', desc: 'Equip a custom theme and border.', icon: 'fa-palette', iconColor: 'text-purple' },
    { id: 'ach_perfect_score', title: 'A+ Student', desc: 'Score an A (100%) on any mission.', icon: 'fa-check-double', iconColor: 'text-success' },
    { id: 'ach_flashcard_learner', title: 'Memory Master', desc: 'Flip 10 flashcards.', icon: 'fa-brain', iconColor: 'text-blue' },
    { id: 'ach_daily_grind', title: 'Daily Grind', desc: 'Play the Daily Challenge.', icon: 'fa-bolt', iconColor: 'text-orange' }
];

function updateAchievementsUI() {
    const achGrid = document.getElementById('achievements-dynamic-grid');
    if (!achGrid) return;
    
    if (!currentUser.achievements) currentUser.achievements = [];

    achGrid.innerHTML = '';

    achievementsData.forEach(ach => {
        const isUnlocked = currentUser.achievements.includes(ach.id);
        const stateClass = isUnlocked ? 'unlocked' : 'locked';
        const colorClass = isUnlocked ? ach.iconColor : 'text-muted';
        
        achGrid.insertAdjacentHTML('beforeend', `
            <div class="glass-card achievement-card ${stateClass}">
                <i class="fa-solid ${ach.icon} ${colorClass} fa-2x"></i>
                <div class="ach-info">
                    <h4>${ach.title}</h4>
                    <p>${ach.desc}</p>
                </div>
            </div>
        `);
    });
}

function unlockAchievement(achId) {
    if (!currentUser.achievements) currentUser.achievements = [];
    if (currentUser.achievements.includes(achId)) return; // Already unlocked

    const ach = achievementsData.find(a => a.id === achId);
    if (!ach) return;

    currentUser.achievements.push(achId);
    saveUser();
    syncUserToUsers();
    saveUsers();

    // Trigger Popup Animation
    playSFX('correct'); // Using existing sound effect
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <i class="fa-solid ${ach.icon} achievement-popup-icon"></i>
        <div class="achievement-popup-content">
            <h4>Achievement Unlocked!</h4>
            <p>${ach.title}</p>
        </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.animation = 'none'; // reset
        popup.style.transition = 'all 0.5s ease';
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => popup.remove(), 500);
    }, 4000);
}

// --- COSMETICS LOGIC ---
function applyCosmetics() {
    if (!currentUser.inventory) currentUser.inventory = [];

    // Remove all theme classes first
    document.body.classList.remove('theme-diamond', 'theme-neon', 'theme-emerald', 'theme-sunset');

    // Apply active theme
    if (currentUser.activeTheme && currentUser.activeTheme !== 'default') {
        document.body.classList.add('theme-' + currentUser.activeTheme);
    }

    // Remove all border classes first
    const allAvatars = document.querySelectorAll('.profile-mini img, #modal-user-pic, .npc-avatar, .about-avatar img');
    allAvatars.forEach(img => {
        img.classList.remove('border-gold', 'border-diamond', 'border-fire');
    });

    // Apply active border
    if (currentUser.activeBorder && currentUser.activeBorder !== 'default') {
        allAvatars.forEach(img => img.classList.add('border-' + currentUser.activeBorder));
    }
}



// --- MISSION LOGIC ---
function openMissionDetail(missionId) {
    const mission = missionsData[missionId];
    if (!mission) return;

    localStorage.setItem('emh_current_mission', missionId);

    // Populate Modal
    document.getElementById('md-title').innerText = mission.title;
    document.getElementById('md-desc').innerText = mission.description;
    document.getElementById('md-diff').innerText = mission.difficulty;
    document.getElementById('md-xp').innerText = mission.xpReward;
    document.getElementById('md-time').innerText = mission.timeEst;

    const iconEl = document.getElementById('md-icon');
    iconEl.className = `fa-solid ${mission.icon}`;

    document.getElementById('modal-mission-detail').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// --- TONE SORTER CHALLENGE ---
const tonePhrases = [
    // Formal
    { text: "Could you please assist me?", tone: "formal" },
    { text: "I would appreciate your help.", tone: "formal" },
    { text: "Kindly be advised of the following changes.", tone: "formal" },
    { text: "I would like to request a meeting at your convenience.", tone: "formal" },
    { text: "Would it be possible to reschedule?", tone: "formal" },
    { text: "Please find the attached document for your review.", tone: "formal" },
    { text: "I am writing to inform you of my resignation.", tone: "formal" },
    { text: "We regret to inform you that your application was unsuccessful.", tone: "formal" },
    // Casual
    { text: "Hey, how are you?", tone: "casual" },
    { text: "See ya later.", tone: "casual" },
    { text: "No worries, take your time!", tone: "casual" },
    { text: "Let me know when you're free.", tone: "casual" },
    { text: "Sounds good to me!", tone: "casual" },
    { text: "I'll catch up with you tomorrow.", tone: "casual" },
    { text: "Can you grab me a coffee?", tone: "casual" },
    { text: "That movie was pretty awesome.", tone: "casual" },
    // Slang
    { text: "What's up, man?", tone: "slang" },
    { text: "That's lit bro!", tone: "slang" },
    { text: "No cap, that was insane!", tone: "slang" },
    { text: "Spill the tea, sis!", tone: "slang" },
    { text: "Bruh, that's sus.", tone: "slang" },
    { text: "She totally ghosted him.", tone: "slang" },
    { text: "This slaps, not gonna lie.", tone: "slang" },
    { text: "He's lowkey the GOAT.", tone: "slang" }
];
let currentToneIndex = 0;
let toneScore = 0;
let toneTimer = 30;
let toneInterval;

function initToneGame() {
    const path = window.location.pathname;
    if (path.includes('daily_challenge.html')) {
        document.getElementById('tone-score').innerText = '0';
        document.getElementById('tone-timer').innerText = '30';
    }
}

function startToneGame() {
    document.getElementById('tone-start-overlay').style.display = 'none';
    toneScore = 0;
    toneTimer = 30;
    currentToneIndex = 0;
    document.getElementById('tone-score').innerText = toneScore;

    // Shuffle phrases
    tonePhrases.sort(() => Math.random() - 0.5);
    showNextPhrase();

    toneInterval = setInterval(() => {
        toneTimer--;
        document.getElementById('tone-timer').innerText = toneTimer;
        if (toneTimer <= 0) {
            endToneGame();
        }
    }, 1000);
}

function showNextPhrase() {
    if (currentToneIndex >= tonePhrases.length) {
        // Loop back and reshuffle for continuous play until timer ends
        tonePhrases.sort(() => Math.random() - 0.5);
        currentToneIndex = 0;
    }
    const phrase = tonePhrases[currentToneIndex];
    const phraseEl = document.getElementById('current-phrase');
    phraseEl.innerText = `"${phrase.text}"`;
    phraseEl.dataset.tone = phrase.tone;

    // Reset position
    phraseEl.style.top = '20px';
}

function sortTone(selectedTone) {
    if (toneTimer <= 0) return;

    const phraseEl = document.getElementById('current-phrase');
    const correctTone = phraseEl.dataset.tone;

    if (selectedTone === correctTone) {
        playSFX('correct');
        toneScore += 10;
        phraseEl.style.background = 'var(--success)';
        phraseEl.style.color = 'white';
    } else {
        playSFX('wrong');
        toneScore -= 5;
        phraseEl.style.background = 'var(--danger)';
        phraseEl.style.color = 'white';
    }
    document.getElementById('tone-score').innerText = toneScore;

    setTimeout(() => {
        phraseEl.style.background = 'rgba(255, 255, 255, 0.9)';
        phraseEl.style.color = 'var(--bg-dark)';
        currentToneIndex++;
        showNextPhrase();
    }, 300);
}

function endToneGame() {
    clearInterval(toneInterval);
    document.getElementById('tone-start-overlay').style.display = 'flex';
    document.getElementById('tone-start-overlay').innerHTML = `
        <div class="glass-card" style="text-align:center;">
            <h2>Time's Up!</h2>
            <p>You scored ${toneScore} points.</p>
            <button class="btn-primary mt-3" onclick="claimToneReward()">Claim ${Math.max(0, toneScore)} XP</button>
        </div>
    `;
}

function claimToneReward() {
    if (toneScore > 0) {
        currentUser.xp += toneScore;
        checkLevelUp();
        unlockAchievement('ach_daily_grind');
        saveUser();
    }
    navigateTo('dashboard.html');
}

// --- EMAIL TRIAGE CHALLENGE ---
const triageEmails = [
    // FYI
    { sender: "HR Dept", subject: "Policy Update", body: "Please review the attached dress code before Monday.", type: "fyi" },
    { sender: "John Doe", subject: "Lunch?", body: "Are we still on for lunch at 1 PM today?", type: "fyi" },
    { sender: "IT Support", subject: "Maintenance", body: "Servers will be down for 5 mins tonight.", type: "fyi" },
    { sender: "Marketing", subject: "Newsletter", body: "Check out our latest company newsletter for Q2.", type: "fyi" },
    { sender: "Office Admin", subject: "Holiday Schedule", body: "The office will be closed next Friday for a public holiday.", type: "fyi" },
    { sender: "Team Lead", subject: "Weekly Standup", body: "Reminder: standup meeting is at 10 AM tomorrow.", type: "fyi" },
    { sender: "Facilities", subject: "Parking Update", body: "Lot B will be repaved this weekend. Use Lot C instead.", type: "fyi" },
    { sender: "HR Dept", subject: "New Employee", body: "Please welcome Sarah to the design team starting Monday.", type: "fyi" },
    // Urgent
    { sender: "System", subject: "Server DOWN!", body: "Critical failure in database cluster. Fix immediately.", type: "urgent" },
    { sender: "CEO", subject: "Board Meeting", body: "Need the quarterly report on my desk in 5 minutes.", type: "urgent" },
    { sender: "Client", subject: "Contract Cancelled", body: "We are terminating our service immediately due to bugs.", type: "urgent" },
    { sender: "Security", subject: "Data Breach Alert", body: "Unauthorized access detected. Change all passwords NOW.", type: "urgent" },
    { sender: "Manager", subject: "Deadline Moved", body: "The project deadline has been moved to TODAY 5 PM.", type: "urgent" },
    { sender: "CFO", subject: "Budget Freeze", body: "All spending is frozen effective immediately. Stop all purchases.", type: "urgent" },
    { sender: "Support", subject: "Critical Bug", body: "Production is down. Users cannot log in. Fix ASAP.", type: "urgent" },
    // Spam
    { sender: "Winner", subject: "You won a gift card!", body: "Click here to claim your $1000 prize now!!", type: "spam" },
    { sender: "Prince", subject: "Investment Opportunity", body: "Send $500 to unlock your royal inheritance.", type: "spam" },
    { sender: "Discount", subject: "CHEAP PILLS", body: "Buy cheap pills online no prescription needed.", type: "spam" },
    { sender: "Lucky User", subject: "FREE iPhone 16!", body: "You've been selected! Click to claim your free phone!", type: "spam" },
    { sender: "Account Team", subject: "Verify Your Account", body: "Your account will be deleted unless you click this link now.", type: "spam" },
    { sender: "Crypto Bro", subject: "Make $10K/day", body: "This secret crypto method made me rich overnight. No risk!", type: "spam" },
    { sender: "Weight Loss", subject: "Lose 30kg in a week", body: "Doctors HATE this one trick. Click to see the secret.", type: "spam" },
    { sender: "Unknown", subject: "RE: Your Order", body: "Your package couldn't be delivered. Click to reschedule.", type: "spam" }
];
let currentTriageIndex = 0;
let triageScore = 0;
let triageTimer = 30;
let triageInterval;

function initTriageGame() {
    const path = window.location.pathname;
    if (path.includes('email_triage.html')) {
        document.getElementById('triage-score').innerText = '0';
        document.getElementById('triage-timer').innerText = '30';
    }
}

function startTriageGame() {
    document.getElementById('triage-start-overlay').style.display = 'none';
    triageScore = 0;
    triageTimer = 30;
    currentTriageIndex = 0;
    document.getElementById('triage-score').innerText = triageScore;

    triageEmails.sort(() => Math.random() - 0.5);
    showNextEmail();

    triageInterval = setInterval(() => {
        triageTimer--;
        document.getElementById('triage-timer').innerText = triageTimer;
        if (triageTimer <= 0) {
            endTriageGame();
        }
    }, 1000);
}

function showNextEmail() {
    if (currentTriageIndex >= triageEmails.length) {
        triageEmails.sort(() => Math.random() - 0.5);
        currentTriageIndex = 0;
    }
    const email = triageEmails[currentTriageIndex];
    document.getElementById('email-sender').innerText = email.sender;
    document.getElementById('email-subject').innerText = email.subject;
    document.getElementById('email-body').innerText = email.body;
    document.getElementById('email-card').dataset.type = email.type;
}

function sortEmail(selectedType) {
    if (triageTimer <= 0) return;

    const card = document.getElementById('email-card');
    const correctType = card.dataset.type;

    if (selectedType === correctType) {
        playSFX('correct');
        triageScore += 15;
        card.style.transform = 'scale(1.05) translateY(-10px)';
        card.style.background = 'var(--success)';
    } else {
        playSFX('wrong');
        triageScore -= 5;
        card.style.transform = 'scale(0.95) translateY(10px)';
        card.style.background = 'var(--danger)';
    }
    document.getElementById('triage-score').innerText = triageScore;

    setTimeout(() => {
        card.style.transform = 'scale(1) translateY(0)';
        card.style.background = 'var(--bg-card)';
        currentTriageIndex++;
        showNextEmail();
    }, 200);
}

function endTriageGame() {
    clearInterval(triageInterval);
    document.getElementById('triage-start-overlay').style.display = 'flex';
    document.getElementById('triage-start-overlay').innerHTML = `
        <div class="glass-card" style="text-align:center;">
            <h2>Shift Over!</h2>
            <p>You sorted emails and scored ${triageScore} points.</p>
            <button class="btn-primary mt-3" onclick="claimTriageReward()">Claim ${Math.max(0, triageScore)} XP</button>
        </div>
    `;
}

function claimTriageReward() {
    if (triageScore > 0) {
        currentUser.xp += triageScore;
        checkLevelUp();
        saveUser();
    }
    navigateTo('dashboard.html');
}

// --- ADVANCED GAMEPLAY (COMPREHENSION SIMULATOR) ---
let gameScenario = null;

function startGameplay() {
    navigateTo('gameplay.html');
}

function setupGameplay() {
    const missionId = localStorage.getItem('emh_current_mission');
    const mission = missionsData[missionId];
    if (!mission) {
        navigateTo('map.html');
        return;
    }

    document.getElementById('gp-title').innerText = mission.title;

    // Multi-round mission data
    const missionRounds = getMissionRounds(missionId);
    window.missionRoundData = missionRounds;
    window.currentMissionRound = 0;
    window.missionCorrectCount = 0;
    window.totalMissionRounds = missionRounds.length;
    
    // Automatically start time attack for all missions
    startTimeAttack();

    loadMissionRound(0);
}

function getMissionRounds(missionId) {
    const rounds = {
        'airport': [
            {
                npcText: "Hello! I am checking in for my flight to Tokyo. I would like a window seat, please. I also ordered the vegetarian meal in advance. Oh, and I have 2 pieces of checked baggage.",
                expected: { seat: 'window', meal: 'veg', bags: '2' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('seat', 'window', this)">Window Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('seat', 'aisle', this)">Aisle Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('meal', 'veg', this)">Vegetarian</button>
                        <button class="toggle-btn" onclick="toggleOption('meal', 'standard', this)">Standard</button>
                        <button class="toggle-btn" onclick="toggleOption('bags', '1', this)">1 Bag</button>
                        <button class="toggle-btn" onclick="toggleOption('bags', '2', this)">2 Bags</button>
                    </div>
                `
            },
            {
                npcText: "Excuse me, I need to change my flight. My original flight was at 3 PM but I need the 7 PM one. I'd like an aisle seat this time. And can I add one piece of carry-on luggage to my booking?",
                expected: { flight: '7pm', seat2: 'aisle', luggage: 'carryon' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('flight', '3pm', this)">3 PM Flight</button>
                        <button class="toggle-btn" onclick="toggleOption('flight', '7pm', this)">7 PM Flight</button>
                        <button class="toggle-btn" onclick="toggleOption('seat2', 'window', this)">Window Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('seat2', 'aisle', this)">Aisle Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('luggage', 'checked', this)">Checked Bag</button>
                        <button class="toggle-btn" onclick="toggleOption('luggage', 'carryon', this)">Carry-On</button>
                    </div>
                `
            },
            {
                npcText: "Hi there! I'm traveling with my family - 3 passengers total. We need seats together, preferably near the emergency exit. We also need the kids' meal for my son. Our destination is London.",
                expected: { passengers: '3', exitrow: 'yes', kidsmeal: 'yes', dest: 'london' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('passengers', '2', this)">2 Passengers</button>
                        <button class="toggle-btn" onclick="toggleOption('passengers', '3', this)">3 Passengers</button>
                        <button class="toggle-btn" onclick="toggleOption('exitrow', 'yes', this)">Exit Row: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('exitrow', 'no', this)">Exit Row: No</button>
                        <button class="toggle-btn" onclick="toggleOption('kidsmeal', 'yes', this)">Kids' Meal: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('kidsmeal', 'no', this)">Kids' Meal: No</button>
                        <button class="toggle-btn" onclick="toggleOption('dest', 'london', this)">Dest: London</button>
                        <button class="toggle-btn" onclick="toggleOption('dest', 'paris', this)">Dest: Paris</button>
                    </div>
                `
            },
            {
                npcText: "Good morning! I'd like to upgrade to business class if available. I have a lot of electronics — laptop, tablet, and camera — all in my carry-on. Also, can I access the VIP lounge? My flight is at 10 AM.",
                expected: { upgrade: 'business', electronics: 'carryon', lounge: 'yes', flighttime: '10am' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('upgrade', 'business', this)">Business Class</button>
                        <button class="toggle-btn" onclick="toggleOption('upgrade', 'economy', this)">Economy Class</button>
                        <button class="toggle-btn" onclick="toggleOption('electronics', 'carryon', this)">Electronics: Carry-On</button>
                        <button class="toggle-btn" onclick="toggleOption('electronics', 'checked', this)">Electronics: Checked</button>
                        <button class="toggle-btn" onclick="toggleOption('lounge', 'yes', this)">VIP Lounge: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('lounge', 'no', this)">VIP Lounge: No</button>
                        <button class="toggle-btn" onclick="toggleOption('flighttime', '10am', this)">Flight: 10 AM</button>
                        <button class="toggle-btn" onclick="toggleOption('flighttime', '2pm', this)">Flight: 2 PM</button>
                    </div>
                `
            },
            {
                npcText: "Excuse me, I'm a wheelchair user and I need special assistance to board. My destination is Dubai, and I'd like a front-row seat for easier access. I also have a service dog traveling with me.",
                expected: { assist: 'wheelchair', dest2: 'dubai', seat3: 'front', pet: 'servicedog' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('assist', 'wheelchair', this)">Assist: Wheelchair</button>
                        <button class="toggle-btn" onclick="toggleOption('assist', 'none', this)">Assist: None</button>
                        <button class="toggle-btn" onclick="toggleOption('dest2', 'dubai', this)">Dest: Dubai</button>
                        <button class="toggle-btn" onclick="toggleOption('dest2', 'singapore', this)">Dest: Singapore</button>
                        <button class="toggle-btn" onclick="toggleOption('seat3', 'front', this)">Front Row Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('seat3', 'back', this)">Back Row Seat</button>
                        <button class="toggle-btn" onclick="toggleOption('pet', 'servicedog', this)">Service Dog</button>
                        <button class="toggle-btn" onclick="toggleOption('pet', 'nopet', this)">No Pet</button>
                    </div>
                `
            }
        ],
        'restaurant': [
            {
                npcText: "I'll have the steak, well-done, please. Can I get the fries on the side instead of mashed potatoes? Oh, and absolutely no mayonnaise on the side salad.",
                expected: { meat: 'welldone', side: 'fries', mayo: 'no' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('meat', 'rare', this)">Rare Steak</button>
                        <button class="toggle-btn" onclick="toggleOption('meat', 'welldone', this)">Well-Done Steak</button>
                        <button class="toggle-btn" onclick="toggleOption('side', 'fries', this)">Side: Fries</button>
                        <button class="toggle-btn" onclick="toggleOption('side', 'mash', this)">Side: Mash</button>
                        <button class="toggle-btn" onclick="toggleOption('mayo', 'yes', this)">With Mayo</button>
                        <button class="toggle-btn" onclick="toggleOption('mayo', 'no', this)">No Mayo</button>
                    </div>
                `
            },
            {
                npcText: "I'd like the grilled salmon, please. Medium portion. I want the Caesar salad as a starter, and sparkling water to drink. Oh, I'm allergic to nuts so please make sure there are none.",
                expected: { dish: 'salmon', portion: 'medium', starter: 'caesar', drink: 'sparkling', nuts: 'no' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('dish', 'salmon', this)">Grilled Salmon</button>
                        <button class="toggle-btn" onclick="toggleOption('dish', 'chicken', this)">Grilled Chicken</button>
                        <button class="toggle-btn" onclick="toggleOption('portion', 'small', this)">Small Portion</button>
                        <button class="toggle-btn" onclick="toggleOption('portion', 'medium', this)">Medium Portion</button>
                        <button class="toggle-btn" onclick="toggleOption('starter', 'caesar', this)">Caesar Salad</button>
                        <button class="toggle-btn" onclick="toggleOption('starter', 'tomato', this)">Tomato Soup</button>
                        <button class="toggle-btn" onclick="toggleOption('drink', 'sparkling', this)">Sparkling Water</button>
                        <button class="toggle-btn" onclick="toggleOption('drink', 'still', this)">Still Water</button>
                        <button class="toggle-btn" onclick="toggleOption('nuts', 'yes', this)">Nuts OK</button>
                        <button class="toggle-btn" onclick="toggleOption('nuts', 'no', this)">No Nuts</button>
                    </div>
                `
            },
            {
                npcText: "Table for two, please. We'd both like the set menu. My wife is vegetarian, so she'll have the veggie pasta. I'll have the lamb chops, rare. We'll share a bottle of red wine. And can we get the dessert menu later?",
                expected: { table: '2', wife: 'vegpasta', husband: 'rare', wine: 'red', dessert: 'later' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('table', '2', this)">Table for 2</button>
                        <button class="toggle-btn" onclick="toggleOption('table', '4', this)">Table for 4</button>
                        <button class="toggle-btn" onclick="toggleOption('wife', 'vegpasta', this)">Wife: Veggie Pasta</button>
                        <button class="toggle-btn" onclick="toggleOption('wife', 'steak', this)">Wife: Steak</button>
                        <button class="toggle-btn" onclick="toggleOption('husband', 'rare', this)">Lamb: Rare</button>
                        <button class="toggle-btn" onclick="toggleOption('husband', 'welldone', this)">Lamb: Well-Done</button>
                        <button class="toggle-btn" onclick="toggleOption('wine', 'red', this)">Red Wine</button>
                        <button class="toggle-btn" onclick="toggleOption('wine', 'white', this)">White Wine</button>
                        <button class="toggle-btn" onclick="toggleOption('dessert', 'later', this)">Dessert: Later</button>
                        <button class="toggle-btn" onclick="toggleOption('dessert', 'now', this)">Dessert: Now</button>
                    </div>
                `
            },
            {
                npcText: "Hi, I have a severe nut allergy. I'd like the grilled salmon with steamed vegetables. Can you make sure there's no peanut oil used? Also, I'd like sparkling water and the gluten-free bread, please.",
                expected: { allergy: 'nut', dish: 'salmon', oil: 'nopeanut', drink: 'sparkling', bread: 'glutenfree' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('allergy', 'nut', this)">Allergy: Nuts</button>
                        <button class="toggle-btn" onclick="toggleOption('allergy', 'dairy', this)">Allergy: Dairy</button>
                        <button class="toggle-btn" onclick="toggleOption('dish', 'salmon', this)">Grilled Salmon</button>
                        <button class="toggle-btn" onclick="toggleOption('dish', 'chicken', this)">Grilled Chicken</button>
                        <button class="toggle-btn" onclick="toggleOption('oil', 'nopeanut', this)">No Peanut Oil</button>
                        <button class="toggle-btn" onclick="toggleOption('oil', 'regular', this)">Regular Oil</button>
                        <button class="toggle-btn" onclick="toggleOption('drink', 'sparkling', this)">Sparkling Water</button>
                        <button class="toggle-btn" onclick="toggleOption('drink', 'still', this)">Still Water</button>
                        <button class="toggle-btn" onclick="toggleOption('bread', 'glutenfree', this)">Gluten-Free Bread</button>
                        <button class="toggle-btn" onclick="toggleOption('bread', 'regular', this)">Regular Bread</button>
                    </div>
                `
            },
            {
                npcText: "We had a reservation for 4, but now we're 6 people. Can you move us to a bigger table? Also, we're celebrating a birthday — could you bring a candle on the chocolate cake later? And keep it a surprise!",
                expected: { party: '6', tablereq: 'bigger', cake: 'chocolate', surprise: 'yes' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('party', '6', this)">Party: 6</button>
                        <button class="toggle-btn" onclick="toggleOption('party', '4', this)">Party: 4</button>
                        <button class="toggle-btn" onclick="toggleOption('tablereq', 'bigger', this)">Bigger Table</button>
                        <button class="toggle-btn" onclick="toggleOption('tablereq', 'same', this)">Same Table</button>
                        <button class="toggle-btn" onclick="toggleOption('cake', 'chocolate', this)">Chocolate Cake</button>
                        <button class="toggle-btn" onclick="toggleOption('cake', 'vanilla', this)">Vanilla Cake</button>
                        <button class="toggle-btn" onclick="toggleOption('surprise', 'yes', this)">Surprise: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('surprise', 'no', this)">Surprise: No</button>
                    </div>
                `
            }
        ],
        'coffee_shop': [
            {
                npcText: "I would like a large decaf latte with oat milk, please.",
                expected: { size: 'large', type: 'decaf', milk: 'oat' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('size', 'small', this)">Small</button>
                        <button class="toggle-btn" onclick="toggleOption('size', 'large', this)">Large</button>
                        <button class="toggle-btn" onclick="toggleOption('type', 'regular', this)">Regular</button>
                        <button class="toggle-btn" onclick="toggleOption('type', 'decaf', this)">Decaf</button>
                        <button class="toggle-btn" onclick="toggleOption('milk', 'whole', this)">Whole Milk</button>
                        <button class="toggle-btn" onclick="toggleOption('milk', 'oat', this)">Oat Milk</button>
                    </div>
                `
            },
            {
                npcText: "Can I get a medium iced americano with an extra shot of espresso? No sugar, please. And I'll take a blueberry muffin to go.",
                expected: { size2: 'medium', temp: 'iced', extra: 'yes', sugar: 'no', food: 'muffin' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('size2', 'small', this)">Small</button>
                        <button class="toggle-btn" onclick="toggleOption('size2', 'medium', this)">Medium</button>
                        <button class="toggle-btn" onclick="toggleOption('temp', 'hot', this)">Hot</button>
                        <button class="toggle-btn" onclick="toggleOption('temp', 'iced', this)">Iced</button>
                        <button class="toggle-btn" onclick="toggleOption('extra', 'yes', this)">Extra Shot: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('extra', 'no', this)">Extra Shot: No</button>
                        <button class="toggle-btn" onclick="toggleOption('sugar', 'yes', this)">Sugar: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('sugar', 'no', this)">Sugar: No</button>
                        <button class="toggle-btn" onclick="toggleOption('food', 'muffin', this)">Blueberry Muffin</button>
                        <button class="toggle-btn" onclick="toggleOption('food', 'croissant', this)">Croissant</button>
                    </div>
                `
            },
            {
                npcText: "Hi! I'd like two drinks please: a small hot chocolate with whipped cream for my daughter, and a large flat white with almond milk for me. Both for here.",
                expected: { kid: 'hotchoc', kidsize: 'small', cream: 'yes', me: 'flatwhite', mesize: 'large', memilk: 'almond', dine: 'here' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('kid', 'hotchoc', this)">Kid: Hot Chocolate</button>
                        <button class="toggle-btn" onclick="toggleOption('kid', 'juice', this)">Kid: Orange Juice</button>
                        <button class="toggle-btn" onclick="toggleOption('kidsize', 'small', this)">Kid Size: Small</button>
                        <button class="toggle-btn" onclick="toggleOption('kidsize', 'large', this)">Kid Size: Large</button>
                        <button class="toggle-btn" onclick="toggleOption('cream', 'yes', this)">Whipped Cream: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('cream', 'no', this)">Whipped Cream: No</button>
                        <button class="toggle-btn" onclick="toggleOption('me', 'flatwhite', this)">Me: Flat White</button>
                        <button class="toggle-btn" onclick="toggleOption('me', 'cappuccino', this)">Me: Cappuccino</button>
                        <button class="toggle-btn" onclick="toggleOption('memilk', 'almond', this)">Almond Milk</button>
                        <button class="toggle-btn" onclick="toggleOption('memilk', 'soy', this)">Soy Milk</button>
                        <button class="toggle-btn" onclick="toggleOption('dine', 'here', this)">For Here</button>
                        <button class="toggle-btn" onclick="toggleOption('dine', 'togo', this)">To Go</button>
                    </div>
                `
            },
            {
                npcText: "Can I get an iced matcha with coconut milk? Make it a medium and add two pumps of vanilla. Oh, and I'm using my loyalty card — this should be my 10th drink for the free reward!",
                expected: { drink2: 'matcha', temp: 'iced', milk2: 'coconut', size2: 'medium', vanilla: '2pumps', loyalty: 'yes' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('drink2', 'matcha', this)">Matcha</button>
                        <button class="toggle-btn" onclick="toggleOption('drink2', 'chai', this)">Chai</button>
                        <button class="toggle-btn" onclick="toggleOption('temp', 'iced', this)">Iced</button>
                        <button class="toggle-btn" onclick="toggleOption('temp', 'hot', this)">Hot</button>
                        <button class="toggle-btn" onclick="toggleOption('milk2', 'coconut', this)">Coconut Milk</button>
                        <button class="toggle-btn" onclick="toggleOption('milk2', 'oat', this)">Oat Milk</button>
                        <button class="toggle-btn" onclick="toggleOption('size2', 'medium', this)">Medium</button>
                        <button class="toggle-btn" onclick="toggleOption('size2', 'large', this)">Large</button>
                        <button class="toggle-btn" onclick="toggleOption('vanilla', '2pumps', this)">2 Pumps Vanilla</button>
                        <button class="toggle-btn" onclick="toggleOption('vanilla', 'none', this)">No Vanilla</button>
                        <button class="toggle-btn" onclick="toggleOption('loyalty', 'yes', this)">Loyalty: Yes</button>
                        <button class="toggle-btn" onclick="toggleOption('loyalty', 'no', this)">Loyalty: No</button>
                    </div>
                `
            },
            {
                npcText: "Hi! I need a double espresso for myself and a kids' hot chocolate with extra marshmallows for my son. Both for here, and could we have two chocolate chip cookies as well?",
                expected: { mydrink: 'espresso', kiddrink: 'hotchoc', marshmallow: 'extra', dinein: 'here', snack: 'cookies' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('mydrink', 'espresso', this)">Double Espresso</button>
                        <button class="toggle-btn" onclick="toggleOption('mydrink', 'americano', this)">Americano</button>
                        <button class="toggle-btn" onclick="toggleOption('kiddrink', 'hotchoc', this)">Kids Hot Choc</button>
                        <button class="toggle-btn" onclick="toggleOption('kiddrink', 'juice', this)">Kids Juice</button>
                        <button class="toggle-btn" onclick="toggleOption('marshmallow', 'extra', this)">Extra Marshmallows</button>
                        <button class="toggle-btn" onclick="toggleOption('marshmallow', 'none', this)">No Marshmallows</button>
                        <button class="toggle-btn" onclick="toggleOption('dinein', 'here', this)">For Here</button>
                        <button class="toggle-btn" onclick="toggleOption('dinein', 'togo', this)">To Go</button>
                        <button class="toggle-btn" onclick="toggleOption('snack', 'cookies', this)">Choc Cookies</button>
                        <button class="toggle-btn" onclick="toggleOption('snack', 'muffin', this)">Blueberry Muffin</button>
                    </div>
                `
            }
        ],
        'office': [
            {
                npcText: "Please present the quarterly report. I need the Q3 revenue, the projected Q4 growth, and the marketing budget allocation.",
                expected: { q3: '500k', q4: '15%', budget: 'marketing' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('q3', '500k', this)">Q3: $500K</button>
                        <button class="toggle-btn" onclick="toggleOption('q3', '300k', this)">Q3: $300K</button>
                        <button class="toggle-btn" onclick="toggleOption('q4', '15%', this)">Q4: 15%</button>
                        <button class="toggle-btn" onclick="toggleOption('q4', '5%', this)">Q4: 5%</button>
                        <button class="toggle-btn" onclick="toggleOption('budget', 'marketing', this)">Budget: Marketing</button>
                        <button class="toggle-btn" onclick="toggleOption('budget', 'r&d', this)">Budget: R&D</button>
                    </div>
                `
            },
            {
                npcText: "We need to schedule the client meeting. It should be on Wednesday at 2 PM in Conference Room B. Send the invite to the entire sales team. Make sure to attach the updated proposal document.",
                expected: { day: 'wed', time: '2pm', room: 'b', team: 'sales', attach: 'proposal' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('day', 'mon', this)">Monday</button>
                        <button class="toggle-btn" onclick="toggleOption('day', 'wed', this)">Wednesday</button>
                        <button class="toggle-btn" onclick="toggleOption('time', '10am', this)">10 AM</button>
                        <button class="toggle-btn" onclick="toggleOption('time', '2pm', this)">2 PM</button>
                        <button class="toggle-btn" onclick="toggleOption('room', 'a', this)">Room A</button>
                        <button class="toggle-btn" onclick="toggleOption('room', 'b', this)">Room B</button>
                        <button class="toggle-btn" onclick="toggleOption('team', 'sales', this)">Sales Team</button>
                        <button class="toggle-btn" onclick="toggleOption('team', 'dev', this)">Dev Team</button>
                        <button class="toggle-btn" onclick="toggleOption('attach', 'proposal', this)">Attach: Proposal</button>
                        <button class="toggle-btn" onclick="toggleOption('attach', 'report', this)">Attach: Report</button>
                    </div>
                `
            },
            {
                npcText: "I need you to handle the new hire onboarding. Prepare the welcome package for the Engineering department. The start date is next Monday. Assign them to Project Alpha and set up their workstation on the 3rd floor.",
                expected: { dept: 'engineering', start: 'monday', project: 'alpha', floor: '3rd' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('dept', 'engineering', this)">Dept: Engineering</button>
                        <button class="toggle-btn" onclick="toggleOption('dept', 'marketing', this)">Dept: Marketing</button>
                        <button class="toggle-btn" onclick="toggleOption('start', 'monday', this)">Start: Monday</button>
                        <button class="toggle-btn" onclick="toggleOption('start', 'friday', this)">Start: Friday</button>
                        <button class="toggle-btn" onclick="toggleOption('project', 'alpha', this)">Project Alpha</button>
                        <button class="toggle-btn" onclick="toggleOption('project', 'beta', this)">Project Beta</button>
                        <button class="toggle-btn" onclick="toggleOption('floor', '3rd', this)">3rd Floor</button>
                        <button class="toggle-btn" onclick="toggleOption('floor', '5th', this)">5th Floor</button>
                    </div>
                `
            },
            {
                npcText: "The department budget needs adjusting. We're over by $20K. Cut the travel budget, not the training budget. Also, reallocate $5K from office supplies to the software licenses. Deadline is this Friday.",
                expected: { cut: 'travel', protect: 'training', reallocate: 'software', deadline: 'friday' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('cut', 'travel', this)">Cut: Travel</button>
                        <button class="toggle-btn" onclick="toggleOption('cut', 'training', this)">Cut: Training</button>
                        <button class="toggle-btn" onclick="toggleOption('protect', 'training', this)">Protect: Training</button>
                        <button class="toggle-btn" onclick="toggleOption('protect', 'travel', this)">Protect: Travel</button>
                        <button class="toggle-btn" onclick="toggleOption('reallocate', 'software', this)">Reallocate to: Software</button>
                        <button class="toggle-btn" onclick="toggleOption('reallocate', 'hardware', this)">Reallocate to: Hardware</button>
                        <button class="toggle-btn" onclick="toggleOption('deadline', 'friday', this)">Deadline: Friday</button>
                        <button class="toggle-btn" onclick="toggleOption('deadline', 'nextweek', this)">Deadline: Next Week</button>
                    </div>
                `
            },
            {
                npcText: "There's a conflict between the design and development teams. Schedule a mediation meeting for Thursday morning. Invite both team leads — Sarah from Design and Mike from Dev. Book the large meeting room and order lunch for 8 people.",
                expected: { mediday: 'thursday', meditime: 'morning', design: 'sarah', dev: 'mike', mroom: 'large', lunch: '8' },
                options: `
                    <div class="control-panel">
                        <button class="toggle-btn" onclick="toggleOption('mediday', 'thursday', this)">Day: Thursday</button>
                        <button class="toggle-btn" onclick="toggleOption('mediday', 'tuesday', this)">Day: Tuesday</button>
                        <button class="toggle-btn" onclick="toggleOption('meditime', 'morning', this)">Time: Morning</button>
                        <button class="toggle-btn" onclick="toggleOption('meditime', 'afternoon', this)">Time: Afternoon</button>
                        <button class="toggle-btn" onclick="toggleOption('design', 'sarah', this)">Design: Sarah</button>
                        <button class="toggle-btn" onclick="toggleOption('design', 'alex', this)">Design: Alex</button>
                        <button class="toggle-btn" onclick="toggleOption('dev', 'mike', this)">Dev: Mike</button>
                        <button class="toggle-btn" onclick="toggleOption('dev', 'tom', this)">Dev: Tom</button>
                        <button class="toggle-btn" onclick="toggleOption('mroom', 'large', this)">Large Room</button>
                        <button class="toggle-btn" onclick="toggleOption('mroom', 'small', this)">Small Room</button>
                        <button class="toggle-btn" onclick="toggleOption('lunch', '8', this)">Lunch for 8</button>
                        <button class="toggle-btn" onclick="toggleOption('lunch', '4', this)">Lunch for 4</button>
                    </div>
                `
            }
        ]
    };


    // For special game types (architect, chemistry, courier), keep single round
    if (missionId === 'architect') {
        return [{
            npcText: "We are building the new facility. The SERVER room must be placed in the top right. The LUNCH room must be directly below the SERVER room. The OFFICE must be adjacent to the left of the LUNCH room.",
            expected: { grid_3: 'server', grid_6: 'lunch', grid_5: 'office' },
            current: { grid_1: null, grid_2: null, grid_3: null, grid_4: null, grid_5: null, grid_6: null, grid_7: null, grid_8: null, grid_9: null },
            isSpecial: 'architect',
            options: `
                <div class="architect-container">
                    <div class="architect-grid">
                        <div class="grid-cell" id="grid_1" onclick="placeArchitectItem(this.id)">1</div>
                        <div class="grid-cell" id="grid_2" onclick="placeArchitectItem(this.id)">2</div>
                        <div class="grid-cell" id="grid_3" onclick="placeArchitectItem(this.id)">3</div>
                        <div class="grid-cell" id="grid_4" onclick="placeArchitectItem(this.id)">4</div>
                        <div class="grid-cell" id="grid_5" onclick="placeArchitectItem(this.id)">5</div>
                        <div class="grid-cell" id="grid_6" onclick="placeArchitectItem(this.id)">6</div>
                        <div class="grid-cell" id="grid_7" onclick="placeArchitectItem(this.id)">7</div>
                        <div class="grid-cell" id="grid_8" onclick="placeArchitectItem(this.id)">8</div>
                        <div class="grid-cell" id="grid_9" onclick="placeArchitectItem(this.id)">9</div>
                    </div>
                    <div class="architect-items mt-3" style="display:flex; gap:10px; justify-content:center;">
                        <button class="toggle-btn active" id="arch-server" onclick="selectArchitectItem('server')">Server</button>
                        <button class="toggle-btn" id="arch-lunch" onclick="selectArchitectItem('lunch')">Lunch</button>
                        <button class="toggle-btn" id="arch-office" onclick="selectArchitectItem('office')">Office</button>
                    </div>
                </div>
            `
        }];
    } else if (missionId === 'chemistry') {
        return [{
            npcText: "Professor: You must add the Green chemical first. Do not add the Red chemical unless the Blue chemical has already been added. Provided that you have added Blue, add Yellow last.",
            expected: { sequence: 'green,blue,red,yellow' },
            current: { sequence: [] },
            isSpecial: 'chemistry',
            options: `
                <div class="chemistry-container mt-3">
                    <div class="flask-row">
                        <div class="flask flask-red" onclick="addChemical('red', this)"></div>
                        <div class="flask flask-blue" onclick="addChemical('blue', this)"></div>
                        <div class="flask flask-green" onclick="addChemical('green', this)"></div>
                        <div class="flask flask-yellow" onclick="addChemical('yellow', this)"></div>
                    </div>
                    <div class="cauldron mt-4" id="cauldron">
                        <div class="cauldron-liquid" id="cauldron-liquid"></div>
                    </div>
                    <p class="text-center mt-3" style="color:var(--text-muted)">Sequence: <strong id="chem-sequence" style="color:white">None</strong></p>
                    <button class="btn-secondary mt-2 w-100" onclick="resetChemicals()">Empty Cauldron</button>
                </div>
            `
        }];
    } else if (missionId === 'courier') {
        return [{
            npcText: "GPS: Start at bottom-left. Go straight for two blocks, turn right and go two blocks. The house is on your left.",
            expected: { path: '3_0,2_0,1_0,1_1,1_2' },
            current: { path: ['3_0'] },
            isSpecial: 'courier',
            options: `
                <div class="courier-container mt-3">
                    <div class="courier-grid" id="courier-grid"></div>
                    <button class="btn-secondary mt-3 w-100" onclick="resetCourier()">Reset Route</button>
                </div>
            `
        }];
    }

    return rounds[missionId] || rounds['coffee_shop'];
}

function loadMissionRound(roundIndex) {
    const rounds = window.missionRoundData;
    if (roundIndex >= rounds.length) {
        // All rounds done - calculate final result
        finishMultiRoundGameplay();
        return;
    }

    window.currentMissionRound = roundIndex;
    const round = rounds[roundIndex];

    // Initialize current answers for this round
    const currentAnswers = {};
    if (round.current) {
        // Special game type - use predefined current
        Object.assign(currentAnswers, round.current);
    } else {
        for (let key in round.expected) {
            currentAnswers[key] = null;
        }
    }


    gameScenario = {
        npcText: round.npcText,
        expected: round.expected,
        current: currentAnswers,
        options: round.options
    };

    // Update progress bar
    const totalRounds = rounds.length;
    const progressPercent = ((roundIndex) / totalRounds) * 100;
    const progressBar = document.getElementById('gp-progress');
    const progressText = document.getElementById('gp-progress-text');
    if (progressBar) progressBar.style.width = progressPercent + '%';
    if (progressText) progressText.textContent = `${roundIndex + 1}/${totalRounds}`;

    // Render NPC text
    document.getElementById('gp-npc-text').innerHTML = `"${gameScenario.npcText}"`;

    // Render interaction area
    const interactionArea = document.getElementById('gp-interaction-area');
    interactionArea.innerHTML = gameScenario.options + `
        <button class="btn-primary btn-full mt-4" onclick="validateGameplay()">
            <i class="fa-solid fa-check"></i> ${roundIndex < totalRounds - 1 ? 'Submit & Next Round' : 'Submit & Complete'}
        </button>
    `;

    // Apply Hint Reveal booster if pending
    if (typeof applyHintRevealBooster === 'function') setTimeout(applyHintRevealBooster, 500);

    // Handle special game setup
    const missionId = localStorage.getItem('emh_current_mission');
    if (round.isSpecial === 'architect') {
        window.selectedArchitectItem = 'server';
    } else if (round.isSpecial === 'courier') {
        setTimeout(generateCourierGrid, 100);
    }
}

function toggleOption(category, value, btnEl) {
    playSFX('click');
    gameScenario.current[category] = value;

    // Clear active state for siblings in same category
    const parent = btnEl.parentElement;
    const allBtns = parent.querySelectorAll('.toggle-btn');

    // Custom logic to handle visual selection
    allBtns.forEach(b => {
        if (b.innerText.toLowerCase().includes(value) || b.getAttribute('onclick').includes(`'${value}'`)) {
            b.classList.add('active');
        }
    });

    // Remove active from the unselected one in the same pair
    allBtns.forEach(b => {
        if (b.getAttribute('onclick').includes(`'${category}'`) && !b.getAttribute('onclick').includes(`'${value}'`)) {
            b.classList.remove('active');
        }
    });
}

function selectArchitectItem(item) {
    playSFX('click');
    window.selectedArchitectItem = item;
    document.getElementById('arch-server').classList.remove('active');
    document.getElementById('arch-lunch').classList.remove('active');
    document.getElementById('arch-office').classList.remove('active');
    document.getElementById('arch-' + item).classList.add('active');
}

function placeArchitectItem(gridId) {
    playSFX('click');
    const cell = document.getElementById(gridId);

    // clear this item from any other cell first
    for (let i = 1; i <= 9; i++) {
        if (gameScenario.current['grid_' + i] === window.selectedArchitectItem) {
            gameScenario.current['grid_' + i] = null;
            document.getElementById('grid_' + i).innerHTML = i;
            document.getElementById('grid_' + i).classList.remove('filled');
            document.getElementById('grid_' + i).style.background = 'transparent';
        }
    }

    gameScenario.current[gridId] = window.selectedArchitectItem;
    cell.innerHTML = `<strong>${window.selectedArchitectItem.toUpperCase()}</strong>`;
    cell.classList.add('filled');
    cell.style.background = 'var(--primary-blue)';
}

function addChemical(color, el) {
    if (gameScenario.current.sequence.includes(color)) return; // Already added
    playSFX('click');
    gameScenario.current.sequence.push(color);

    // Animation
    el.style.transform = 'translateY(-20px) rotate(30deg)';
    setTimeout(() => { el.style.transform = 'translateY(0) rotate(0)'; }, 300);

    document.getElementById('chem-sequence').innerText = gameScenario.current.sequence.join(' -> ').toUpperCase();

    // Mix color in cauldron
    const cauldron = document.getElementById('cauldron-liquid');
    cauldron.style.background = `var(--${color === 'yellow' ? 'accent-gold' : color === 'red' ? 'danger' : color === 'green' ? 'success' : 'primary-blue'})`;
    cauldron.style.height = (gameScenario.current.sequence.length * 25) + '%';
}

function resetChemicals() {
    playSFX('click');
    gameScenario.current.sequence = [];
    document.getElementById('chem-sequence').innerText = 'None';
    document.getElementById('cauldron-liquid').style.height = '0%';
}

// --- COURIER LOGIC ---
function generateCourierGrid() {
    const grid = document.getElementById('courier-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const cell = document.createElement('div');
            cell.className = 'courier-cell';
            cell.id = `c_${r}_${c}`;
            if (r === 3 && c === 0) {
                cell.classList.add('start-node');
                cell.innerHTML = '<i class="fa-solid fa-truck"></i>';
            }
            cell.onclick = () => drawCourierPath(r, c, cell);
            grid.appendChild(cell);
        }
    }
}

function drawCourierPath(r, c, cell) {
    const currentPath = gameScenario.current.path;
    const lastNode = currentPath[currentPath.length - 1];
    const targetId = `${r}_${c}`;

    // Prevent clicking already visited nodes
    if (currentPath.includes(targetId)) return;

    // Ensure it's adjacent to last node
    const [lr, lc] = lastNode.split('_').map(Number);
    const isAdjacent = (Math.abs(r - lr) === 1 && c === lc) || (Math.abs(c - lc) === 1 && r === lr);

    if (isAdjacent) {
        playSFX('click');
        currentPath.push(targetId);
        cell.classList.add('path-node');
        cell.innerHTML = '<i class="fa-solid fa-route"></i>';
    }
}

function resetCourier() {
    playSFX('click');
    gameScenario.current.path = ['3_0'];
    generateCourierGrid();
}

function validateGameplay() {
    const expected = gameScenario.expected;
    const current = gameScenario.current;

    let isCorrect = true;

    // Special validation for chemistry sequence
    if (expected.sequence) {
        if (current.sequence.join(',') !== expected.sequence) {
            isCorrect = false;
        }
    } else if (expected.path) {
        // Validation for courier
        if (current.path.join(',') !== expected.path) {
            isCorrect = false;
        }
    } else {
        for (let key in expected) {
            if (expected[key] !== current[key]) {
                isCorrect = false;
                break;
            }
        }
    }

    // Multi-round logic
    if (isCorrect) {
        playSFX('correct');
        window.missionCorrectCount++;
        timeAttackCorrect();
    } else {
        playSFX('wrong');
        timeAttackWrong();
    }

    // Check if there are more rounds
    const nextRound = window.currentMissionRound + 1;
    if (nextRound < window.totalMissionRounds) {
        // Brief delay then load next round
        setTimeout(() => {
            loadMissionRound(nextRound);
        }, 800);
    } else {
        // All rounds done
        setTimeout(() => {
            finishMultiRoundGameplay();
        }, 800);
    }
}

function finishMultiRoundGameplay() {
    // Stop time attack if running
    stopTimeAttack();

    const missionId = localStorage.getItem('emh_current_mission');
    const mission = missionsData[missionId];
    if (!mission) return;

    const correct = window.missionCorrectCount || 0;
    const total = window.totalMissionRounds || 1;
    const ratio = correct / total;

    let resultData = {
        score: 'C',
        xpEarned: Math.floor(mission.xpReward * 0.25),
        accuracy: Math.round(ratio * 100) + '%',
        success: false
    };

    if (ratio >= 1) {
        resultData.score = 'A';
        resultData.xpEarned = mission.xpReward;
        resultData.success = true;
        currentUser.coins += 30;
    } else if (ratio >= 0.66) {
        resultData.score = 'B';
        resultData.xpEarned = Math.floor(mission.xpReward * 0.7);
        resultData.success = true;
        currentUser.coins += 15;
    } else if (ratio >= 0.33) {
        resultData.score = 'C';
        resultData.xpEarned = Math.floor(mission.xpReward * 0.4);
    } else {
        resultData.score = 'D';
        resultData.xpEarned = Math.floor(mission.xpReward * 0.15);
    }

    // Apply Double XP booster if pending
    if (typeof applyDoubleXPBooster === 'function') {
        resultData.xpEarned = applyDoubleXPBooster(resultData.xpEarned);
    }

    currentUser.xp += resultData.xpEarned;
    checkLevelUp();
    unlockAchievement('ach_first_mission');
    
    if (ratio >= 1) unlockAchievement('ach_perfect_score');
    if (currentUser.coins >= 100) unlockAchievement('ach_wealthy');
    
    saveUser();

    localStorage.setItem('emh_last_result', JSON.stringify(resultData));
    navigateTo('result.html');
}

function setupResult() {
    const resultStr = localStorage.getItem('emh_last_result');
    if (!resultStr) {
        navigateTo('dashboard.html');
        return;
    }

    const resultData = JSON.parse(resultStr);
    const scoreEl = document.getElementById('res-score');

    scoreEl.innerText = resultData.score;
    if (resultData.success) {
        scoreEl.className = 'value text-success';
    } else {
        scoreEl.className = 'value text-danger';
    }

    document.getElementById('res-xp').innerText = resultData.xpEarned;
    document.getElementById('res-accuracy').innerText = resultData.accuracy;
}

function checkLevelUp() {
    if (currentUser.xp >= currentUser.nextXp) {
        currentUser.level++;
        currentUser.xp -= currentUser.nextXp;
        currentUser.nextXp = Math.floor(currentUser.nextXp * 1.5);
        alert(`Level Up! You are now Level ${currentUser.level}!`);
        
        if (currentUser.level >= 5) unlockAchievement('ach_level_5');
        if (currentUser.level >= 10) unlockAchievement('ach_level_10');
        if (currentUser.level >= 20) unlockAchievement('ach_level_20');
    }
}

// --- DATA PERSISTENCE ---
function saveUser() {
    localStorage.setItem('emh_user', JSON.stringify(currentUser));
}

function loadUser() {
    const saved = localStorage.getItem('emh_user');
    if (saved) {
        try {
            currentUser = { ...currentUser, ...JSON.parse(saved) };
            if (!currentUser.inventory) currentUser.inventory = [];
            if (!currentUser.activeTheme) currentUser.activeTheme = 'default';
            if (!currentUser.activeBorder) currentUser.activeBorder = 'default';
            if (!currentUser.userLevel) {
                currentUser.userLevel = parseInt(localStorage.getItem('emh_userLevel')) || 1;
            }
        } catch (e) {
            console.error(e);
        }
    }
}

function saveUsers() {
    localStorage.setItem('emh_users', JSON.stringify(users));
}

function loadUsers() {
    const savedUsers = localStorage.getItem('emh_users');
    if (savedUsers) {
        try {
            users = JSON.parse(savedUsers);
        } catch (e) {
            console.error(e);
        }
    }
}

// Event Delegation for globally injected elements
document.addEventListener('click', (e) => {
    if (e.target.closest('#toggle-password')) {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            e.target.closest('#toggle-password').classList.toggle('fa-eye-slash');
        }
    }

    if (e.target.closest('#toggle-reg-password')) {
        const passwordInput = document.getElementById('reg-password');
        if (passwordInput) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            e.target.closest('#toggle-reg-password').classList.toggle('fa-eye-slash');
        }
    }
});

// =============================================================
//  FEATURE 1: TIME-ATTACK MODE
// =============================================================
let gameMode = 'timeattack'; // Always timeattack now
let taTimeLeft = 60;
let taInterval = null;

function startTimeAttack() {
    stopTimeAttack(); // Clear any previous interval
    taTimeLeft = 60;
    updateTimerDisplay();

    // Apply Time Freeze booster if pending
    if (typeof applyTimeFreezeBooster === 'function') applyTimeFreezeBooster();

    taInterval = setInterval(() => {
        taTimeLeft--;
        if (taTimeLeft <= 0) {
            taTimeLeft = 0;
            updateTimerDisplay();
            stopTimeAttack();
            endTimeAttackGame();
            return;
        }
        updateTimerDisplay();
    }, 1000);
}

function stopTimeAttack() {
    if (taInterval) {
        clearInterval(taInterval);
        taInterval = null;
    }
}

function updateTimerDisplay() {
    const valueEl = document.getElementById('ta-timer-value');
    const displayEl = document.getElementById('ta-timer-display');
    if (!valueEl || !displayEl) return;

    valueEl.textContent = taTimeLeft;

    // Critical state: below 10 seconds
    if (taTimeLeft <= 10 && taTimeLeft > 0) {
        displayEl.classList.add('timer-critical');
    } else {
        displayEl.classList.remove('timer-critical');
    }
}

// Called when answering correctly in time-attack mode
function timeAttackCorrect() {
    if (gameMode !== 'timeattack') return;
    taTimeLeft += 3;
    updateTimerDisplay();

    // Visual feedback: bonus animation
    const displayEl = document.getElementById('ta-timer-display');
    if (displayEl) {
        displayEl.classList.remove('timer-critical');
        displayEl.classList.add('timer-bonus');
        setTimeout(() => displayEl.classList.remove('timer-bonus'), 400);
    }
}

// Called when answering wrong in time-attack mode
function timeAttackWrong() {
    if (gameMode !== 'timeattack') return;
    taTimeLeft -= 5;
    if (taTimeLeft < 0) taTimeLeft = 0;
    updateTimerDisplay();

    // Visual feedback: penalty shake animation
    const displayEl = document.getElementById('ta-timer-display');
    if (displayEl) {
        displayEl.classList.add('timer-penalty');
        setTimeout(() => displayEl.classList.remove('timer-penalty'), 400);
    }

    if (taTimeLeft <= 0) {
        stopTimeAttack();
        endTimeAttackGame();
    }
}

function endTimeAttackGame() {
    const missionId = localStorage.getItem('emh_current_mission');
    const mission = missionsData[missionId];

    let resultData = {
        score: 'B',
        xpEarned: mission ? Math.floor(mission.xpReward * 0.5) : 50,
        accuracy: 'Time Up!',
        success: false
    };

    currentUser.xp += resultData.xpEarned;
    checkLevelUp();
    saveUser();

    localStorage.setItem('emh_last_result', JSON.stringify(resultData));
    navigateTo('result.html');
}

// =============================================================
//  FEATURE 2: FLASHCARD 3D SYSTEM
// =============================================================
const flashcardData = [
    { word: 'Boarding Pass', meaning: 'Tiket Naik Pesawat', example: '"May I see your boarding pass, please?"', category: '✈️ Airport' },
    { word: 'Reservation', meaning: 'Reservasi / Pemesanan', example: '"I have a reservation under the name Smith."', category: '🍽️ Restaurant' },
    { word: 'Deadline', meaning: 'Batas Waktu', example: '"The deadline for the report is next Friday."', category: '🏢 Office' },
    { word: 'Beverage', meaning: 'Minuman', example: '"Would you like a hot or cold beverage?"', category: '☕ Coffee Shop' },
    { word: 'Receipt', meaning: 'Struk / Tanda Terima', example: '"Could I have the receipt, please?"', category: '🛒 Shopping' },
    { word: 'Itinerary', meaning: 'Jadwal Perjalanan', example: '"Here is your travel itinerary for the trip."', category: '✈️ Airport' },
    { word: 'Agenda', meaning: 'Agenda / Susunan Acara', example: '"Let\'s go over today\'s meeting agenda."', category: '🏢 Office' },
    { word: 'Fragile', meaning: 'Rapuh / Mudah Pecah', example: '"Please be careful, this package is fragile."', category: '📦 Courier' },
    { word: 'Baggage Claim', meaning: 'Tempat Pengambilan Bagasi', example: '"Baggage claim is on the lower level."', category: '✈️ Airport' },
    { word: 'Appetizer', meaning: 'Hidangan Pembuka', example: '"Would you like to start with an appetizer?"', category: '🍽️ Restaurant' },
    { word: 'Postpone', meaning: 'Menunda', example: '"We have to postpone the meeting until tomorrow."', category: '🏢 Office' },
    { word: 'Barista', meaning: 'Pembuat Kopi', example: '"The barista here makes the best latte art."', category: '☕ Coffee Shop' },
    { word: 'Discount', meaning: 'Potongan Harga', example: '"Is there any discount on this item?"', category: '🛒 Shopping' },
    { word: 'Express Delivery', meaning: 'Pengiriman Kilat', example: '"I need this sent via express delivery."', category: '📦 Courier' },
    { word: 'Layover', meaning: 'Waktu Transit', example: '"I have a three-hour layover in Dubai."', category: '✈️ Airport' }
];

let currentFlashcardIndex = 0;

function initFlashcards() {
    currentFlashcardIndex = 0;
    renderFlashcard();
}

function renderFlashcard() {
    const card = flashcardData[currentFlashcardIndex];
    if (!card) return;

    const wordEl = document.getElementById('fc-word');
    const meaningEl = document.getElementById('fc-meaning');
    const exampleEl = document.getElementById('fc-example');
    const categoryEl = document.getElementById('fc-category');
    const counterEl = document.getElementById('fc-counter');
    const flashcardEl = document.getElementById('flashcard');

    if (wordEl) wordEl.textContent = card.word;
    if (meaningEl) meaningEl.textContent = card.meaning;
    if (exampleEl) exampleEl.textContent = card.example;
    if (categoryEl) categoryEl.textContent = card.category;
    if (counterEl) counterEl.textContent = `${currentFlashcardIndex + 1} / ${flashcardData.length}`;

    // Reset flip state when navigating
    if (flashcardEl) flashcardEl.classList.remove('flipped');
}

function flipFlashcard() {
    const flashcardEl = document.getElementById('flashcard');
    if (flashcardEl) {
        flashcardEl.classList.toggle('flipped');
        playSFX('click');
        
        // Track flashcard flips for achievement
        if (flashcardEl.classList.contains('flipped')) {
            currentUser.flashcardFlips = (currentUser.flashcardFlips || 0) + 1;
            if (currentUser.flashcardFlips >= 10) {
                unlockAchievement('ach_flashcard_learner');
            }
            saveUser();
        }
    }
}

function nextFlashcard(event) {
    event.stopPropagation(); // Prevent flip
    playSFX('click');
    currentFlashcardIndex = (currentFlashcardIndex + 1) % flashcardData.length;
    renderFlashcard();
}

function prevFlashcard(event) {
    event.stopPropagation(); // Prevent flip
    playSFX('click');
    currentFlashcardIndex = (currentFlashcardIndex - 1 + flashcardData.length) % flashcardData.length;
    renderFlashcard();
}

// =============================================================
//  FEATURE 3: PLACEMENT TEST
// =============================================================
const placementQuestionPool = [
    // --- TIER 1: Beginner (Basic grammar & vocabulary) ---
    {
        question: 'Choose the correct sentence:',
        options: ['She go to school every day.', 'She goes to school every day.', 'She going to school every day.', 'She gone to school every day.'],
        correct: 1, tier: 1
    },
    {
        question: 'Which sentence is correct?',
        options: ['He don\'t like coffee.', 'He doesn\'t likes coffee.', 'He doesn\'t like coffee.', 'He not like coffee.'],
        correct: 2, tier: 1
    },
    {
        question: 'Fill in the blank: "I ___ a student."',
        options: ['is', 'am', 'are', 'be'],
        correct: 1, tier: 1
    },
    {
        question: 'What is the plural of "child"?',
        options: ['childs', 'childrens', 'children', 'childes'],
        correct: 2, tier: 1
    },
    {
        question: 'Choose the correct word: "She is ___ teacher."',
        options: ['a', 'an', 'the', 'is'],
        correct: 0, tier: 1
    },
    {
        question: 'Which one is a greeting?',
        options: ['Goodbye', 'Hello', 'Sorry', 'Thanks'],
        correct: 1, tier: 1
    },
    // --- TIER 2: Elementary (Simple past, prepositions) ---
    {
        question: 'What is the past tense of "buy"?',
        options: ['buyed', 'buied', 'bought', 'boughted'],
        correct: 2, tier: 2
    },
    {
        question: 'Choose the correct sentence:',
        options: ['I goed to the store.', 'I went to the store.', 'I wented to the store.', 'I go to the store yesterday.'],
        correct: 1, tier: 2
    },
    {
        question: 'Fill in the blank: "The book is ___ the table."',
        options: ['in', 'at', 'on', 'to'],
        correct: 2, tier: 2
    },
    {
        question: 'What is the past tense of "eat"?',
        options: ['eated', 'ate', 'eaten', 'eating'],
        correct: 1, tier: 2
    },
    {
        question: 'Choose the correct word: "They ___ to the park yesterday."',
        options: ['go', 'goes', 'went', 'going'],
        correct: 2, tier: 2
    },
    {
        question: 'Which sentence uses the correct preposition?',
        options: ['I arrive to home at 5.', 'I arrive at home at 5.', 'I arrive in home at 5.', 'I arrive on home at 5.'],
        correct: 1, tier: 2
    },
    // --- TIER 3: Intermediate (Conditionals, modals, relative clauses) ---
    {
        question: 'Fill in the blank: "If I ___ rich, I would travel the world."',
        options: ['am', 'was', 'were', 'be'],
        correct: 2, tier: 3
    },
    {
        question: 'Which word means "to make something better"?',
        options: ['Worsen', 'Improve', 'Decline', 'Ignore'],
        correct: 1, tier: 3
    },
    {
        question: 'Choose the correct sentence:',
        options: ['She must to go now.', 'She must goes now.', 'She must go now.', 'She must going now.'],
        correct: 2, tier: 3
    },
    {
        question: 'Fill in the blank: "The man ___ lives next door is a doctor."',
        options: ['which', 'who', 'whom', 'whose'],
        correct: 1, tier: 3
    },
    {
        question: 'What does "postpone" mean?',
        options: ['To cancel', 'To delay', 'To start early', 'To finish'],
        correct: 1, tier: 3
    },
    {
        question: 'Choose the correct form: "You ___ wear a seatbelt. It\'s the law."',
        options: ['should', 'might', 'must', 'could'],
        correct: 2, tier: 3
    },
    // --- TIER 4: Advanced (Perfect tenses, passive, complex structures) ---
    {
        question: 'Choose the correct form: "By next year, I ___ here for five years."',
        options: ['will work', 'will have worked', 'am working', 'have worked'],
        correct: 1, tier: 4
    },
    {
        question: 'Which sentence is in the passive voice?',
        options: ['The chef cooked the meal.', 'The meal was cooked by the chef.', 'The chef is cooking the meal.', 'The chef will cook the meal.'],
        correct: 1, tier: 4
    },
    {
        question: 'Fill in the blank: "She ___ for three hours before she finally finished."',
        options: ['has studied', 'had been studying', 'was study', 'is studying'],
        correct: 1, tier: 4
    },
    {
        question: 'Choose the correct word: "He acted as if he ___ the answer."',
        options: ['knows', 'knew', 'know', 'knowing'],
        correct: 1, tier: 4
    },
    {
        question: 'What is the meaning of "ubiquitous"?',
        options: ['Rare', 'Found everywhere', 'Dangerous', 'Beautiful'],
        correct: 1, tier: 4
    },
    {
        question: 'Choose the correct form: "Not only ___ late, but he also forgot the documents."',
        options: ['he was', 'was he', 'he is', 'is he'],
        correct: 1, tier: 4
    },
    // --- TIER 5: Expert (Nuanced grammar, idiomatic, academic) ---
    {
        question: 'Choose the correct sentence:',
        options: [
            'Had I known, I would have helped.',
            'If I would have known, I would have helped.',
            'Had I knew, I would have helped.',
            'If I had knew, I would help.'
        ],
        correct: 0, tier: 5
    },
    {
        question: 'What does the idiom "to bite the bullet" mean?',
        options: ['To eat quickly', 'To endure a painful situation bravely', 'To make a mistake', 'To start an argument'],
        correct: 1, tier: 5
    },
    {
        question: 'Fill in the blank: "The theory, ___ was proposed in 1905, revolutionized physics."',
        options: ['that', 'which', 'what', 'who'],
        correct: 1, tier: 5
    },
    {
        question: 'Choose the best word: "The results were ___ with previous findings."',
        options: ['consisted', 'consistent', 'consisting', 'consists'],
        correct: 1, tier: 5
    },
    {
        question: 'Which sentence demonstrates correct use of the subjunctive mood?',
        options: [
            'I suggest that he goes home.',
            'I suggest that he go home.',
            'I suggest that he went home.',
            'I suggest that he is going home.'
        ],
        correct: 1, tier: 5
    },
    {
        question: 'What does "notwithstanding" mean?',
        options: ['Because of', 'In spite of', 'According to', 'Instead of'],
        correct: 1, tier: 5
    }
];

let ptCurrentIndex = 0;
let ptScore = 0;
let ptRegisteredUser = null;
let ptActiveQuestions = []; // The 5 randomly selected questions for this session

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function pickPlacementQuestions() {
    // Pick 1 random question from each tier (1-5) for a balanced test
    const selected = [];
    for (let tier = 1; tier <= 5; tier++) {
        const tierQuestions = placementQuestionPool.filter(q => q.tier === tier);
        const shuffled = shuffleArray(tierQuestions);
        if (shuffled.length > 0) selected.push(shuffled[0]);
    }
    return selected;
}

function showPlacementTest(registeredUsername) {
    ptCurrentIndex = 0;
    ptScore = 0;
    ptRegisteredUser = registeredUsername;
    ptActiveQuestions = pickPlacementQuestions();

    const overlay = document.getElementById('placement-test-overlay');
    if (!overlay) return;

    overlay.classList.add('show');

    // Show question area, hide result
    const qArea = document.getElementById('pt-question-area');
    const rArea = document.getElementById('pt-result-area');
    if (qArea) qArea.style.display = 'block';
    if (rArea) rArea.style.display = 'none';

    renderPlacementQuestion();
}

function renderPlacementQuestion() {
    if (ptCurrentIndex >= ptActiveQuestions.length) {
        finishPlacementTest(ptScore);
        return;
    }

    const q = ptActiveQuestions[ptCurrentIndex];
    const questionText = document.getElementById('pt-question-text');
    const optionsContainer = document.getElementById('pt-options');

    if (questionText) questionText.textContent = `Q${ptCurrentIndex + 1}. ${q.question}`;

    // Update progress dots
    const dots = document.querySelectorAll('#pt-progress .pt-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'done');
        if (i < ptCurrentIndex) dot.classList.add('done');
        if (i === ptCurrentIndex) dot.classList.add('active');
    });

    // Render options
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'pt-option';
            btn.textContent = opt;
            btn.onclick = () => selectPlacementAnswer(i, btn);
            optionsContainer.appendChild(btn);
        });
    }
}

function selectPlacementAnswer(selectedIndex, btnEl) {
    const q = ptActiveQuestions[ptCurrentIndex];
    const allOptions = document.querySelectorAll('#pt-options .pt-option');

    // Disable all options
    allOptions.forEach(opt => {
        opt.style.pointerEvents = 'none';
    });

    // Show correct/wrong
    if (selectedIndex === q.correct) {
        btnEl.classList.add('correct');
        ptScore++;
        playSFX('correct');
    } else {
        btnEl.classList.add('wrong');
        allOptions[q.correct].classList.add('correct');
        playSFX('wrong');
    }

    // Move to next question after delay
    setTimeout(() => {
        ptCurrentIndex++;
        renderPlacementQuestion();
    }, 1000);
}

function finishPlacementTest(score) {
    // Determine user level based on score
    let userLevel, levelName;
    if (score <= 1) {
        userLevel = 1;
        levelName = 'Beginner';
    } else if (score <= 2) {
        userLevel = 2;
        levelName = 'Elementary';
    } else if (score <= 3) {
        userLevel = 3;
        levelName = 'Intermediate';
    } else if (score <= 4) {
        userLevel = 4;
        levelName = 'Advanced';
    } else {
        userLevel = 5;
        levelName = 'Expert';
    }

    // Save userLevel AND level to the registered user
    if (ptRegisteredUser) {
        const userIndex = users.findIndex(u => u.username === ptRegisteredUser);
        if (userIndex !== -1) {
            users[userIndex].userLevel = userLevel;
            users[userIndex].level = userLevel;
            // Scale nextXp so higher-level users have appropriate thresholds
            let scaledNextXp = 100;
            for (let i = 1; i < userLevel; i++) {
                scaledNextXp = Math.floor(scaledNextXp * 1.5);
            }
            users[userIndex].nextXp = scaledNextXp;
            saveUsers();
        }
    }

    // Save to localStorage independently
    localStorage.setItem('emh_userLevel', userLevel.toString());

    // Show result UI
    const qArea = document.getElementById('pt-question-area');
    const rArea = document.getElementById('pt-result-area');
    if (qArea) qArea.style.display = 'none';
    if (rArea) rArea.style.display = 'block';

    // Update all progress dots to done
    const dots = document.querySelectorAll('#pt-progress .pt-dot');
    dots.forEach(dot => {
        dot.classList.remove('active');
        dot.classList.add('done');
    });

    const badge = document.getElementById('pt-level-badge');
    const desc = document.getElementById('pt-result-desc');
    if (badge) badge.textContent = `Level ${userLevel} - ${levelName}`;
    if (desc) desc.textContent = `You scored ${score}/5. You'll start at Level ${userLevel} (${levelName}).`;
}

function finalizePlacementAndLogin() {
    playSFX('correct');
    navigateTo('login.html');
}

// =============================================================
//  FEATURE 3b: MAP PROGRESSION
// =============================================================
function initMapProgression() {
    // Read userLevel from placement test or localStorage
    let placementLevel = currentUser.userLevel || parseInt(localStorage.getItem('emh_userLevel')) || 0;

    // Use the HIGHER of XP-based level and placement test level
    // This ensures existing users who never took the test still have full access
    let effectiveLevel = Math.max(currentUser.level || 1, placementLevel);

    // Sync to currentUser
    currentUser.userLevel = effectiveLevel;

    // Iterate all map nodes and unlock/lock based on level
    const mapNodes = document.querySelectorAll('.map-node[data-level]');
    mapNodes.forEach(node => {
        const nodeLevel = parseInt(node.getAttribute('data-level'));
        if (nodeLevel <= effectiveLevel) {
            node.classList.remove('locked');
            node.classList.add('unlocked');
        } else {
            node.classList.remove('unlocked');
            node.classList.add('locked');
        }
    });
}

function handleMapNodeClick(missionId, nodeEl) {
    if (nodeEl.classList.contains('locked')) {
        playSFX('wrong');
        // Shake animation
        nodeEl.style.animation = 'timerPenalty 0.4s ease-out';
        setTimeout(() => nodeEl.style.animation = '', 400);
        return;
    }
    openMissionDetail(missionId);
}

// =============================================================
//  BOOSTER INTEGRATION
// =============================================================
// Apply Time Freeze booster when starting time-attack
function applyTimeFreezeBooster() {
    if (currentUser.pendingBooster === 'timefreeze') {
        taTimeLeft += 15;
        updateTimerDisplay();
        currentUser.pendingBooster = null;
        saveUser();
        showShopNotification('Time Freeze used! +15 seconds added.', 'booster');
    }
}

// Apply Double XP booster to earned XP
function applyDoubleXPBooster(xpEarned) {
    if (currentUser.pendingBooster === 'doublexp') {
        currentUser.pendingBooster = null;
        saveUser();
        showShopNotification(`Double XP! ${xpEarned} -> ${xpEarned * 2} XP`, 'booster');
        return xpEarned * 2;
    }
    return xpEarned;
}

// Apply Hint Reveal booster - highlights correct answers for 2 seconds
function applyHintRevealBooster() {
    if (currentUser.pendingBooster === 'hint') {
        currentUser.pendingBooster = null;
        saveUser();

        const round = window.missionRoundData[window.currentMissionRound];
        if (!round || round.isSpecial) return;

        const expected = round.expected;
        const btns = document.querySelectorAll('.toggle-btn');
        btns.forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            for (let key in expected) {
                if (onclick.includes(`'${key}'`) && onclick.includes(`'${expected[key]}'`)) {
                    btn.style.boxShadow = '0 0 20px var(--success)';
                    btn.style.borderColor = 'var(--success)';
                    setTimeout(() => {
                        btn.style.boxShadow = '';
                        btn.style.borderColor = '';
                    }, 2000);
                }
            }
        });
        showShopNotification('Hint revealed! Correct answers highlighted.', 'booster');
    }
}

