# ⚔️ Todo Quest

> 할 일을 완료하면 용사가 성장하는 레트로 RPG 스타일 투두리스트 게임  
> **GitHub Pages에서 바로 플레이 가능한 순수 정적 웹 게임입니다.**

![HTML](https://img.shields.io/badge/HTML5-orange?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-blue?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-yellow?style=flat-square&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=flat-square&logo=github&logoColor=white)

🎮 **[지금 바로 플레이하기](https://YOUR_USERNAME.github.io/todoquest)**

---

## 🎮 게임 소개

**Todo Quest**는 일상의 할 일(투두리스트)을 RPG 성장 시스템과 결합한 브라우저 기반 텍스트 게임입니다.  
- 서버 없이 **브라우저만으로** 동작합니다 (localStorage 저장)
- GitHub Pages에 올리면 **링크 하나**로 누구나 플레이 가능합니다

---

## 📐 4분할 화면 구성

```
┌─────────────────┬─────────────────┐
│  📋 할 일 목록  │  🧙 용사 능력치 │
│   (Top-Left)    │   (Top-Right)   │
├─────────────────┼─────────────────┤
│  ⚔️ 오늘의 던전  │  🏘️ 마을 발전소 │
│  (Bottom-Left)  │ (Bottom-Right)  │
└─────────────────┴─────────────────┘
```

---

## ✨ 주요 기능

### 1단계 — 투두리스트 작성
- **세 가지 카테고리**: 📚 공부 / 📝 과제 / 🏃 운동
- 탭 전환으로 카테고리별 필터링

### 2단계 — 할 일 달성 & 능력치 업그레이드
- 체크박스로 할 일 완료 처리
- 카테고리별 능력치 상승:
  - 📚 공부 → 공격력(ATK) +1
  - 📝 과제 → 방어력(DEF) +1
  - 🏃 운동 → 체력(HP) +10

### 3단계 — 일일 던전 도전
- 매일 3종류의 던전 자동 생성 (쉬움 / 보통 / 어려움)
- **레트로 터미널 자동전투**: 턴제 전투 로그가 타이핑되듯 출력
- 전투 종료 후 골드 & 능력치 보상 지급

### 4단계 — 마을 발전
- 골드로 마을 랭크 업그레이드 (최대 5랭크)
- 랭크가 높을수록 골드 보너스 및 스탯 버프 증가

### 보너스 — 일일 출석 보상
- 매일 1회 10~30 골드 랜덤 지급

---

## 🎨 디자인 테마

Game Boy 클래식 4색 모노크롬 팔레트 적용

| 색상 | HEX | 용도 |
|------|-----|------|
| ■ 최밝음   | `#E0F8D0` | 스크린 배경, 하이라이트 |
| ■ 밝음     | `#88C070` | 서브 패널, 연한 배경 |
| ■ 어두움   | `#346856` | 버튼, 비활성 요소 |
| ■ 최어두움 | `#081820` | 바디 배경, 메인 텍스트 |

폰트: **둥근모꼴(DungGeunMo)** 한글 도트 픽셀 폰트

---

## 🚀 GitHub Pages 배포 방법

### 1. 저장소 생성 및 업로드
```bash
git init
git add .
git commit -m "feat: Todo Quest 초기 버전"
git remote add origin https://github.com/YOUR_USERNAME/todoquest.git
git branch -M main
git push -u origin main
```

### 2. GitHub Pages 활성화
1. GitHub 저장소 → **Settings** 탭
2. 좌측 메뉴 → **Pages**
3. **Source**: `Deploy from a branch`
4. **Branch**: `main` / `/ (root)` 선택 후 **Save**
5. 잠시 후 `https://YOUR_USERNAME.github.io/todoquest` 에서 접속 가능!

---

## 🗂️ 프로젝트 구조

```
todoquest/
├── index.html          # 메인 게임 페이지 (GitHub Pages 진입점)
├── README.md
├── .gitignore
└── static/
    ├── css/
    │   └── style.css   # Game Boy 팔레트 기반 레트로 UI
    └── js/
        └── game.js     # 전체 게임 로직 + localStorage 저장
```

> ℹ️ 서버가 필요 없습니다. 모든 게임 데이터는 브라우저의 `localStorage`에 저장됩니다.

---

## 📝 라이선스

MIT License
