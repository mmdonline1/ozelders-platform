// GitHub Whitelist Dosya Linki
const GITHUB_TEACHERS_JSON_URL = "https://raw.githubusercontent.com/KULLANICI_ADIN/REPO_ADIN/main/teachers.json";

let currentUser = null;
let activeLocalStream = null;
let activeScreenStream = null;

// GitHub Whitelist Kontrolü ile Giriş Yapma
async function handleGitHubValidatedLogin() {
    const nameInput = document.getElementById('loginNameInput').value.trim();
    const emailInput = document.getElementById('loginEmailInput').value.trim().toLowerCase();

    if (!nameInput || !emailInput) {
        alert("Lütfen adınızı ve e-posta adresinizi girin.");
        return;
    }

    let isTeacher = false;

    try {
        const response = await fetch(GITHUB_TEACHERS_JSON_URL);
        if (response.ok) {
            const data = await response.json();
            if (data.teachers && data.teachers.includes(emailInput)) {
                isTeacher = true;
            }
        }
    } catch (error) {
        console.warn("GitHub Whitelist okunamadı, lokal yedek kontrol aktif.", error);
        // Lokal test için e-postanda 'mustafa' veya 'admin' geçiyorsa öğretmen sayar
        if (emailInput.includes("mustafa") || emailInput.includes("admin")) {
            isTeacher = true;
        }
    }

    currentUser = {
        name: nameInput,
        email: emailInput,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput)}&background=6366f1&color=fff`,
        isTeacher: isTeacher
    };

    initAppSession();
}

// Oturumu Başlat (Panelleri Kesin Olarak Ayrıştırır)
function initAppSession() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';

    document.getElementById('userAvatar').src = currentUser.picture;
    document.getElementById('userDisplayName').innerText = currentUser.name;

    if (currentUser.isTeacher) {
        // ÖĞRETMEN: Sadece ders listesi ve canlı oda görür. Satın alma vs. kesinlikle yoktur.
        document.getElementById('userRoleBadge').innerText = "Öğretmen";
        document.getElementById('teacherPanel').style.display = 'block';
        document.getElementById('studentPanel').style.display = 'none';
        document.getElementById('teacherGreetingName').innerText = currentUser.name;
        loadTeacherSchedule();
    } else {
        // ÖĞRENCİ: Ders paketleri, ilerleme ve QR satın alma marketini görür.
        document.getElementById('userRoleBadge').innerText = "Öğrenci";
        document.getElementById('studentPanel').style.display = 'block';
        document.getElementById('teacherPanel').style.display = 'none';
        document.getElementById('studentGreetingName').innerText = currentUser.name;
        loadStudentPackages();
    }
}

// Öğrenci Paketleri & Market Alanı
function loadStudentPackages() {
    const container = document.getElementById('studentPackageList');
    container.innerHTML = `
        <div class="card">
            <h3>8. Sınıf LGS Matematik</h3>
            <p style="color:#9ca3af; font-size:0.85rem; margin-top:0.3rem;">3 / 8 Ders Tamamlandı</p>
            <div class="progress-bar"><div class="progress-fill" style="width: 37.5%;"></div></div>
            <button class="btn btn-primary" style="margin-top:1rem;" onclick="enterClassroom('mat-101', false)">🎥 Derse Katıl</button>
        </div>
    `;
}

// Öğretmen Programı (Sadece Ders Odası Girişi)
function loadTeacherSchedule() {
    const container = document.getElementById('teacherScheduleList');
    container.innerHTML = `
        <div class="card">
            <h3>Birebir Matematik - Ders #4</h3>
            <p style="color:#9ca3af; font-size:0.85rem; margin:0.3rem 0;">Öğrenci Bağlantı Bekleniyor</p>
            <button class="btn btn-primary" onclick="enterClassroom('mat-101', true)">🚀 Derse Başla & Ekran Paylaş</button>
        </div>
    `;
}

// Canlı Sınıf Odası & WebRTC Akışı
async function enterClassroom(roomId, isTeacher) {
    document.querySelectorAll('.panel-section').forEach(el => el.style.display = 'none');
    document.getElementById('liveRoom').style.display = 'block';

    try {
        activeLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (isTeacher) {
            document.getElementById('teacherCam').srcObject = activeLocalStream;
            document.getElementById('teacherShareBtn').style.display = 'block';
            startScreenShare(); // Öğretmen girdiğinde ekran paylaşımı otomatik açılır
        } else {
            document.getElementById('studentCam').srcObject = activeLocalStream;
            document.getElementById('teacherShareBtn').style.display = 'none';
        }
    } catch (e) {
        alert("Kamera ve mikrofon izni verilmedi.");
    }
}

// Ekran Paylaşımı
async function startScreenShare() {
    try {
        activeScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.getElementById('sharedScreenVideo');
        video.srcObject = activeScreenStream;
        video.style.display = 'block';
        document.getElementById('noScreenText').style.display = 'none';

        activeScreenStream.getVideoTracks()[0].onended = () => {
            video.style.display = 'none';
            document.getElementById('noScreenText').style.display = 'block';
        };
    } catch (e) {
        console.log("Ekran paylaşımı iptal edildi.");
    }
}

// QR / FAST Ödeme Modali (Sadece Öğrencide Çalışır)
function startQRPayment(pkgName, price) {
    const refCode = "REF-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('modalPackageTitle').innerText = pkgName;
    document.getElementById('modalPriceTag').innerText = price + " ₺";
    document.getElementById('paymentRefCode').innerText = refCode;

    const qrData = `FAST-TRANSFER-PRICE:${price}-REF:${refCode}-USER:${currentUser.email}`;
    document.getElementById('dynamicQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function completePaymentSimulation() {
    alert("Ödeme FAST/QR referansı ile eşleştirildi! Ders hakkınız hesabınıza otomatik tanımlandı.");
    closePaymentModal();
}

// Dersten Çıkış
function leaveClassroom() {
    if (activeLocalStream) activeLocalStream.getTracks().forEach(t => t.stop());
    if (activeScreenStream) activeScreenStream.getTracks().forEach(t => t.stop());
    
    if (currentUser.isTeacher) {
        document.getElementById('teacherPanel').style.display = 'block';
    } else {
        document.getElementById('studentPanel').style.display = 'block';
    }
    document.getElementById('liveRoom').style.display = 'none';
}

function handleLogout() {
    location.reload();
}