function startLooperSetup() {
  // --- KRİTİK TEMİZLİK: Sayfada ne kadar eski looper varsa hepsini tek tek bul ve sil ---
  const existingContainers = document.querySelectorAll('#yt-looper-container');
  existingContainers.forEach(el => el.remove());

  // Video oynatıcısının ve süresinin tam olarak yüklenmesini bekle
  const checkExist = setInterval(() => {
    const playerControls = document.querySelector('.ytp-left-controls');
    const video = document.querySelector('video');

    if (playerControls && video && !isNaN(video.duration)) {
      clearInterval(checkExist);
      
      // Tekrar bir kontrol: Döngü bitene kadar kazara başka bir tane daha oluştuysa temizle
      const doubleCheck = document.querySelectorAll('#yt-looper-container');
      if (doubleCheck.length > 0) {
        doubleCheck.forEach(el => el.remove());
      }

      initLooper(playerControls, video);
    }
  }, 1000);
}

// YouTube içi sayfa geçişleri için
window.addEventListener('yt-navigate-finish', startLooperSetup);

// Doğrudan F5 (Sayfa yenileme) durumları için
if (document.readyState === 'complete') {
  startLooperSetup();
} else {
  window.addEventListener('load', startLooperSetup);
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function initLooper(controls, video) {
  const container = document.createElement('div');
  container.id = 'yt-looper-container';

  container.innerHTML = `
    <input type="text" id="loop-start" placeholder="Başla (sn)" autocomplete="off">
    <input type="text" id="loop-end" placeholder="Bitir (sn)" autocomplete="off">
    <button id="loop-toggle">Loop: KAPALI</button>
  `;

  controls.appendChild(container);

  let isLooping = false;
  const toggleBtn = document.getElementById('loop-toggle');
  const startInput = document.getElementById('loop-start');
  const endInput = document.getElementById('loop-end');

  // Önbellek Yükleme
  const videoId = getVideoId();
  if (videoId) {
    const cachedData = localStorage.getItem(`yt_loop_${videoId}`);
    if (cachedData) {
      const { start, end } = JSON.parse(cachedData);
      if (start !== undefined) startInput.value = start;
      if (end !== undefined) endInput.value = end;
    }
  }

  const saveToCache = () => {
    const currentId = getVideoId();
    if (currentId) {
      const data = {
        start: startInput.value,
        end: endInput.value
      };
      localStorage.setItem(`yt_loop_${currentId}`, JSON.stringify(data));
    }
  };

  // Fare Tekerleği ve Yön Tuşları Hassasiyeti
  const setupHassasGiris = (input) => {
    input.addEventListener('wheel', (e) => {
      e.preventDefault();
      let val = parseFloat(input.value.replace(',', '.')) || 0;
      if (e.deltaY < 0) {
        val += 0.1;
      } else {
        val -= 0.1;
      }
      if (val < 0) val = 0;
      input.value = val.toFixed(1);
      saveToCache();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        let val = parseFloat(input.value.replace(',', '.')) || 0;
        if (e.key === 'ArrowUp') {
          val += 0.1;
        } else {
          val -= 0.1;
        }
        if (val < 0) val = 0;
        input.value = val.toFixed(1);
        saveToCache();
      }
    });
  };

  setupHassasGiris(startInput);
  setupHassasGiris(endInput);

  const preventYouTubeInterference = (e) => e.stopPropagation();

  [startInput, endInput].forEach(input => {
    input.addEventListener('keydown', preventYouTubeInterference);
    input.addEventListener('keypress', preventYouTubeInterference);
    input.addEventListener('keyup', preventYouTubeInterference);
    input.addEventListener('click', preventYouTubeInterference);
  });

  // Kısayollar [ ve ]
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key === '[') {
      startInput.value = video.currentTime.toFixed(1);
      saveToCache(); 
    } else if (e.key === ']') {
      endInput.value = video.currentTime.toFixed(1);
      saveToCache();
    }
  });

  video.addEventListener('click', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      startInput.value = video.currentTime.toFixed(1);
      saveToCache();
    } else if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      endInput.value = video.currentTime.toFixed(1);
      saveToCache();
    }
  }, true);

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isLooping = !isLooping;
    if (isLooping) {
      toggleBtn.innerText = "Loop: AÇIK";
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.innerText = "Loop: KAPALI";
      toggleBtn.classList.remove('active');
    }
  });

  video.addEventListener('timeupdate', () => {
    if (isLooping) {
      const currentStart = parseFloat(startInput.value.replace(',', '.')) || 0;
      const currentEnd = parseFloat(endInput.value.replace(',', '.')) || video.duration;

      if (currentEnd > currentStart) {
        if (video.currentTime >= currentEnd || video.currentTime < currentStart) {
          video.currentTime = currentStart;
        }
      }
    }
  });
}