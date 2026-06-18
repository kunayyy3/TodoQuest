import os
import json
import uuid
import datetime
import random
from flask import Flask, jsonify, request, render_template, send_from_directory

app = Flask(__name__)

# 게임 상태를 저장할 JSON 파일 경로
STATE_FILE = os.path.join(os.path.dirname(__file__), 'game_state.json')

def load_state():
    if not os.path.exists(STATE_FILE):
        default_state = {
            "player": {
                "stats": {"atk": 10.0, "def": 10.0, "hp": 100.0},
                "gold": 0,
                "village_rank": 1
            },
            "todos": [],
            "dungeons": [],
            "last_dungeon_date": "",
            "last_attendance_date": "",
            "system_logs": []
        }
        save_state(default_state)
        return default_state
    try:
        with open(STATE_FILE, 'r', encoding='utf-8') as f:
            state = json.load(f)
            # 하위 호환성을 위해 필드 체크
            if "last_attendance_date" not in state:
                state["last_attendance_date"] = ""
            if "system_logs" not in state:
                state["system_logs"] = []
            return state
    except Exception:
        # 파일이 손상되었을 경우의 대비책
        default_state = {
            "player": {
                "stats": {"atk": 10.0, "def": 10.0, "hp": 100.0},
                "gold": 0,
                "village_rank": 1
            },
            "todos": [],
            "dungeons": [],
            "last_dungeon_date": "",
            "last_attendance_date": "",
            "system_logs": []
        }
        save_state(default_state)
        return default_state

def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

# 마을 랭크에 따른 버프 비율 계산
def get_village_buffs(rank):
    gold_boost = 0.0
    stat_boost = 0.0
    
    if rank == 2:
        gold_boost = 0.10
    elif rank == 3:
        gold_boost = 0.10
        stat_boost = 0.10
    elif rank == 4:
        gold_boost = 0.20
        stat_boost = 0.10
    elif rank >= 5:
        gold_boost = 0.25
        stat_boost = 0.20
        
    return {"gold_boost": gold_boost, "stat_boost": stat_boost}

# 일일 던전 생성 로직
def generate_dungeons(player_stats):
    prefixes = ["어두운", "비명 지르는", "버려진", "숨겨진", "얼어붙은", "불타는", "고대의", "타락한", "안개 낀", "심연의", "피빛의", "속삭이는"]
    suffixes = ["광산", "둥지", "동굴", "밀실", "늪지대", "성곽", "지하감옥", "폐허", "골짜기", "신전", "미궁", "수풀"]
    
    names = set()
    while len(names) < 3:
        p = random.choice(prefixes)
        s = random.choice(suffixes)
        names.add(f"{p} {s}")
    names_list = list(names)
    
    atk = player_stats['atk']
    df = player_stats['def']
    hp = player_stats['hp']
    
    # 쉬움 난이도
    req_atk_easy = max(5, int(atk * random.uniform(0.6, 0.8)))
    req_def_easy = max(5, int(df * random.uniform(0.6, 0.8)))
    req_hp_easy = max(50, int(hp * random.uniform(0.6, 0.8)))
    gold_easy = random.randint(20, 50)
    stat_type_easy = random.choice(['atk', 'def', 'hp'])
    stat_amt_easy = 1 if stat_type_easy != 'hp' else 10
    
    # 보통 난이도
    req_atk_norm = max(10, int(atk * random.uniform(0.9, 1.1)))
    req_def_norm = max(10, int(df * random.uniform(0.9, 1.1)))
    req_hp_norm = max(100, int(hp * random.uniform(0.9, 1.1)))
    gold_norm = random.randint(50, 120)
    stat_type_norm = random.choice(['atk', 'def', 'hp'])
    stat_amt_norm = 2 if stat_type_norm != 'hp' else 20
    
    # 어려움 난이도
    req_atk_hard = max(15, int(atk * random.uniform(1.2, 1.5)))
    req_def_hard = max(15, int(df * random.uniform(1.2, 1.5)))
    req_hp_hard = max(150, int(hp * random.uniform(1.2, 1.5)))
    gold_hard = random.randint(120, 300)
    stat_type_hard = random.choice(['atk', 'def', 'hp'])
    stat_amt_hard = 4 if stat_type_hard != 'hp' else 40
    
    return [
        {
            "id": f"easy_{uuid.uuid4().hex[:6]}",
            "name": f"{names_list[0]} (쉬움)",
            "difficulty": "쉬움",
            "req_atk": req_atk_easy,
            "req_def": req_def_easy,
            "req_hp": req_hp_easy,
            "gold_reward": gold_easy,
            "stat_reward": {"type": stat_type_easy, "amount": stat_amt_easy},
            "cleared": False
        },
        {
            "id": f"normal_{uuid.uuid4().hex[:6]}",
            "name": f"{names_list[1]} (보통)",
            "difficulty": "보통",
            "req_atk": req_atk_norm,
            "req_def": req_def_norm,
            "req_hp": req_hp_norm,
            "gold_reward": gold_norm,
            "stat_reward": {"type": stat_type_norm, "amount": stat_amt_norm},
            "cleared": False
        },
        {
            "id": f"hard_{uuid.uuid4().hex[:6]}",
            "name": f"{names_list[2]} (어려움)",
            "difficulty": "어려움",
            "req_atk": req_atk_hard,
            "req_def": req_def_hard,
            "req_hp": req_hp_hard,
            "gold_reward": gold_hard,
            "stat_reward": {"type": stat_type_hard, "amount": stat_amt_hard},
            "cleared": False
        }
    ]

# 페이지 라우트
@app.route('/')
def index():
    return render_template('index.html')

# 게임 상태 조회 API
@app.route('/api/state', methods=['GET'])
def get_state():
    state = load_state()
    today_str = datetime.date.today().isoformat()
    
    # 날짜가 바뀌었을 시 일일 던전 갱신
    if state.get("last_dungeon_date") != today_str:
        state["dungeons"] = generate_dungeons(state["player"]["stats"])
        state["last_dungeon_date"] = today_str
        
        # 마을 랭크 5 달성 시 매일 무작위 일일 지원 보너스 스탯 지급
        if state["player"]["village_rank"] >= 5:
            bonus_stat = random.choice(['atk', 'def', 'hp'])
            bonus_amt = 2.0 if bonus_stat != 'hp' else 20.0
            state["player"]["stats"][bonus_stat] = round(state["player"]["stats"][bonus_stat] + bonus_amt, 1)
            stat_name = {"atk": "공격력", "def": "방어력", "hp": "체력"}[bonus_stat]
            
            # 로그 기록 추가
            log_msg = f"[{today_str}] 전설적인 요새의 은총으로 일일 보너스 능력치(무작위 {stat_name} +{bonus_amt})를 획득했습니다!"
            if "system_logs" not in state:
                state["system_logs"] = []
            state["system_logs"].append(log_msg)
            
        save_state(state)
        
    return jsonify(state)

# 할 일 추가 API
@app.route('/api/todo/add', methods=['POST'])
def add_todo():
    state = load_state()
    data = request.json
    
    text = data.get('text', '').strip()
    category = data.get('category', 'study') # study, homework, exercise
    
    if not text:
        return jsonify({"error": "할 일 내용을 입력해주세요."}), 400
        
    if category not in ['study', 'homework', 'exercise']:
        return jsonify({"error": "올바르지 않은 카테고리입니다."}), 400
        
    new_todo = {
        "id": str(uuid.uuid4()),
        "text": text,
        "category": category,
        "completed": False,
        "created_at": datetime.datetime.now().isoformat()
    }
    
    state["todos"].append(new_todo)
    save_state(state)
    return jsonify({"success": True, "todo": new_todo})

# 할 일 완료 및 능력치 업그레이드 API
@app.route('/api/todo/complete', methods=['POST'])
def complete_todo():
    state = load_state()
    data = request.json
    todo_id = data.get('id')
    
    todo = next((t for t in state["todos"] if t["id"] == todo_id), None)
    if not todo:
        return jsonify({"error": "해당 할 일을 찾을 수 없습니다."}), 404
        
    if todo["completed"]:
        return jsonify({"error": "이미 완료 처리된 할 일입니다."}), 400
        
    todo["completed"] = True
    
    # 마을 버프 가져오기
    buffs = get_village_buffs(state["player"]["village_rank"])
    stat_boost = buffs["stat_boost"]
    
    # 카테고리에 맞는 기본 스탯 상승폭 설정
    category = todo["category"]
    stat_name = ""
    added_amount = 0.0
    
    if category == "study": # 공부 -> 공격력
        stat_name = "atk"
        added_amount = round(1.0 * (1 + stat_boost), 1)
    elif category == "homework": # 과제 -> 방어력
        stat_name = "def"
        added_amount = round(1.0 * (1 + stat_boost), 1)
    elif category == "exercise": # 운동 -> 체력
        stat_name = "hp"
        added_amount = round(10.0 * (1 + stat_boost), 1)
        
    state["player"]["stats"][stat_name] = round(state["player"]["stats"][stat_name] + added_amount, 1)
    
    # 완료 로그 추가
    korean_stat_name = {"atk": "공격력", "def": "방어력", "hp": "체력"}[stat_name]
    log_msg = f"할 일 완료! [{todo['text']}] ({korean_stat_name} +{added_amount} 상승)"
    if "system_logs" not in state:
        state["system_logs"] = []
    state["system_logs"].append(log_msg)
    
    save_state(state)
    return jsonify({
        "success": True,
        "added_stat": stat_name,
        "added_amount": added_amount,
        "player": state["player"]
    })

# 던전 도전 및 자동 전투 API
@app.route('/api/dungeon/challenge', methods=['POST'])
def challenge_dungeon():
    state = load_state()
    data = request.json
    dungeon_id = data.get('id')
    
    dungeon = next((d for d in state["dungeons"] if d["id"] == dungeon_id), None)
    if not dungeon:
        return jsonify({"error": "던전을 찾을 수 없습니다."}), 404
        
    if dungeon["cleared"]:
        return jsonify({"error": "이미 클리어한 던전입니다."}), 400
        
    # 플레이어 능력치 및 버프 정보 가져오기
    player = state["player"]
    p_atk = player["stats"]["atk"]
    p_def = player["stats"]["def"]
    p_hp = player["stats"]["hp"]
    
    # 몬스터 이름 무작위 생성
    monster_prefixes = ["흉포한", "굶주린", "타락한", "고대의", "난폭한", "어둠의", "화난", "강력한"]
    monster_suffixes = ["슬라임", "고블린", "오크", "해골전사", "박쥐", "거미", "골렘", "가고일", "드래곤"]
    monster_name = f"{random.choice(monster_prefixes)} {random.choice(monster_suffixes)}"
    
    # 몬스터 능력치는 던전 요구 능력치를 따름
    m_atk = dungeon["req_atk"]
    m_def = dungeon["req_def"]
    m_hp = dungeon["req_hp"]
    
    # 전투 시뮬레이션
    combat_log = []
    combat_log.append(f"⚔️ {dungeon['name']}에 입장했습니다! ⚔️")
    combat_log.append(f"⚠️ [요구 능력치] 공격력: {m_atk} | 방어력: {m_def} | 체력: {m_hp}")
    combat_log.append(f"👤 [현재 플레이어 능력치] 공격력: {p_atk} | 방어력: {p_def} | 체력: {p_hp}")
    combat_log.append(f"👿 야생의 [{monster_name}](이)가 나타났습니다! (체력: {m_hp} / 공격력: {m_atk} / 방어력: {m_def})")
    combat_log.append("------------------------------------------")
    
    cur_p_hp = p_hp
    cur_m_hp = m_hp
    
    round_num = 1
    player_won = False
    
    # 턴제 전투 최대 30턴 시뮬레이션 (무한 루프 방지)
    while cur_p_hp > 0 and cur_m_hp > 0 and round_num <= 30:
        combat_log.append(f"▶ 턴 {round_num}")
        
        # 1. 플레이어 공격 차례
        # 무작위 분산 데미지 (최소 데미지 1)
        p_damage = max(1, int(p_atk * random.uniform(0.9, 1.1) - m_def * 0.5))
        cur_m_hp -= p_damage
        cur_m_hp = max(0, cur_m_hp)
        
        # 플레이어 공격 연출 선택
        attack_actions = [
            f"용사가 기합을 넣고 칼을 휘둘러 {monster_name}에게 {p_damage}의 피해를 주었습니다.",
            f"용사의 맹렬한 난격이 적중하여 {monster_name}에게 {p_damage}의 피해를 주었습니다.",
            f"용사가 적의 빈틈을 파고들어 {monster_name}에게 {p_damage}의 치명타를 입혔습니다."
        ]
        combat_log.append(f"  - {random.choice(attack_actions)} (몬스터 체력: {cur_m_hp}/{m_hp})")
        
        if cur_m_hp <= 0:
            player_won = True
            combat_log.append(f"🎉 승리! {monster_name}을(를) 물리쳤습니다!")
            break
            
        # 2. 몬스터 공격 차례
        m_damage = max(1, int(m_atk * random.uniform(0.9, 1.1) - p_def * 0.5))
        cur_p_hp -= m_damage
        cur_p_hp = max(0, cur_p_hp)
        
        monster_actions = [
            f"{monster_name}이(가) 이빨을 드러내며 공격하여 플레이어에게 {m_damage}의 피해를 주었습니다.",
            f"{monster_name}이(가) 강하게 몸부림쳐 플레이어에게 {m_damage}의 피해를 주었습니다.",
            f"{monster_name}의 휘두르기에 직격당해 플레이어가 {m_damage}의 피해를 입었습니다."
        ]
        combat_log.append(f"  - {random.choice(monster_actions)} (플레이어 체력: {cur_p_hp}/{p_hp})")
        
        if cur_p_hp <= 0:
            combat_log.append(f"💀 패배... {monster_name}의 공격에 쓰러졌습니다.")
            break
            
        round_num += 1
        combat_log.append("------------------------------------------")
        
    if round_num > 30 and cur_p_hp > 0 and cur_m_hp > 0:
        combat_log.append("⏰ 전투가 너무 길어져 시간 초과로 패배하였습니다!")
        player_won = False
        
    # 결과 처리 및 보상 지급
    rewards = {}
    if player_won:
        # 마을 버프 가져오기
        buffs = get_village_buffs(player["village_rank"])
        gold_boost = buffs["gold_boost"]
        
        # 보상 지급 (골드 & 능력치)
        base_gold = dungeon["gold_reward"]
        earned_gold = int(base_gold * (1 + gold_boost))
        player["gold"] += earned_gold
        
        # 스탯 보상 지급
        stat_type = dungeon["stat_reward"]["type"]
        stat_amount = dungeon["stat_reward"]["amount"]
        
        # 체력은 10배 스케일
        actual_stat_amount = stat_amount
        player["stats"][stat_type] = round(player["stats"][stat_type] + actual_stat_amount, 1)
        
        korean_stat_names = {"atk": "공격력", "def": "방어력", "hp": "체력"}
        stat_desc = f"{korean_stat_names[stat_type]} +{actual_stat_amount}"
        
        rewards = {
            "gold": earned_gold,
            "stat_desc": stat_desc
        }
        
        # 시스템 로그 추가
        today_str = datetime.date.today().isoformat()
        log_msg = f"던전 클리어! [{dungeon['name']}] 완료 보상: {earned_gold} 골드, {stat_desc} 상승"
        if "system_logs" not in state:
            state["system_logs"] = []
        state["system_logs"].append(log_msg)
        
        # 던전 삭제 (PRD 조건: 클리어한 던전은 없앤다)
        state["dungeons"] = [d for d in state["dungeons"] if d["id"] != dungeon_id]
        
    else:
        # 패배했을 때 던전은 유지되고, 실패 로그만 추가
        today_str = datetime.date.today().isoformat()
        log_msg = f"던전 공략 실패... [{dungeon['name']}]에 패배했습니다. 능력치를 더 올린 후 재도전하세요!"
        if "system_logs" not in state:
            state["system_logs"] = []
        state["system_logs"].append(log_msg)
        
    save_state(state)
    
    return jsonify({
        "success": True,
        "victory": player_won,
        "combat_log": combat_log,
        "rewards": rewards,
        "player": state["player"],
        "dungeons": state["dungeons"]
    })

# 마을 랭크 업 API
@app.route('/api/village/upgrade', methods=['POST'])
def upgrade_village():
    state = load_state()
    player = state["player"]
    cur_rank = player["village_rank"]
    
    if cur_rank >= 5:
        return jsonify({"error": "이미 마을 랭크가 최대(5)에 도달했습니다."}), 400
        
    upgrade_costs = {
        1: 100,  # 1 -> 2
        2: 300,  # 2 -> 3
        3: 600,  # 3 -> 4
        4: 1200  # 4 -> 5
    }
    
    cost = upgrade_costs[cur_rank]
    
    if player["gold"] < cost:
        return jsonify({"error": f"골드가 부족합니다. (필요 골드: {cost}, 보유 골드: {player['gold']})"}), 400
        
    player["gold"] -= cost
    player["village_rank"] += 1
    
    rank_names = {
        2: "견습 마을",
        3: "목조 보루",
        4: "석조 성채",
        5: "전설적인 요새"
    }
    
    new_rank_name = rank_names[player["village_rank"]]
    
    today_str = datetime.date.today().isoformat()
    log_msg = f"마을이 [{new_rank_name}] (으)로 등급 상승했습니다! 새로운 지속 버프가 잠금 해제되었습니다!"
    if "system_logs" not in state:
        state["system_logs"] = []
    state["system_logs"].append(log_msg)
    
    save_state(state)
    
    return jsonify({
        "success": True,
        "new_rank": player["village_rank"],
        "new_rank_name": new_rank_name,
        "player": player
    })

# 일일 무작위 출석 보상 API (10~30 골드 무작위 지급)
@app.route('/api/attendance', methods=['POST'])
def claim_attendance():
    state = load_state()
    today_str = datetime.date.today().isoformat()
    
    if state.get("last_attendance_date") == today_str:
        return jsonify({"error": "오늘은 이미 출석 보상을 받았습니다!"}), 400
        
    earned_gold = random.randint(10, 30)
    state["player"]["gold"] += earned_gold
    state["last_attendance_date"] = today_str
    
    log_msg = f"일일 출석 완료! 보상으로 {earned_gold} 골드를 획득했습니다."
    if "system_logs" not in state:
        state["system_logs"] = []
    state["system_logs"].append(log_msg)
    
    save_state(state)
    return jsonify({
        "success": True,
        "earned_gold": earned_gold,
        "player": state["player"],
        "last_attendance_date": state["last_attendance_date"]
    })

# 디버그/전체 초기화 API (테스트용)
@app.route('/api/reset', methods=['POST'])
def reset_game():
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)
    state = load_state()
    return jsonify(state)

if __name__ == '__main__':
    # templates/static 폴더 생성
    os.makedirs(os.path.join(os.path.dirname(__file__), 'templates'), exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'static', 'css'), exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'static', 'js'), exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
