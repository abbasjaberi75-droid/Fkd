import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyAwhrDYLACJzYtR8ct4-Aqc47JH0ry2Uo4",
  authDomain: "dkdks-b55b2.firebaseapp.com",
  projectId: "dkdks-b55b2",
  storageBucket: "dkdks-b55b2.firebasestorage.app",
  messagingSenderId: "294287233762",
  appId: "1:294287233762:web:eb6659a6ab685293d904bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let users = [];
let currentUserId = null;

// ================= نظام PWA وتثبيت التطبيق =================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(!sessionStorage.getItem('promoShown')) {
        document.getElementById('installPromoModal').classList.add('active');
        sessionStorage.setItem('promoShown', 'true');
    }
});
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}
window.installApp = async function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        closeInstallPromo();
    } else {
        customAlert("التطبيق مثبت بالفعل أو أن متصفحك لا يدعم التثبيت المباشر. يمكنك التثبيت من إعدادات المتصفح.");
    }
}
window.closeInstallPromo = function() {
    document.getElementById('installPromoModal').classList.remove('active');
}

// ================= النوافذ المنبثقة =================
window.customAlert = function(msg) {
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlertModal').classList.add('active');
}
window.closeCustomAlert = function() {
    document.getElementById('customAlertModal').classList.remove('active');
}
window.customConfirm = function(msg, onYes) {
    document.getElementById('confirmMsg').innerText = msg;
    document.getElementById('confirmYesBtn').onclick = function() { closeCustomConfirm(); onYes(); };
    document.getElementById('customConfirmModal').classList.add('active');
}
window.closeCustomConfirm = function() {
    document.getElementById('customConfirmModal').classList.remove('active');
}

// ================= إعدادات المظهر =================
window.toggleTheme = function() {
    let body = document.body;
    let isDark = body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.querySelectorAll('.theme-icon').forEach(icon => {
            icon.classList.remove('fa-sun'); icon.classList.add('fa-moon');
        });
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.querySelectorAll('.theme-icon').forEach(icon => {
            icon.classList.remove('fa-moon'); icon.classList.add('fa-sun');
        });
    }
}
function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.querySelectorAll('.theme-icon').forEach(icon => {
            icon.classList.remove('fa-moon'); icon.classList.add('fa-sun');
        });
    }
}

// ================= جلب البيانات =================
async function loadUsersFromDB() {
    try {
        const querySnapshot = await getDocs(collection(db, "subscribers"));
        users = [];
        querySnapshot.forEach((doc) => { users.push(doc.data()); });
        renderHome();
    } catch (e) {
        customAlert("حدث خطأ في جلب البيانات من الخادم، تأكد من اتصالك بالإنترنت.");
    }
}

initTheme();
loadUsersFromDB(); 

// ================= الدوال المساعدة =================
function formatDateTimeLocal(date) {
    let d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}
function formatDateDisplay(dateStr) {
    let d = new Date(dateStr);
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    let minutes = String(d.getMinutes()).padStart(2, '0');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${yyyy}/${mm}/${dd} ${hours}:${minutes} ${ampm}`;
}
function calculateTimeStatus(startDateStr, endDateStr) {
    let now = new Date();
    let end = new Date(endDateStr);
    let diffMs = end - now;
    if (diffMs <= 0) return { status: 'غير متصل', text: 'منتهي', colorClass: 'status-offline' };
    let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { status: 'متصل', text: `باقي ${diffDays} يوم و ${diffHours} ساعة`, colorClass: 'status-online' };
}
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// ================= الوظائف الرئيسية =================
window.goHome = function() { showView('view-home'); currentUserId = null; renderHome(); }

window.renderHome = function() {
    const list = document.getElementById('subscribersList');
    list.innerHTML = '';
    
    users.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    if(users.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">لا يوجد مشتركين.</p>';
        return;
    }
    users.forEach(user => {
        let timeData = calculateTimeStatus(user.startDate, user.endDate);
        let card = document.createElement('div');
        card.className = 'user-card';
        card.onclick = () => openProfile(user.id);
        card.innerHTML = `
            <div class="user-info">
                <h4>${user.name}</h4>
                <p><span class="${timeData.colorClass}">● ${timeData.text}</span> | ${Number(user.price).toLocaleString()} د.ع</p>
            </div>
            <div class="user-actions-list">
                <button class="btn-icon-small edit-btn" onclick="openEditModalFromList(${user.id}, event)"><i class="fas fa-pen"></i></button>
                <button class="btn-icon-small delete-btn" onclick="deleteUserBtn(${user.id}, event)"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.openAddModal = function() {
    currentUserId = null;
    document.getElementById('modalTitle').innerText = 'إضافة مشترك جديد';
    document.getElementById('f-id').value = '';
    document.getElementById('f-name').value = '';
    document.getElementById('f-phone').value = '';
    document.getElementById('f-package').value = '';
    document.getElementById('f-price').value = '';
    document.getElementById('f-tower').value = '';
    document.getElementById('f-user').value = '';
    document.getElementById('f-start-date').value = formatDateTimeLocal(new Date());
    document.getElementById('userModal').classList.add('active');
}

window.openEditModalFromList = function(id, event) {
    event.stopPropagation();
    currentUserId = id;
    window.openEditModal();
}

window.openEditModal = function() {
    let user = users.find(u => u.id === currentUserId);
    if(!user) return;
    document.getElementById('modalTitle').innerText = 'تعديل معلومات المشترك';
    document.getElementById('f-id').value = user.id;
    document.getElementById('f-name').value = user.name;
    document.getElementById('f-phone').value = user.phone;
    document.getElementById('f-package').value = user.package;
    document.getElementById('f-price').value = user.price;
    document.getElementById('f-tower').value = user.tower;
    document.getElementById('f-user').value = user.user;
    document.getElementById('f-start-date').value = formatDateTimeLocal(user.startDate);
    document.getElementById('userModal').classList.add('active');
}

window.closeModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

window.saveUser = async function() {
    let fIdVal = document.getElementById('f-id').value;
    let finalId = fIdVal ? parseInt(fIdVal) : Date.now(); 
    let startDateObj = new Date(document.getElementById('f-start-date').value || new Date());
    let endDateObj = new Date(startDateObj.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    let newUser = {
        id: finalId,
        name: document.getElementById('f-name').value,
        phone: document.getElementById('f-phone').value,
        package: document.getElementById('f-package').value || 'Default',
        price: document.getElementById('f-price').value || 0,
        tower: document.getElementById('f-tower').value || 'N/A',
        user: document.getElementById('f-user').value || 'N/A',
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        history: []
    };
    
    if(!newUser.name || !newUser.phone) { customAlert("الاسم ورقم الهاتف مطلوبان!"); return; }
    window.closeModals();
    
    try {
        if (fIdVal) {
            let index = users.findIndex(u => u.id === finalId);
            if(index !== -1) { newUser.history = users[index].history; users[index] = newUser; }
        } else {
            // تسجيل الرصيد الأولي في السجل مع تاريخ واضح
            if (newUser.price > 0 || newUser.price < 0) {
                newUser.history.push({
                    id: Date.now(), type: 'deposit', amount: parseFloat(newUser.price),
                    date: formatDateDisplay(new Date().toISOString()), balance: parseFloat(newUser.price)
                });
            }
            users.unshift(newUser); 
        }
        await setDoc(doc(db, "subscribers", String(finalId)), newUser);
        window.goHome();
    } catch(e) {
        customAlert("حدث خطأ في حفظ البيانات!");
    }
}

window.deleteUserBtn = function(id, event) {
    if(event) event.stopPropagation(); 
    customConfirm('هل أنت متأكد من حذف هذا المشترك نهائياً؟ لا يمكن التراجع.', async () => {
        try {
            await deleteDoc(doc(db, "subscribers", String(id)));
            users = users.filter(u => u.id !== id);
            window.goHome();
        } catch(e) {
            customAlert("حدث خطأ أثناء الحذف.");
        }
    });
}

window.openProfile = function(id) {
    currentUserId = id;
    let user = users.find(u => u.id === id);
    if(!user) return;
    let timeData = calculateTimeStatus(user.startDate, user.endDate);
    document.getElementById('p-name').innerText = user.name;
    document.getElementById('p-deposit').innerText = `${Number(user.price).toLocaleString()} د.ع`;
    document.getElementById('p-package').innerText = user.package;
    document.getElementById('p-tower').innerText = user.tower;
    document.getElementById('p-user').innerText = user.user;
    
    let cleanPhone = user.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    let phoneLink = document.getElementById('p-phone');
    phoneLink.innerText = `+964 ${cleanPhone}`;
    phoneLink.href = `tel:+964${cleanPhone}`; 
    
    let statusEl = document.getElementById('p-status');
    statusEl.innerHTML = `<i class="fas fa-circle" style="color: ${timeData.colorClass === 'status-online' ? 'var(--success-green)' : 'var(--text-main)'}"></i>`;
    document.getElementById('p-days').innerText = timeData.text;
    document.getElementById('p-end-date').innerText = formatDateDisplay(user.endDate);
    showView('view-profile');
}

window.openRenewModal = function() {
    document.getElementById('r-date').value = formatDateTimeLocal(new Date());
    document.getElementById('renewModal').classList.add('active');
}

window.confirmRenew = async function() {
    let user = users.find(u => u.id === currentUserId);
    let selectedDate = new Date(document.getElementById('r-date').value);
    user.startDate = selectedDate.toISOString();
    user.endDate = new Date(selectedDate.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString();
    
    window.closeModals();
    try {
        await setDoc(doc(db, "subscribers", String(currentUserId)), user);
        window.openProfile(currentUserId);
    } catch(e) {
        customAlert("حدث خطأ أثناء التجديد.");
    }
}

window.sendWhatsApp = function() {
    let user = users.find(u => u.id === currentUserId);
    let text = encodeURIComponent(document.getElementById('shareText').value);
    let phone = user.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    window.open(`https://wa.me/964${phone}?text=${text}`, '_blank');
    window.closeModals();
}

window.openShareModal = function() {
    let user = users.find(u => u.id === currentUserId);
    
    let now = new Date();
    let end = new Date(user.endDate);
    let diffMs = end - now;
    let timeRemainingText = "";
    
    if (diffMs > 0) {
        let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timeRemainingText = `وما زال أمامك ${diffDays} يوم و ${diffHours} ساعة على نهاية الاشتراك.`;
    } else {
        timeRemainingText = `وقد انتهى الاشتراك.`;
    }

    let balance = parseFloat(user.price) || 0;
    let balanceType = balance >= 0 ? "(ايداع)" : "(دين)";
    let balanceAbs = Math.abs(balance).toLocaleString();
    let dateOnly = formatDateDisplay(user.endDate).split(' ')[0];

    let message = `مرحباً ${user.name}،\n\nنود إبلاغك بأن اشتراكك من النوع ${user.package || 'غير محدد'} ينتهي في تاريخ ${dateOnly}، ${timeRemainingText}\n\nكما نذكرك بمستحقاتك المالية، التي تبلغ حاليًا ${balanceAbs} د.ع ${balanceType}.\n\nفي حال احتجت أي مساعدة أو لديك أي استفسارات، لا تتردد بالتواصل معنا.\n\nتحياتنا`;
    
    document.getElementById('shareText').value = message;
    document.getElementById('shareModal').classList.add('active');
}

window.openDepositModal = function() {
    document.getElementById('t-amount').value = '';
    document.getElementById('depositModal').classList.add('active');
}

window.saveTransaction = async function() {
    let user = users.find(u => u.id === currentUserId);
    let type = document.getElementById('t-type').value;
    let amount = parseFloat(document.getElementById('t-amount').value);
    if(!amount) return;
    
    let currentBalance = parseFloat(user.price) || 0;
    let newBalance = type === 'deposit' ? currentBalance + amount : currentBalance - amount;
    
    // إضافة التاريخ والوقت بوضوح للحركة المالية
    user.history.unshift({
        id: Date.now(), type: type, amount: amount,
        date: formatDateDisplay(new Date().toISOString()), balance: newBalance
    });
    
    user.price = newBalance;
    window.closeModals();
    
    try {
        await setDoc(doc(db, "subscribers", String(currentUserId)), user);
        window.openProfile(currentUserId);
    } catch(e) {
        customAlert("حدث خطأ مالي.");
    }
}

window.openHistory = function() {
    let user = users.find(u => u.id === currentUserId);
    let list = document.getElementById('historyList');
    list.innerHTML = '';
    if(!user.history || user.history.length === 0) { 
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">لا يوجد سجل حركات حتى الآن.</p>'; 
    } else {
        user.history.forEach(tx => {
            let isDeposit = tx.type === 'deposit';
            list.innerHTML += `
                <div class="history-card">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div class="history-icon ${isDeposit ? 'bg-green' : 'bg-orange'}">
                            <i class="fas ${isDeposit ? 'fa-money-bill-wave' : 'fa-hand-holding-usd'}"></i>
                        </div>
                        <div>
                            <h4>${isDeposit ? 'إيداع' : 'إضافة دين'} ${tx.amount.toLocaleString()} د.ع</h4>
                            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;"><i class="fas fa-clock"></i> ${tx.date || 'تاريخ غير متوفر'}</p>
                            <p style="font-size:12px; margin-top:5px; font-weight:bold; color:var(--primary-blue);">الرصيد بعد العملية: ${tx.balance.toLocaleString()} د.ع</p>
                        </div>
                    </div>
                </div>`;
        });
    }
    showView('view-history');
}

window.closeHistory = function() { showView('view-profile'); }

window.filterUsers = function() {
    let val = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.user-card').forEach(card => {
        let name = card.querySelector('h4').innerText.toLowerCase();
        card.style.display = name.includes(val) ? 'flex' : 'none';
    });
}
