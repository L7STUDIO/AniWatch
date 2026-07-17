/**
 * AniWatch.ru — Клиент AniLiberty API v1
 * На основе официальной документации
 */

// ============================================================
// 1. КОНФИГУРАЦИЯ (из документации)
// ============================================================

const API_BASE = 'https://aniliberty.top/api/v1';

// Эндпоинты из документации:
// GET /anime/releases/latest — последние релизы
// GET /anime/releases/random — случайные релизы
// GET /anime/releases/list — список релизов
// GET /anime/releases/{idOrAlias} — детали релиза
// GET /anime/releases/{idOrAlias}/episodes/timecodes — таймкоды

// ============================================================
// 2. СОСТОЯНИЕ
// ============================================================

const state = {
    allTitles: [],
    currentAnime: null,
    currentEpisode: 0,
};

// ============================================================
// 3. DOM
// ============================================================

const DOM = {
    latestGrid: document.getElementById('latestGrid'),
    randomGrid: document.getElementById('randomGrid'),
    allGrid: document.getElementById('allGrid'),
    playerSection: document.getElementById('playerSection'),
    playerTitle: document.getElementById('playerTitle'),
    episodeButtons: document.getElementById('episodeButtons'),
    videoFrame: document.getElementById('videoFrame'),
    loader: document.getElementById('loader'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
};

// ============================================================
// 4. API ЗАПРОСЫ
// ============================================================

async function fetchAPI(endpoint) {
    const url = `${API_BASE}${endpoint}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('[API Error]', endpoint, error);
        return null;
    }
}

// ============================================================
// 5. ПОЛУЧЕНИЕ ДАННЫХ (по документации)
// ============================================================

/**
 * Получение последних релизов
 * GET /anime/releases/latest
 */
async function getLatestReleases(limit = 24) {
    const data = await fetchAPI(`/anime/releases/latest?limit=${limit}`);
    // Проверяем структуру ответа
    if (data && data.list) return data.list;
    if (Array.isArray(data)) return data;
    return [];
}

/**
 * Получение случайных релизов
 * GET /anime/releases/random
 */
async function getRandomReleases(limit = 12) {
    const data = await fetchAPI(`/anime/releases/random?limit=${limit}`);
    if (data && data.list) return data.list;
    if (Array.isArray(data)) return data;
    return [];
}

/**
 * Получение списка релизов (каталог)
 * GET /anime/releases/list
 */
async function getReleasesList(limit = 50, page = 1) {
    const data = await fetchAPI(`/anime/releases/list?limit=${limit}&page=${page}`);
    if (data && data.list) return data.list;
    if (Array.isArray(data)) return data;
    return [];
}

/**
 * Получение деталей релиза по ID или алиасу
 * GET /anime/releases/{idOrAlias}
 */
async function getReleaseDetails(idOrAlias) {
    return await fetchAPI(`/anime/releases/${idOrAlias}`);
}

/**
 * Получение таймкодов серий
 * GET /anime/releases/{idOrAlias}/episodes/timecodes
 */
async function getEpisodeTimecodes(idOrAlias) {
    return await fetchAPI(`/anime/releases/${idOrAlias}/episodes/timecodes`);
}

// ============================================================
// 6. ТРАНСФОРМАЦИЯ ДАННЫХ
// ============================================================

/**
 * Преобразование данных релиза в единый формат
 */
function transformRelease(item) {
    // Если пришёл массив, берём первый элемент
    const data = Array.isArray(item) ? item[0] : item;
    if (!data) return null;

    return {
        id: data.id || data.releaseId || 0,
        alias: data.alias || data.code || '',
        names: {
            ru: data.names?.ru || data.name || data.title || 'Без названия',
            en: data.names?.en || data.name || data.title || 'Без названия',
        },
        description: data.description || data.descriptions?.ru || '',
        posters: {
            medium: { url: data.posters?.medium?.url || data.poster?.url || '' },
            small: { url: data.posters?.small?.url || data.poster?.small?.url || '' },
        },
        status: {
            code: data.status?.code ?? 0,
            string: data.status?.string || data.status || 'Неизвестно',
        },
        type: {
            string: data.type?.string || data.type || 'TV',
            series: data.type?.series || data.episodes_count || data.episodes || 0,
        },
        episodes: data.episodes || data.episodes_count || 0,
        genres: data.genres || data.genres_list || [],
        score: data.score || data.rating || 0,
        year: data.year || data.release_year || 0,
        // Для плеера
        player_id: data.alias || data.code || data.id,
        original: data,
    };
}

/**
 * Массовое преобразование
 */
function transformReleases(items) {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => transformRelease(item)).filter(Boolean);
}

// ============================================================
// 7. ОТРИСОВКА
// ============================================================

function getTitle(item) {
    return item.names?.ru || item.names?.en || 'Без названия';
}

function getPoster(item) {
    return item.posters?.medium?.url || item.posters?.small?.url || '';
}

function getEpisodesCount(item) {
    return item.episodes || item.type?.series || 0;
}

function getStatusText(item) {
    return item.status?.string || 'Неизвестно';
}

function getStatusClass(item) {
    const code = item.status?.code ?? -1;
    if (code === 1) return 'ongoing';
    if (code === 2) return 'released';
    return 'unknown';
}

function renderAnimeCards(items, container, title = '') {
    const transformed = transformReleases(items);

    if (!transformed || transformed.length === 0) {
        container.innerHTML = `
            <p style="color:#666; grid-column:1/-1; text-align:center; padding:40px;">
                <i class="fas fa-face-frown" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                ${title || 'Ничего не найдено'}
            </p>
        `;
        return;
    }

    let html = '';
    for (const item of transformed) {
        const titleText = getTitle(item);
        const poster = getPoster(item);
        const episodes = getEpisodesCount(item);
        const statusText = getStatusText(item);
        const type = item.type?.string || 'TV';
        const playerId = item.player_id || item.id;

        const posterFallback = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 280%22%3E%3Crect fill=%22%231a1a30%22 width=%22200%22 height=%22280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22 font-family=%22sans-serif%22 dy=%22.3em%22%3E${titleText.slice(0,2).toUpperCase()}%3C/text%3E%3C/svg%3E`;

        html += `
            <div class="anime-card" data-id="${item.id}" data-alias="${item.alias}" data-player="${playerId}">
                <img src="${poster || posterFallback}" alt="${titleText}" loading="lazy" onerror="this.src='${posterFallback}'">
                <div class="info">
                    <h3 title="${titleText}">${titleText}</h3>
                    <div class="meta">
                        <span>${episodes || '?'} серий</span>
                        <span>${type}</span>
                    </div>
                    <div class="status-badge ${getStatusClass(item)}">${statusText}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.anime-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const alias = card.dataset.alias;
            const playerId = card.dataset.player;
            if (alias) loadRelease(alias);
            else if (id) loadRelease(id);
            else if (playerId) loadRelease(playerId);
        });
    });
}

// ============================================================
// 8. ЗАГРУЗКА ДАННЫХ
// ============================================================

async function loadAllData() {
    DOM.loader.style.display = 'block';
    DOM.loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Загрузка аниме...';

    try {
        // 1. Последние релизы
        const latest = await getLatestReleases(24);
        renderAnimeCards(latest, DOM.latestGrid);

        // 2. Случайные релизы
        const random = await getRandomReleases(12);
        renderAnimeCards(random, DOM.randomGrid);

        // 3. Все релизы
        const all = await getReleasesList(50, 1);
        state.allTitles = all;
        renderAnimeCards(all, DOM.allGrid);

        DOM.loader.style.display = 'none';
    } catch (error) {
        console.error('Load error:', error);
        DOM.loader.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color:#ff6b6b;"></i>
            Ошибка загрузки данных. Попробуйте обновить страницу.
        `;
    }
}

/**
 * Загрузка деталей релиза и открытие плеера
 */
async function loadRelease(idOrAlias) {
    DOM.loader.style.display = 'block';
    DOM.loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Загрузка...';

    const data = await getReleaseDetails(idOrAlias);
    
    if (data) {
        const transformed = transformRelease(data);
        if (transformed) {
            showPlayer(transformed);
        } else {
            alert('Не удалось загрузить детали аниме');
        }
    } else {
        alert('Не удалось загрузить детали аниме');
    }

    DOM.loader.style.display = 'none';
}

// ============================================================
// 9. ПЛЕЕР
// ============================================================

function showPlayer(anime) {
    state.currentAnime = anime;
    DOM.playerSection.classList.add('active');

    const title = getTitle(anime);
    DOM.playerTitle.textContent = title;

    const episodesCount = getEpisodesCount(anime);
    DOM.episodeButtons.innerHTML = '';

    if (episodesCount > 0 && episodesCount < 1000) {
        for (let i = 1; i <= Math.min(episodesCount, 100); i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.dataset.ep = i;
            btn.addEventListener('click', () => {
                document.querySelectorAll('#episodeButtons button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentEpisode = i;
                playEpisode(anime, i);
            });
            DOM.episodeButtons.appendChild(btn);
        }

        const firstBtn = DOM.episodeButtons.querySelector('button');
        if (firstBtn) {
            firstBtn.classList.add('active');
            playEpisode(anime, 1);
        }
    } else {
        DOM.episodeButtons.innerHTML = `
            <p style="color:#888;">Количество серий: ${episodesCount || 'неизвестно'}</p>
        `;
        playEpisode(anime, 1);
    }

    DOM.playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function playEpisode(anime, episode) {
    const playerId = anime.player_id || anime.alias || anime.id;
    
    // Используем плеер AniLiberty
    const url = `https://aniliberty.top/player/${playerId}/${episode}`;
    DOM.videoFrame.src = url;
    
    // Альтернативные плееры, если основной не работает
    const fallbackUrls = [
        `https://anilibria.tv/player/${playerId}/${episode}`,
        `https://aniq.space/player/${playerId}/${episode}`,
    ];
    
    // Если через 5 секунд не загрузилось, пробуем запасной
    setTimeout(() => {
        // Проверяем, загрузился ли контент (упрощённо)
        // Просто оставляем как есть
    }, 5000);
}

// ============================================================
// 10. ПОИСК (через каталог)
// ============================================================

async function searchAnime(query) {
    if (!query.trim()) {
        renderAnimeCards(state.allTitles, DOM.allGrid);
        return;
    }

    DOM.loader.style.display = 'block';
    DOM.loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Поиск...';

    // Пытаемся через API поиска (если есть)
    try {
        const data = await fetchAPI(`/anime/releases/list?search=${encodeURIComponent(query)}&limit=50`);
        if (data && data.list) {
            renderAnimeCards(data.list, DOM.allGrid);
            DOM.loader.style.display = 'none';
            return;
        }
    } catch (e) {
        // Игнорируем
    }

    // Локальный поиск
    const q = query.toLowerCase().trim();
    const filtered = state.allTitles.filter(item => {
        const ru = (item.names?.ru || item.name || '').toLowerCase();
        const en = (item.names?.en || '').toLowerCase();
        return ru.includes(q) || en.includes(q);
    });

    if (filtered.length > 0) {
        renderAnimeCards(filtered, DOM.allGrid);
    } else {
        DOM.allGrid.innerHTML = `
            <p style="color:#666; grid-column:1/-1; text-align:center; padding:40px;">
                <i class="fas fa-search" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                По запросу "${query}" ничего не найдено
            </p>
        `;
    }

    DOM.loader.style.display = 'none';
}

// ============================================================
// 11. ИНИЦИАЛИЗАЦИЯ
// ============================================================

async function init() {
    await loadAllData();
    console.log('🧬 AniWatch.ru загружен');
    console.log('📚 Используется AniLiberty API v1');
    console.log('📖 Документация: /storage/api/docs/v1');
}

// ============================================================
// 12. СОБЫТИЯ
// ============================================================

DOM.searchBtn.addEventListener('click', () => {
    searchAnime(DOM.searchInput.value);
});

DOM.searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        searchAnime(DOM.searchInput.value);
    }
});

// ============================================================
// 13. ЗАПУСК
// ============================================================

init();