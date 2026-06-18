// ==========================================================================
// Todo Quest — 순수 정적 버전 (GitHub Pages)
// 모든 게임 상태는 localStorage에 저장됩니다.
// ==========================================================================

'use strict';

// --------------------------------------------------------------------------
// 1. 게임 상태 관리 (localStorage)
// --------------------------------------------------------------------------

const SAVE_KEY = 'todoquest_save_v1';

function getDefaultState() {
    return {
        player: {
            stats: { atk: 10.0, def: 10.0, hp: 100.0 },
            gold: 0,
            village_rank: 1
        },
        todos: [],
        dungeons: [],
        last_dungeon_date: '',
        last_attendance_date: '',
        system_logs: []
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return getDefaultState();
        return JSON.parse(raw);
    } catch (e) {
        console.warn('세이브 데이터 파싱 실패, 초기화합니다.', e);
        return getDefaultState();
    }
}

function saveState(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

// 전역 게임 상태
let gameState = loadState();

// --------------------------------------------------------------------------
// 2. 유틸리티
// --------------------------------------------------------------------------

function todayStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function uuidHex(len) {
    let result = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < len; i++) result += chars[randomInt(0, 15)];
    return result;
}

// --------------------------------------------------------------------------
// 3. 마을 버프 계산
// --------------------------------------------------------------------------

function getVillageBuffs(rank) {
    const table = {
        1: { gold_boost: 0.00, stat_boost: 0.00 },
        2: { gold_boost: 0.10, stat_boost: 0.00 },
        3: { gold_boost: 0.10, stat_boost: 0.10 },
        4: { gold_boost: 0.20, stat_boost: 0.10 },
        5: { gold_boost: 0.25, stat_boost: 0.20 }
    };
    return table[rank] || table[1];
}

// --------------------------------------------------------------------------
// 4. 던전 생성
// --------------------------------------------------------------------------

function generateDungeons(playerStats) {
    const prefixes = ['어두운','비명 지르는','버려진','숨겨진','얼어붙은','불타는','고대의','타락한','안개 낀','심연의','피빛의','속삭이는'];
    const suffixes = ['광산','둥지','동굴','밀실','늪지대','성곽','지하감옥','폐허','골짜기','신전','미궁','수풀'];

    const names = new Set();
    while (names.size < 3) {
        names.add(`${randomChoice(prefixes)} ${randomChoice(suffixes)}`);
    }
    const [n0, n1, n2] = [...names];

    const { atk, def, hp } = playerStats;

    // 쉬움
    const easyAtk  = Math.max(5,   Math.floor(atk * randomFloat(0.6, 0.8)));
    const easyDef  = Math.max(5,   Math.floor(def * randomFloat(0.6, 0.8)));
    const easyHp   = Math.max(50,  Math.floor(hp  * randomFloat(0.6, 0.8)));
    const easyGold = randomInt(20, 50);
    const easyStat = randomChoice(['atk','def','hp']);
    const easyAmt  = easyStat !== 'hp' ? 1 : 10;

    // 보통
    const normAtk  = Math.max(10,  Math.floor(atk * randomFloat(0.9, 1.1)));
    const normDef  = Math.max(10,  Math.floor(def * randomFloat(0.9, 1.1)));
    const normHp   = Math.max(100, Math.floor(hp  * randomFloat(0.9, 1.1)));
    const normGold = randomInt(50, 120);
    const normStat = randomChoice(['atk','def','hp']);
    const normAmt  = normStat !== 'hp' ? 2 : 20;

    // 어려움
    const hardAtk  = Math.max(15,  Math.floor(atk * randomFloat(1.2, 1.5)));
    const hardDef  = Math.max(15,  Math.floor(def * randomFloat(1.2, 1.5)));
    const hardHp   = Math.max(150, Math.floor(hp  * randomFloat(1.2, 1.5)));
    const hardGold = randomInt(120, 300);
    const hardStat = randomChoice(['atk','def','hp']);
    const hardAmt  = hardStat !== 'hp' ? 4 : 40;

    return [
        {
            id: `easy_${uuidHex(6)}`,
            name: `${n0} (쉬움)`,
            difficulty: '쉬움',
            req_atk: easyAtk, req_def: easyDef, req_hp: easyHp,
            gold_reward: easyGold,
            stat_reward: { type: easyStat, amount: easyAmt },
            cleared: false
        },
        {
            id: `normal_${uuidHex(6)}`,
            name: `${n1} (보통)`,
            difficulty: '보통',
            req_atk: normAtk, req_def: normDef, req_hp: normHp,
            gold_reward: normGold,
            stat_reward: { type: normStat, amount: normAmt },
            cleared: false
        },
        {
            id: `hard_${uuidHex(6)}`,
            name: `${n2} (어려움)`,
            difficulty: '어려움',
            req_atk: hardAtk, req_def: hardDef, req_hp: hardHp,
            gold_reward: hardGold,
            stat_reward: { type: hardStat, amount: hardAmt },
            cleared: false
        }
    ];
}

// --------------------------------------------------------------------------
// 5. 전투 시뮬레이션 (Python 로직을 JS로 이식)
// --------------------------------------------------------------------------

function simulateCombat(dungeon, playerStats) {
    const monsterPrefixes = ['흉포한','굶주린','타락한','고대의','난폭한','어둠의','화난','강력한'];
    const monsterSuffixes = ['슬라임','고블린','오크','해골전사','박쥐','거미','골렘','가고일','드래곤'];
    const monsterName = `${randomChoice(monsterPrefixes)} ${randomChoice(monsterSuffixes)}`;

    const pAtk = playerStats.atk;
    const pDef = playerStats.def;
    const pHp  = playerStats.hp;

    const mAtk = dungeon.req_atk;
    const mDef = dungeon.req_def;
    const mHp  = dungeon.req_hp;

    const log = [];
    log.push(`⚔️ ${dungeon.name}에 입장했습니다! ⚔️`);
    log.push(`⚠️ [요구 능력치] 공격력: ${mAtk} | 방어력: ${mDef} | 체력: ${mHp}`);
    log.push(`👤 [현재 플레이어 능력치] 공격력: ${pAtk} | 방어력: ${pDef} | 체력: ${pHp}`);
    log.push(`👿 야생의 [${monsterName}](이)가 나타났습니다! (체력: ${mHp} / 공격력: ${mAtk} / 방어력: ${mDef})`);
    log.push('------------------------------------------');

    let curPHp = pHp;
    let curMHp = mHp;
    let roundNum = 1;
    let playerWon = false;

    const attackActions = (dmg, mn) => [
        `용사가 기합을 넣고 칼을 휘둘러 ${mn}에게 ${dmg}의 피해를 주었습니다.`,
        `용사의 맹렬한 난격이 적중하여 ${mn}에게 ${dmg}의 피해를 주었습니다.`,
        `용사가 적의 빈틈을 파고들어 ${mn}에게 ${dmg}의 치명타를 입혔습니다.`
    ];

    const monsterActions = (dmg, mn) => [
        `${mn}이(가) 이빨을 드러내며 공격하여 플레이어에게 ${dmg}의 피해를 주었습니다.`,
        `${mn}이(가) 강하게 몸부림쳐 플레이어에게 ${dmg}의 피해를 주었습니다.`,
        `${mn}의 휘두르기에 직격당해 플레이어가 ${dmg}의 피해를 입었습니다.`
    ];

    while (curPHp > 0 && curMHp > 0 && roundNum <= 30) {
        log.push(`▶ 턴 ${roundNum}`);

        // 플레이어 공격
        const pDmg = Math.max(1, Math.floor(pAtk * randomFloat(0.9, 1.1) - mDef * 0.5));
        curMHp = Math.max(0, curMHp - pDmg);
        log.push(`  - ${randomChoice(attackActions(pDmg, monsterName))} (몬스터 체력: ${curMHp}/${mHp})`);

        if (curMHp <= 0) {
            playerWon = true;
            log.push(`🎉 승리! ${monsterName}을(를) 물리쳤습니다!`);
            break;
        }

        // 몬스터 공격
        const mDmg = Math.max(1, Math.floor(mAtk * randomFloat(0.9, 1.1) - pDef * 0.5));
        curPHp = Math.max(0, curPHp - mDmg);
        log.push(`  - ${randomChoice(monsterActions(mDmg, monsterName))} (플레이어 체력: ${curPHp}/${pHp})`);

        if (curPHp <= 0) {
            log.push(`💀 패배... ${monsterName}의 공격에 쓰러졌습니다.`);
            break;
        }

        roundNum++;
        log.push('------------------------------------------');
    }

    if (roundNum > 30 && curPHp > 0 && curMHp > 0) {
        log.push('⏰ 전투가 너무 길어져 시간 초과로 패배하였습니다!');
        playerWon = false;
    }

    return { log, playerWon, monsterName };
}

// --------------------------------------------------------------------------
// 6. 게임 상태 초기화 / 일일 갱신
// --------------------------------------------------------------------------

function refreshDailyState() {
    const today = todayStr();
    if (gameState.last_dungeon_date !== today) {
        gameState.dungeons = generateDungeons(gameState.player.stats);
        gameState.last_dungeon_date = today;

        // 마을 5랭크 일일 보너스
        if (gameState.player.village_rank >= 5) {
            const bonusStat = randomChoice(['atk','def','hp']);
            const bonusAmt  = bonusStat !== 'hp' ? 2.0 : 20.0;
            gameState.player.stats[bonusStat] = Math.round((gameState.player.stats[bonusStat] + bonusAmt) * 10) / 10;
            const statName = { atk:'공격력', def:'방어력', hp:'체력' }[bonusStat];
            addLog(`[${today}] 전설적인 요새의 은총으로 일일 보너스 능력치(무작위 ${statName} +${bonusAmt})를 획득했습니다!`);
        }
        saveState(gameState);
    }
}

function addLog(msg) {
    if (!gameState.system_logs) gameState.system_logs = [];
    gameState.system_logs.push(msg);
}

// --------------------------------------------------------------------------
// 7. UI 렌더링
// --------------------------------------------------------------------------

let currentTodoTab = 'active';

function renderAll() {
    renderHeader();
    renderStats();
    renderTodoList();
    renderDungeons();
    renderVillage();
    renderLogs();
    renderAttendanceBtn();
}

// 헤더
function renderHeader() {
    document.getElementById('gold-value').innerText = gameState.player.gold;
    const rankNames = { 1:'기본 마을', 2:'견습 마을', 3:'목조 보루', 4:'석조 성채', 5:'전설적인 요새' };
    document.getElementById('village-rank-name').innerText = rankNames[gameState.player.village_rank] || '기본 마을';
    document.getElementById('village-rank-badge').innerText = `LV.${gameState.player.village_rank}`;
    document.getElementById('current-date').innerText = todayStr();
}

// 스탯
function renderStats() {
    const { atk, def, hp } = gameState.player.stats;
    document.getElementById('stat-atk').innerText = atk.toFixed(1);
    document.getElementById('stat-def').innerText = def.toFixed(1);
    document.getElementById('stat-hp').innerText  = hp.toFixed(1);

    const maxAtk = Math.max(100, atk);
    const maxDef = Math.max(100, def);
    const maxHp  = Math.max(1000, hp);

    document.getElementById('stat-bar-atk').style.width = `${Math.min(100, (atk / maxAtk) * 100)}%`;
    document.getElementById('stat-bar-def').style.width = `${Math.min(100, (def / maxDef) * 100)}%`;
    document.getElementById('stat-bar-hp').style.width  = `${Math.min(100, (hp  / maxHp)  * 100)}%`;
}

// 투두 리스트
function renderTodoList() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';

    const todos = (gameState.todos || []).filter(t =>
        currentTodoTab === 'active' ? !t.completed : t.completed
    );

    if (todos.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty-todo-msg';
        li.innerText = currentTodoTab === 'active'
            ? '아직 진행 중인 퀘스트가 없습니다. 새로운 할 일을 추가해 보세요!'
            : '완료된 퀘스트가 없습니다.';
        list.appendChild(li);
        return;
    }

    const catLabels  = { study:'공부', homework:'과제', exercise:'운동' };
    const catClasses = { study:'study-cat', homework:'homework-cat', exercise:'exercise-cat' };

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${catClasses[todo.category] || ''} ${todo.completed ? 'completed' : ''}`;

        li.innerHTML = `
            <div class="todo-item-main">
                <div class="todo-checkbox" onclick="completeTodo('${todo.id}')" title="완료 처리"></div>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <span class="todo-tag">${catLabels[todo.category] || todo.category}</span>
            </div>
        `;
        list.appendChild(li);
    });
}

// 던전 목록
function renderDungeons() {
    const container = document.getElementById('dungeon-list');
    container.innerHTML = '';

    if (!gameState.dungeons || gameState.dungeons.length === 0) {
        container.innerHTML = '<p style="color:var(--gb-dark);text-align:center;padding:1rem;">던전을 불러오는 중...</p>';
        return;
    }

    const { atk, def, hp } = gameState.player.stats;
    const korStat = { atk:'공격력', def:'방어력', hp:'체력' };

    gameState.dungeons.forEach(dungeon => {
        const canChallenge = atk >= dungeon.req_atk && def >= dungeon.req_def && hp >= dungeon.req_hp;

        const div = document.createElement('div');
        div.className = 'dungeon-item';
        div.innerHTML = `
            <div class="dungeon-info-panel">
                <div class="dungeon-name-row">
                    <span class="dungeon-name">${escapeHtml(dungeon.name)}</span>
                    <span class="diff-badge ${dungeon.difficulty}">${dungeon.difficulty}</span>
                </div>
                <div class="dungeon-reqs">
                    <span>요구: <strong>ATK ${dungeon.req_atk}</strong></span>
                    <span><strong>DEF ${dungeon.req_def}</strong></span>
                    <span><strong>HP ${dungeon.req_hp}</strong></span>
                </div>
                <div class="dungeon-rewards">
                    <span>🪙 ${dungeon.gold_reward}G</span>
                    <span>✨ ${korStat[dungeon.stat_reward.type]} +${dungeon.stat_reward.amount}</span>
                </div>
            </div>
            <button
                class="btn-challenge ${canChallenge ? '' : 'disabled-req'}"
                onclick="${canChallenge ? `challengeDungeon('${dungeon.id}')` : 'showReqWarning()'}"
                id="btn-dungeon-${dungeon.id}"
            >${canChallenge ? '도전!' : '능력치 부족'}</button>
        `;
        container.appendChild(div);
    });
}

// 마을
function renderVillage() {
    const rank = gameState.player.village_rank;
    const upgradeCosts = { 1:100, 2:300, 3:600, 4:1200 };
    const rankNames    = { 1:'기본 마을', 2:'견습 마을', 3:'목조 보루', 4:'석조 성채', 5:'전설적인 요새' };
    const nextNames    = { 1:'견습 마을', 2:'목조 보루', 3:'석조 성채', 4:'전설적인 요새', 5:'(최대 등급)' };
    const emojis       = { 1:'🏕️', 2:'🏘️', 3:'🏯', 4:'🏰', 5:'⚜️' };
    const buffs        = getVillageBuffs(rank);

    document.getElementById('village-emoji').innerText      = emojis[rank] || '🏕️';
    document.getElementById('next-village-rank-title').innerText = nextNames[rank] || '(최대)';

    const buffList = document.getElementById('current-buffs-list');
    buffList.innerHTML = '';
    const buffItems = [];
    if (buffs.gold_boost > 0) buffItems.push(`골드 획득량 +${(buffs.gold_boost * 100).toFixed(0)}%`);
    if (buffs.stat_boost > 0) buffItems.push(`퀘스트 능력치 상승량 +${(buffs.stat_boost * 100).toFixed(0)}%`);
    if (buffItems.length === 0) buffItems.push('현재 적용 중인 버프 없음 (랭크 업그레이드 시 활성화)');

    buffItems.forEach(b => {
        const li = document.createElement('li');
        li.innerText = b;
        buffList.appendChild(li);
    });

    const costContainer = document.getElementById('upgrade-cost-container');
    const upgradeBtn    = document.getElementById('btn-upgrade-village');
    const rankDesc      = document.getElementById('village-rank-desc');

    if (rank >= 5) {
        costContainer.style.display = 'none';
        upgradeBtn.classList.add('max-rank');
        upgradeBtn.innerText = '최대 등급 달성!';
        upgradeBtn.onclick = null;
        rankDesc.innerText = '전설적인 요새! 최대 등급에 도달했습니다. 매일 무작위 능력치 보너스를 받습니다!';
    } else {
        costContainer.style.display = '';
        upgradeBtn.classList.remove('max-rank');
        upgradeBtn.innerText = '마을 강화하기';
        upgradeBtn.onclick = upgradeVillage;
        document.getElementById('upgrade-cost-value').innerText = upgradeCosts[rank];
        rankDesc.innerText = `골드를 모아 [${nextNames[rank]}](으)로 등급을 높이고 버프를 획득하세요.`;
    }
}

// 로그
function renderLogs() {
    const console_ = document.getElementById('system-logs-console');
    console_.innerHTML = '';

    const logs = (gameState.system_logs || []).slice(-5).reverse();
    if (logs.length === 0) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerText = '아직 기록이 없습니다. 용사여, 퀘스트를 완료하고 던전에 도전하십시오!';
        console_.appendChild(div);
        return;
    }

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        if (log.includes('던전'))    div.classList.add('dungeon-log');
        else if (log.includes('할 일') || log.includes('출석')) div.classList.add('todo-log');
        else if (log.includes('마을')) div.classList.add('village-log');
        div.innerText = log;
        console_.appendChild(div);
    });
}

// 출석 버튼 상태
function renderAttendanceBtn() {
    const btn = document.getElementById('btn-attendance');
    if (gameState.last_attendance_date === todayStr()) {
        btn.classList.add('claimed');
        btn.innerText = '오늘 출석 완료 ✓';
    } else {
        btn.classList.remove('claimed');
        btn.innerText = '출석 보상 받기';
    }
}

// --------------------------------------------------------------------------
// 8. 게임 액션
// --------------------------------------------------------------------------

// 투두 추가
document.getElementById('todo-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    const category = document.querySelector('input[name="category"]:checked')?.value || 'study';

    const newTodo = {
        id: uuidHex(16),
        text,
        category,
        completed: false,
        created_at: new Date().toISOString()
    };

    gameState.todos.push(newTodo);
    saveState(gameState);
    input.value = '';
    renderTodoList();
    playBeep(600, 0.05);
});

// 투두 완료
function completeTodo(id) {
    const todo = gameState.todos.find(t => t.id === id);
    if (!todo || todo.completed) return;

    todo.completed = true;

    const buffs = getVillageBuffs(gameState.player.village_rank);
    const statBoost = buffs.stat_boost;

    const statMap = {
        study:    { stat: 'atk', base: 1.0  },
        homework: { stat: 'def', base: 1.0  },
        exercise: { stat: 'hp',  base: 10.0 }
    };
    const { stat, base } = statMap[todo.category] || statMap.study;
    const addedAmount = Math.round(base * (1 + statBoost) * 10) / 10;

    gameState.player.stats[stat] = Math.round((gameState.player.stats[stat] + addedAmount) * 10) / 10;

    const korStat = { atk:'공격력', def:'방어력', hp:'체력' };
    addLog(`할 일 완료! [${todo.text}] (${korStat[stat]} +${addedAmount} 상승)`);
    saveState(gameState);

    renderAll();

    // 플로팅 텍스트
    const themeMap = { atk:'atk-theme', def:'def-theme', hp:'hp-theme' };
    spawnFloatingText(`+${addedAmount} ${korStat[stat]}!`, window.innerWidth / 2, window.innerHeight / 3, themeMap[stat]);
    playBeep(880, 0.08);
}

// 투두 탭 전환
function switchTodoTab(tab) {
    currentTodoTab = tab;
    document.getElementById('tab-active-btn').classList.toggle('active', tab === 'active');
    document.getElementById('tab-completed-btn').classList.toggle('active', tab === 'completed');
    renderTodoList();
}

// 카테고리 버튼 UI
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// 던전 도전
function challengeDungeon(dungeonId) {
    const modal    = document.getElementById('combat-modal');
    const screen   = document.getElementById('combat-terminal-screen');
    const closeBtn = document.getElementById('btn-close-terminal');

    screen.innerHTML = '';
    closeBtn.style.display = 'none';
    modal.classList.add('active');

    const dungeon = gameState.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) {
        modal.classList.remove('active');
        return;
    }

    const pHp = gameState.player.stats.hp;
    const mHp = dungeon.req_hp;

    document.getElementById('combat-player-hp-bar').style.width  = '100%';
    document.getElementById('combat-player-hp-text').innerText   = `${pHp}/${pHp} HP`;
    document.getElementById('combat-monster-name').innerText     = '👹 몬스터';
    document.getElementById('combat-monster-hp-bar').style.width = '100%';
    document.getElementById('combat-monster-hp-text').innerText  = `${mHp}/${mHp} HP`;

    // 전투 시뮬레이션 실행 (동기)
    const { log, playerWon } = simulateCombat(dungeon, gameState.player.stats);

    // 보상 계산
    let rewards = {};
    if (playerWon) {
        const buffs    = getVillageBuffs(gameState.player.village_rank);
        const earnedGold = Math.floor(dungeon.gold_reward * (1 + buffs.gold_boost));
        gameState.player.gold += earnedGold;

        const { type: statType, amount: statAmt } = dungeon.stat_reward;
        gameState.player.stats[statType] = Math.round((gameState.player.stats[statType] + statAmt) * 10) / 10;

        const korStat = { atk:'공격력', def:'방어력', hp:'체력' };
        const statDesc = `${korStat[statType]} +${statAmt}`;
        rewards = { gold: earnedGold, stat_desc: statDesc };

        addLog(`던전 클리어! [${dungeon.name}] 완료 보상: ${earnedGold} 골드, ${statDesc} 상승`);
        // 클리어한 던전 제거
        gameState.dungeons = gameState.dungeons.filter(d => d.id !== dungeonId);
    } else {
        addLog(`던전 공략 실패... [${dungeon.name}]에 패배했습니다. 능력치를 더 올린 후 재도전하세요!`);
    }

    saveState(gameState);

    // 전투 로그 재생
    playCombatSimulation(log, pHp, mHp, playerWon, rewards);
}

function showReqWarning() {
    playBeep(200, 0.1, 'sawtooth');
    alert('능력치가 부족합니다! 퀘스트를 완료하여 용사를 강화하세요.');
}

// 마을 강화
function upgradeVillage() {
    const rank = gameState.player.village_rank;
    if (rank >= 5) { alert('이미 마을 랭크가 최대(5)에 도달했습니다.'); return; }

    const costs = { 1:100, 2:300, 3:600, 4:1200 };
    const cost  = costs[rank];

    if (gameState.player.gold < cost) {
        alert(`골드가 부족합니다. (필요: ${cost}G, 보유: ${gameState.player.gold}G)`);
        playBeep(200, 0.1, 'sawtooth');
        return;
    }

    gameState.player.gold -= cost;
    gameState.player.village_rank++;

    const rankNames = { 2:'견습 마을', 3:'목조 보루', 4:'석조 성채', 5:'전설적인 요새' };
    const newName   = rankNames[gameState.player.village_rank];
    addLog(`마을이 [${newName}](으)로 등급 상승했습니다! 새로운 지속 버프가 잠금 해제되었습니다!`);
    saveState(gameState);
    renderAll();
    playBeep(1200, 0.12);
    spawnFloatingText(`🏘️ ${newName} 달성!`, window.innerWidth / 2, window.innerHeight / 3, 'gold-theme');
}

// 출석 보상
function claimAttendance() {
    if (gameState.last_attendance_date === todayStr()) {
        alert('오늘은 이미 출석 보상을 받았습니다!');
        return;
    }

    const earnedGold = randomInt(10, 30);
    gameState.player.gold += earnedGold;
    gameState.last_attendance_date = todayStr();

    addLog(`일일 출석 완료! 보상으로 ${earnedGold} 골드를 획득했습니다.`);
    saveState(gameState);
    renderAll();

    playBeep(880, 0.1);
    spawnFloatingText(`🪙 +${earnedGold} Gold!`, window.innerWidth / 2, window.innerHeight / 3, 'gold-theme');
}

// --------------------------------------------------------------------------
// 9. 전투 애니메이션 재생
// --------------------------------------------------------------------------

function playCombatSimulation(logs, maxPlayerHP, maxMonsterHP, isVictory, rewards) {
    const screen    = document.getElementById('combat-terminal-screen');
    const container = document.querySelector('.combat-terminal-container');
    const closeBtn  = document.getElementById('btn-close-terminal');

    let currentLine  = 0;
    let curPlayerHP  = maxPlayerHP;
    let curMonsterHP = maxMonsterHP;

    function scrollToBottom() {
        requestAnimationFrame(() => { screen.scrollTop = screen.scrollHeight; });
    }

    function printNextLine() {
        try {
            if (currentLine >= logs.length) {
                closeBtn.style.display = 'block';
                if (isVictory) {
                    playVictorySound();
                    const p = document.createElement('p');
                    p.className = 'combat-win';
                    p.innerText = `🏆 모험 성공! 전리품: +${rewards.gold} 골드 / ${rewards.stat_desc}`;
                    screen.appendChild(p);
                    spawnFloatingText(`+${rewards.gold} Gold!`, window.innerWidth / 2, window.innerHeight / 2 - 50, 'gold-theme');
                } else {
                    playDefeatSound();
                }
                scrollToBottom();
                renderAll(); // 보상 반영 후 UI 갱신
                return;
            }

            const lineText = logs[currentLine];
            const p = document.createElement('p');
            const dmgMatch = lineText.match(/(\d+)의 피해/);

            if (lineText.includes('용사') && lineText.includes('피해를 주었습니다')) {
                p.className = 'combat-damage-m';
                if (dmgMatch) {
                    curMonsterHP = Math.max(0, curMonsterHP - parseInt(dmgMatch[1]));
                    updateHPBar('monster', curMonsterHP, maxMonsterHP);
                }
                playHitSound();

            } else if (lineText.includes('플레이어에게') && lineText.includes('피해를 주었습니다')) {
                p.className = 'combat-damage-p';
                if (dmgMatch) {
                    curPlayerHP = Math.max(0, curPlayerHP - parseInt(dmgMatch[1]));
                    updateHPBar('player', curPlayerHP, maxPlayerHP);
                }
                playHurtSound();
                container.classList.add('shake');
                container.addEventListener('animationend', function onEnd() {
                    container.classList.remove('shake');
                    container.removeEventListener('animationend', onEnd);
                }, { once: true });

            } else if (lineText.includes('입장했습니다') || lineText.includes('나타났습니다')) {
                p.className = 'combat-normal';
                const nameMatch = lineText.match(/\[(.*?)\]/);
                if (nameMatch) document.getElementById('combat-monster-name').innerText = `👹 ${nameMatch[1]}`;
                playBeep(300, 0.15, 'sawtooth');

            } else if (lineText.includes('승리')) {
                p.className = 'combat-win';
            } else if (lineText.includes('패배') || lineText.includes('쓰러졌습니다')) {
                p.className = 'combat-lose';
            } else if (lineText.includes('야생의')) {
                const nameMatch = lineText.match(/\[(.*?)\]/);
                if (nameMatch) document.getElementById('combat-monster-name').innerText = `👹 ${nameMatch[1]}`;
                p.className = 'combat-normal';
                playBeep(300, 0.15, 'sawtooth');
            } else {
                p.className = 'combat-normal';
                playBeep(800, 0.03);
            }

            p.innerText = lineText;
            screen.appendChild(p);
            scrollToBottom();
            currentLine++;

            let delay = 350;
            if (lineText.includes('턴'))      delay = 180;
            if (lineText.startsWith('--'))    delay = 80;
            if (lineText.includes('입장했습니다') || lineText.includes('나타났습니다')) delay = 900;

            setTimeout(printNextLine, delay);

        } catch (err) {
            console.error('[전투 시뮬레이션 오류]', err);
            closeBtn.style.display = 'block';
            scrollToBottom();
        }
    }

    printNextLine();
}

function updateHPBar(actor, current, max) {
    const pct = Math.min(100, Math.max(0, (current / max) * 100));
    if (actor === 'player') {
        document.getElementById('combat-player-hp-bar').style.width = `${pct}%`;
        document.getElementById('combat-player-hp-text').innerText  = `${Math.round(current)}/${Math.round(max)} HP`;
    } else {
        document.getElementById('combat-monster-hp-bar').style.width = `${pct}%`;
        document.getElementById('combat-monster-hp-text').innerText  = `${Math.round(current)}/${Math.round(max)} HP`;
    }
}

function closeCombatModal() {
    playBeep(400, 0.05);
    document.getElementById('combat-modal').classList.remove('active');
}

// --------------------------------------------------------------------------
// 10. 사운드 엔진 (Web Audio API)
// --------------------------------------------------------------------------

let audioCtx   = null;
let soundEnabled = true;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-icon').innerText = soundEnabled ? '🔊' : '🔇';
}

function playBeep(freq = 440, duration = 0.05, type = 'square') {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* 무시 */ }
}

function playHitSound()     { playBeep(440, 0.08, 'square'); }
function playHurtSound()    { playBeep(180, 0.12, 'sawtooth'); }
function playVictorySound() {
    [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => playBeep(f, 0.1), i * 80));
}
function playDefeatSound()  {
    [400, 300, 200].forEach((f, i) => setTimeout(() => playBeep(f, 0.15, 'sawtooth'), i * 120));
}

// --------------------------------------------------------------------------
// 11. 플로팅 텍스트 이펙트
// --------------------------------------------------------------------------

function spawnFloatingText(text, x, y, themeClass) {
    const el = document.createElement('div');
    el.className = `floating-stat-num ${themeClass}`;
    el.innerText = text;
    el.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translateX(-50%);
        font-size: 1.4rem;
        font-weight: 900;
        pointer-events: none;
        z-index: 9999;
        transition: top 1.2s ease-out, opacity 1.2s ease-out;
        opacity: 1;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.top     = `${y - 80}px`;
        el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 1300);
}

// --------------------------------------------------------------------------
// 12. 유틸
// --------------------------------------------------------------------------

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --------------------------------------------------------------------------
// 13. 초기 실행
// --------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    gameState = loadState();
    refreshDailyState(); // 일일 던전 갱신
    renderAll();
});
