# Seoul Tourism Student Apps

서울관광고 학생용 웹앱을 한 저장소에서 관리하기 위한 프로젝트입니다.

## 현재 구조

- `/index.html` : 학생용 웹앱 메인 허브
- `/interview/index.html` : 면접 꿀팁 · 모의면접 웹앱
- `/major-guide/` : 학과 선택 가이드용 예정 폴더
- `/career-explore/` : 진로 탐색용 예정 폴더
- `/experience/` : 서광전공체험용 예정 폴더

## 새 웹앱 추가 방법

1. 저장소 안에 영문 폴더를 하나 만듭니다. 예: `accounting-quiz`
2. 그 폴더 안에 `index.html`을 넣습니다.
3. 루트 `index.html`에 새 앱 카드와 링크 `./accounting-quiz/`를 추가합니다.
4. GitHub Pages가 활성화되어 있으면 커밋 후 자동으로 같은 사이트 아래 새 주소가 생깁니다.

예시 주소 구조:

- 메인 허브: `https://rollers765-eng.github.io/seoul-tourism-student-apps/`
- 면접 앱: `https://rollers765-eng.github.io/seoul-tourism-student-apps/interview/`
- 향후 앱: `https://rollers765-eng.github.io/seoul-tourism-student-apps/폴더명/`

## 운영 원칙

- 학생 휴대폰 사용을 고려해 모바일 우선으로 제작
- 가능하면 HTML/CSS/JavaScript 단일 파일로 제작
- 외부 라이브러리는 꼭 필요한 경우에만 사용
- 학생 개인정보를 서버에 저장하지 않는 앱은 브라우저 `localStorage`를 우선 사용
- 새 앱을 추가할 때 메인 허브도 함께 업데이트
