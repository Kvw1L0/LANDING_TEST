/ --- 1. Definir constantes y variables de estado ---
const laminas = [
  "En mi traje de Gala",
  "Con mi líder favorito",
  "Con un reconocido 2025",
  "Junto a La mesa de la noche",
  "En la pista de Baile",
  "Mi Gala en una Foto"
];

let currentLamina = null;
let currentCard = null;
let stream = null;
let currentFacingMode = 'user'; 
// Generamos un ID único para este usuario en esta sesión
const userId = 'user_' + Math.random().toString(36).substr(2, 9);

// --- 2. Asignar variables de elementos ---
const contenedor = document.getElementById('laminas');
const modalElement = document.getElementById('camera-modal');
const video = document.getElementById('video');
const tituloLamina = document.getElementById('titulo-lamina');

if (!contenedor || !modalElement || !video || !tituloLamina) {
    console.error("Error crítico: Faltan elementos. Revisa el HTML.");
}

// --- 3. Funciones Globales ---

function iniciarAlbum() {
  generarAlbum(); 
  document.getElementById('landing').classList.add('hidden'); 
  document.getElementById('contenido').classList.remove('hidden');
}

function generarAlbum() {
    if (!contenedor) return;
    if (contenedor.children.length > 0) return;
    
    laminas.forEach(titulo => {
        const colDiv = document.createElement('div');
        colDiv.className = 'grid-col';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        const innerFrame = document.createElement('div');
        innerFrame.className = 'inner-frame';
        
        const p = document.createElement('p');
        p.className = 'text-center';
        p.textContent = titulo;

        innerFrame.addEventListener('click', () => {
            abrirCamara(titulo, innerFrame); 
        });

        cardDiv.appendChild(innerFrame);
        cardDiv.appendChild(p);
        colDiv.appendChild(cardDiv);
        contenedor.appendChild(colDiv);
    });
}

function cerrarStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        if (video) video.srcObject = null;
    }
}

async function iniciarCamara(facingMode) {
    cerrarStream(); 
    if (!video) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facingMode } }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play().catch(e => console.error("Error play:", e));
        };
    } catch (error) {
        console.error("Error cámara:", error);
        if (facingMode === 'environment') {
            // Fallback si falla la trasera
            currentFacingMode = 'user';
            iniciarCamara('user');
        } else {
            alert("No se pudo acceder a la cámara.");
            cerrarModal(); 
        }
    }
}

function cambiarCamara() {
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    iniciarCamara(currentFacingMode);
}

function abrirCamara(titulo, cardRef) {
  currentLamina = titulo;
  currentCard = cardRef;
  if (tituloLamina) tituloLamina.textContent = titulo;
  
  if (modalElement) {
      modalElement.classList.remove('hidden');
      currentFacingMode = 'user';
      iniciarCamara(currentFacingMode);
  }
}

function cerrarModal() {
    if (modalElement) modalElement.classList.add('hidden');
    cerrarStream(); 
}

function insertarImagen(dataUrl) {
  if (!currentCard) return;
  currentCard.innerHTML = '';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.className = 'shrink-in';
  currentCard.appendChild(img);
}

function capturarFoto() {
  if (!video) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  // Espejo si es cámara frontal (opcional, gusto personal)
  const ctx = canvas.getContext('2d');
  if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Calidad 0.8 para optimizar
  insertarImagen(dataUrl);
  cerrarModal(); 
}

function subirDesdeGaleria(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    insertarImagen(e.target.result);
  };
  reader.readAsDataURL(file);
  cerrarModal(); 
}

// --- NUEVA LÓGICA: SUBIR A FIREBASE ---
async function subirFotosAlServidor() {
    // Verificamos si Firebase cargó
    if (!window.db || !window.storage) {
        alert("Error de conexión. Intenta recargar la página.");
        return;
    }

    const btn = document.getElementById('btn-share');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Subiendo fotos... ⏳";

    const tarjetas = document.querySelectorAll('.card');
    let fotosSubidas = 0;

    // Recorremos las tarjetas
    for (let i = 0; i < tarjetas.length; i++) {
        const card = tarjetas[i];
        const img = card.querySelector('img'); 
        const categoria = card.querySelector('p').textContent;

        // Solo subimos si hay imagen y no tiene la clase 'uploaded' (opcional)
        if (img) {
            try {
                // Nombre único: ID_usuario + timestamp + categoria
                const timestamp = Date.now();
                const cleanCat = categoria.replace(/\s+/g, '_').toLowerCase();
                const nombreArchivo = `gala2025/${userId}_${cleanCat}_${timestamp}.jpg`; 
                
                // Referencia al Storage
                const storageRef = window.sRef(window.storage, nombreArchivo);

                // Subir imagen (base64)
                await window.sUpload(storageRef, img.src, 'data_url');
                
                // Obtener URL pública
                const urlPublica = await window.sGetUrl(storageRef);

                // Guardar registro en Firestore
                await window.dbAddDoc(window.dbCollection(window.db, "fotos_gala"), {
                    usuario: userId,
                    categoria: categoria,
                    url_foto: urlPublica,
                    fecha: window.dbTimestamp()
                });

                fotosSubidas++;
                // Marcamos visualmente que se subió (opcional)
                card.querySelector('.inner-frame').style.borderColor = '#28a745';

            } catch (error) {
                console.error("Error subiendo foto:", error);
            }
        }
    }

    if (fotosSubidas > 0) {
        alert(`¡Listo! Se enviaron ${fotosSubidas} fotos a la pantalla grande 🎉`);
        btn.textContent = "¡Enviado! ✅";
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }, 5000);
    } else {
        alert("Primero completa alguna lámina del álbum 📸");
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}
