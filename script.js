// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const laminas = [
  "Mi mejor amig@", "En mi traje de gala", "El momento más divertido",
  "Selfie en el bus", "El peor peinado", "Actuando una película",
  "El paisaje más lindo", "Una foto random"
];

// Variables Globales
let db, storage;
let albumId = null;
let currentLamina = null;
let currentCardElement = null;
let fotosPlaylist = []; // Array con todas las fotos cargadas
let indiceCarrusel = 0;
let intervaloCarrusel = null;

// Elementos DOM
const liveLanding = document.getElementById('live-landing');
const landingCreador = document.getElementById('landing-creador');
const vistaEditor = document.getElementById('vista-editor');
const liveImage = document.getElementById('live-image');
const liveBg = document.getElementById('live-bg');
const loadingMsg = document.getElementById('loading-msg');
const contenedorLaminas = document.getElementById('laminas-grid');
const modalElement = document.getElementById('camera-modal');
const video = document.getElementById('video');

// --- PEGA TU FIREBASE CONFIG AQUÍ ---
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_MESSAGING_ID",
    appId: "TU_APP_ID"
};

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
} catch (e) { console.error(e); }

// ==========================================
// 2. ROUTER Y ARRANQUE
// ==========================================
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const idUrl = urlParams.get('album');

    if (idUrl) {
        // --- MODO LINK: LANDING VIVA ---
        albumId = idUrl;
        iniciarLiveLanding();
    } else {
        // --- MODO SIN LINK: CREADOR ---
        generarGridEditor();
        landingCreador.classList.remove('hidden');
    }
};

// ==========================================
// 3. LÓGICA DE LA LANDING VIVA (CARRUSEL)
// ==========================================

function iniciarLiveLanding() {
    landingCreador.classList.add('hidden');
    vistaEditor.classList.add('hidden');
    liveLanding.classList.remove('hidden');

    // Escuchar cambios en tiempo real en Firebase
    db.collection('albums').doc(albumId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            // Convertir objeto de fotos a array de URLs
            fotosPlaylist = Object.values(data);
            
            if (fotosPlaylist.length > 0) {
                loadingMsg.style.display = 'none';
                // Si es la primera carga, iniciar el ciclo
                if (!intervaloCarrusel) {
                    mostrarSiguienteFoto(); // Mostrar la primera ya
                    intervaloCarrusel = setInterval(mostrarSiguienteFoto, 8000); // 8 segundos
                }
            }
        }
    });
}

function mostrarSiguienteFoto() {
    if (fotosPlaylist.length === 0) return;

    // 1. Efecto Fade Out
    liveImage.classList.remove('fade-in');
    liveImage.classList.add('fade-out');

    // 2. Esperar medio segundo para cambiar la fuente (transición visual)
    setTimeout(() => {
        // Actualizar índices
        indiceCarrusel = (indiceCarrusel + 1) % fotosPlaylist.length;
        const urlFoto = fotosPlaylist[indiceCarrusel];

        // Cambiar Imagen Central
        liveImage.src = urlFoto;
        
        // Cambiar Fondo Borroso
        liveBg.style.backgroundImage = `url('${urlFoto}')`;

        // Efecto Fade In
        liveImage.onload = () => {
            liveImage.classList.remove('fade-out');
            liveImage.classList.add('fade-in');
        };
    }, 500); // 500ms coincide con la transición CSS
}

function irAlEditor() {
    // El usuario quiere subir una foto desde la landing
    liveLanding.classList.add('hidden');
    vistaEditor.classList.remove('hidden');
    generarGridEditor(); // Asegurar que el grid esté listo
    
    // Cargar las fotos que ya existen en los marcos pequeños
    db.collection('albums').doc(albumId).get().then(doc => {
         if(doc.exists) llenarMarcosEditor(doc.data());
    });
}

function volverAlLive() {
    vistaEditor.classList.add('hidden');
    liveLanding.classList.remove('hidden');
}

// ==========================================
// 4. LÓGICA DEL EDITOR (SUBIDA)
// ==========================================

function iniciarModoCreador() {
    albumId = 'album-' + Math.random().toString(36).substr(2, 9);
    window.history.replaceState(null, '', `?album=${albumId}`);
    landingCreador.classList.add('hidden');
    vistaEditor.classList.remove('hidden');
}

function generarGridEditor() {
    contenedorLaminas.innerHTML = '';
    laminas.forEach((titulo) => {
        const div = document.createElement('div');
        div.className = 'grid-col';
        div.innerHTML = `
            <div class="card">
                <div class="inner-frame" onclick="abrirCamara('${titulo}', this)">
                    <span style="color:#ccc; font-size:2rem;">+</span>
                </div>
                <p>${titulo}</p>
            </div>
        `;
        contenedorLaminas.appendChild(div);
    });
}

function llenarMarcosEditor(data) {
    // Lógica simple para rellenar si ya existen fotos (opcional)
    // Se basa en coincidencia de títulos si se guardaron con keys específicas
    // Para simplificar, en este ejemplo el editor empieza vacío visualmente
    // o requiere lógica más compleja de mapeo de keys.
}

function compartirAlbum() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: 'Álbum Gira', url: url });
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copiado: " + url);
    }
}

// ==========================================
// 5. CÁMARA Y SUBIDA
// ==========================================

function abrirCamara(titulo, frameDiv) {
    currentLamina = titulo;
    currentCardElement = frameDiv;
    document.getElementById('titulo-lamina').textContent = titulo;
    modalElement.classList.remove('hidden');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(s => { 
            video.srcObject = s; 
            window.localStream = s;
        })
        .catch(() => alert("Error cámara"));
}

function cerrarModal() {
    modalElement.classList.add('hidden');
    if (window.localStream) window.localStream.getTracks().forEach(t => t.stop());
}

function cambiarCamara() {
    // Lógica simplificada de cambio (requiere detener/reiniciar stream)
    alert("Función giro pendiente de implementación completa");
}

async function capturarFoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Preview inmediata
    currentCardElement.innerHTML = `<img src="${dataUrl}">`;
    cerrarModal();
    
    await subirAFirebase(dataUrl);
}

function subirDesdeGaleria(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const dataUrl = evt.target.result;
        currentCardElement.innerHTML = `<img src="${dataUrl}">`;
        cerrarModal();
        await subirAFirebase(dataUrl);
    };
    reader.readAsDataURL(file);
}

async function subirAFirebase(dataUrl) {
    if (!albumId) return;
    const nombre = currentLamina.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const ref = storage.ref().child(`albums/${albumId}/${nombre}.jpg`);
    
    try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await ref.put(blob);
        const url = await ref.getDownloadURL();
        
        await db.collection('albums').doc(albumId).set({
            [nombre]: url
        }, { merge: true });
        
    } catch (e) { console.error(e); }
}
