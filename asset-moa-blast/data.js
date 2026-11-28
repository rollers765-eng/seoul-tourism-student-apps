/* 자산모아 블럭모아 Blaster — 단계·문제 데이터
   4개 코너 160단계를 '개념 생성 규칙'으로 만든다.
   모든 정답은 생성 규칙에서 계산되므로 오답이 생기지 않는다. */
(function (root) {
  'use strict';

  /* ────────── 결정론적 난수 (단계마다 항상 같은 문제) ────────── */
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17; s >>>= 0;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function pickN(r, a, n) {
    const c = a.slice(); const out = [];
    while (out.length < n && c.length) out.push(c.splice(Math.floor(r() * c.length), 1)[0]);
    return out;
  }
  const int = (r, min, max, step) => {
    step = step || 1;
    const n = Math.floor((max - min) / step) + 1;
    return min + Math.floor(r() * n) * step;
  };
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  const particle = (word, final, open) => word +
    (((word.charCodeAt(word.length - 1) - 0xac00) % 28 + 28) % 28 ? final : open);
  const man = (n) => Math.round(n / 10000) + '만 원';

  /* ────────── 등장 회사·물건 이름 ────────── */
  const COMP = ['나래상사', '송도상사', '은성상사', '부여상사', '한빛상점', '대성유통', '청솔상회', '다온상사', '한강상사', '새봄기업', '가온상회', '우리상사'];
  const CAFE = ['카페 연', '카페 봄', '실습카페 모아', '카페 한강', '카페 다온'];
  const GOODS = ['원두', '우유', '생크림', '텀블러', '케이크', '쿠키', '시럽', '디저트', '차 티백', '종이컵'];
  const EQUIP = ['커피머신', '그라인더', '제빙기', '쇼케이스', '오븐', '블렌더', '냉장고', '토스터'];
  const FIRM = (r) => pick(r, COMP);
  const SHOP = (r) => pick(r, CAFE);

  /* ────────── 계정과목 도감 ────────── */
  const ACCOUNTS = {
    '차량유지비': { kind: '비용', inc: '차변', desc: '배달용 차량의 원래 성능을 유지하는 데 든 비용' },
    '현금': { kind: '자산', inc: '차변', desc: '지폐·동전처럼 바로 쓸 수 있는 돈', ex: '상품을 현금으로 팔면 현금이 늘어 차변에 적어요.' },
    '당좌예금': { kind: '자산', inc: '차변', desc: '은행에 맡긴 돈으로, 수표를 발행해 쓸 수 있어요.', ex: '당좌수표를 발행하면 당좌예금이 줄어 대변에 적어요.' },
    '보통예금': { kind: '자산', inc: '차변', desc: '은행에 맡긴 돈 중 자유롭게 넣고 뺄 수 있는 예금', ex: '은행에서 이체로 받으면 보통예금이 늘어요.' },
    '상품': { kind: '자산', inc: '차변', desc: '판매할 목적으로 가지고 있는 물건', ex: '분기법에서는 상품 계정으로 원가와 이익을 나눠 기록해요.' },
    '매입': { kind: '비용', inc: '차변', desc: '3분법에서 상품을 사들일 때 쓰는 계정', ex: '매입운임은 매입에 더해요.' },
    '매출': { kind: '수익', inc: '대변', desc: '3분법에서 상품을 팔 때 쓰는 계정', ex: '매출환입은 매출에서 직접 빼요.' },
    '외상매입금': { kind: '부채', inc: '대변', desc: '상품을 외상으로 사서 나중에 갚을 돈', ex: '외상으로 사면 외상매입금이 늘어 대변에 적어요.' },
    '외상매출금': { kind: '자산', inc: '차변', desc: '상품을 외상으로 팔아 나중에 받을 돈', ex: '외상으로 팔면 외상매출금이 늘어 차변에 적어요.' },
    '운반비': { kind: '비용', inc: '차변', desc: '상품을 보내는 데 든 운임. 3분법에서는 판매자가 부담한 매출운임을 여기에 기록해요.', ex: '매출운임을 현금으로 냈다면 (차)운반비 (대)현금이에요.' },
    '매입운임': { kind: '비용', inc: '차변', desc: '상품을 살 때 매입자가 부담하는 운임. 3분법에서는 매입에 포함해요.', ex: '(차)매입 (대)현금으로 운임을 매입에 더해요.' },
    '매출환입': { kind: '수익 차감', inc: '차변', desc: '팔았던 상품을 돌려받은 금액(매출에서 직접 차감)', ex: '(차)매출 (대)외상매출금으로 기록해요.' },
    '매입환출': { kind: '비용 차감', inc: '대변', desc: '샀던 상품을 되돌려 준 금액(매입에서 직접 차감)', ex: '(차)외상매입금 (대)매입으로 기록해요.' },
    '상품매출이익': { kind: '수익', inc: '대변', desc: '분기법에서 판매가와 원가의 차이', ex: '판매가 40,000원, 원가 30,000원이면 (대)상품 30,000 (대)상품매출이익 10,000이에요.' },
    '매출원가': { kind: '비용', inc: '차변', desc: '판매한 상품의 원가', ex: '기초재고 + 당기순매입 − 기말재고로 계산해요.' },
    '장기금융상품': { kind: '투자자산', inc: '차변', desc: '만기가 1년을 넘는 예금·적금 같은 금융상품', ex: '3년 만기 정기예금에 넣으면 차변에 적어요.' },
    '만기보유증권': { kind: '투자자산', inc: '차변', desc: '만기까지 보유할 목적으로 산 채권', ex: '만기까지 보유할 국채를 사면 차변에 적어요.' },
    '매도가능증권': { kind: '투자자산', inc: '차변', desc: '장기간 보유할 목적으로 산 주식·채권', ex: '다른 회사 주식을 장기 보유 목적으로 사면 차변에 적어요.' },
    '투자부동산': { kind: '투자자산', inc: '차변', desc: '임대·시세차익을 위해 보유한 토지·건물', ex: '임대할 상가 건물을 사면 차변에 적어요.' },
    '장기대여금': { kind: '투자자산', inc: '차변', desc: '1년이 넘게 빌려준 돈', ex: '2년간 빌려주면 장기대여금이에요.' },
    '임차보증금': { kind: '투자자산', inc: '차변', desc: '건물·토지를 빌리며 맡긴 보증금', ex: '전세 보증금은 투자자산이에요.' },
    '이자수익': { kind: '수익', inc: '대변', desc: '받은 이자', ex: '예금 이자를 받으면 대변에 적어요.' },
    '유형자산처분이익': { kind: '수익', inc: '대변', desc: '유형자산을 장부금액보다 비싸게 팔아 생긴 이익', ex: '장부금액 400,000원짜리를 450,000원에 팔면 50,000원이 처분이익이에요.' },
    '유형자산처분손실': { kind: '비용', inc: '차변', desc: '유형자산을 장부금액보다 싸게 팔아 생긴 손실', ex: '장부금액보다 싸게 팔면 차변에 적어요.' },
    '비품': { kind: '유형자산', inc: '차변', desc: '오래 쓰는 기구·비품', ex: '커피머신을 사면 비품이 늘어 차변에 적어요.' },
    '기계장치': { kind: '유형자산', inc: '차변', desc: '제품을 만드는 데 쓰는 기계', ex: '운송비를 더한 금액을 취득원가로 적어요.' },
    '건물': { kind: '유형자산', inc: '차변', desc: '건물. 자본적 지출은 건물의 가치를 높여요.', ex: '엘리베이터를 새로 설치하면 건물에 더해요.' },
    '토지': { kind: '유형자산', inc: '차변', desc: '땅. 감가상각하지 않아요.', ex: '취득세도 토지의 취득원가에 더해요.' },
    '차량운반구': { kind: '유형자산', inc: '차변', desc: '영업용 자동차·오토바이', ex: '배달용 차량을 사면 차변에 적어요.' },
    '건설중인자산': { kind: '유형자산', inc: '차변', desc: '아직 완성되지 않은 유형자산', ex: '공사 중 지급한 돈은 완공 전까지 여기에 모아요.' },
    '비품감가상각누계액': { kind: '자산 차감', inc: '대변', desc: '비품의 감가상각을 모아 둔 계정(간접법)', ex: '간접법에서는 비품을 줄이지 않고 누계액을 대변에 적어요.' },
    '기계장치감가상각누계액': { kind: '자산 차감', inc: '대변', desc: '기계장치 감가상각의 누계액(간접법)', ex: '간접법으로 기록하면 대변에 적어요.' },
    '건물감가상각누계액': { kind: '자산 차감', inc: '대변', desc: '건물 감가상각의 누계액(간접법)', ex: '간접법으로 기록하면 대변에 적어요.' },
    '감가상각비': { kind: '비용', inc: '차변', desc: '유형자산을 쓴 만큼 비용으로 나누는 금액', ex: '(취득원가 − 잔존가치) ÷ 내용연수로 계산해요.' },
    '수선비': { kind: '비용', inc: '차변', desc: '수익적 지출. 원래 상태를 유지하는 수리비', ex: '외벽 도색비는 수선비로 처리해요.' },
    '소모품비': { kind: '비용', inc: '차변', desc: '쓰면 없어지는 물건을 사는 데 든 비용', ex: '작은 수리 자재를 사면 소모품비로 처리하기도 해요.' },
    '미수금': { kind: '자산', inc: '차변', desc: '상품 이외의 것을 팔고 아직 받지 못한 돈', ex: '비품을 팔고 다음 달에 받기로 하면 미수금이에요.' },
    '미지급금': { kind: '부채', inc: '대변', desc: '상품 이외의 것을 사고 아직 주지 않은 돈', ex: '비품 대금을 다음 달에 주기로 하면 미지급금이에요.' },
    '영업권': { kind: '무형자산', inc: '차변', desc: '회사를 살 때 장부가치보다 더 낸 금액', ex: '합병 대가가 순자산보다 크면 영업권이 생겨요.' },
    '특허권': { kind: '무형자산', inc: '차변', desc: '발명을 독점해 쓸 수 있는 권리', ex: '특허권을 사면 차변에 적어요.' },
    '상표권': { kind: '무형자산', inc: '차변', desc: '상표를 독점해 쓸 수 있는 권리', ex: '브랜드 상표를 사면 상표권이에요.' },
    '컴퓨터소프트웨어': { kind: '무형자산', inc: '차변', desc: '사서 쓰는 프로그램', ex: '매장 관리 프로그램을 사면 무형자산이에요.' },
    '개발비': { kind: '무형자산', inc: '차변', desc: '자산으로 인식할 요건을 갖춘 신제품·기술 개발비', ex: '요건을 갖추면 자산으로, 못 갖추면 비용(경상개발비)으로 처리해요.' },
    '산업재산권': { kind: '무형자산', inc: '차변', desc: '특허권·상표권·의장권 같은 권리', ex: '산업재산권을 취득하면 차변에 적어요.' },
    '무형자산상각비': { kind: '비용', inc: '차변', desc: '무형자산을 쓴 만큼 비용으로 나누는 금액', ex: '특허권을 상각하면 (차)무형자산상각비 (대)특허권이에요.' },
    '무형자산처분이익': { kind: '수익', inc: '대변', desc: '무형자산을 장부금액보다 비싸게 팔아 생긴 이익', ex: '특허권을 비싸게 팔면 대변에 적어요.' },
    '무형자산처분손실': { kind: '비용', inc: '차변', desc: '무형자산을 장부금액보다 싸게 팔아 생긴 손실', ex: '특허권을 싸게 팔면 차변에 적어요.' },
    '잡이익': { kind: '수익', inc: '대변', desc: '본업과 상관없이 생긴 이익', ex: '무형자산을 팔아 생긴 이익을 잡이익으로 처리하기도 해요.' },
    '매도가능증권처분이익': { kind: '수익', inc: '대변', desc: '매도가능증권을 장부금액보다 비싸게 팔아 생긴 이익', ex: '차액은 매도가능증권처분이익으로 기록해요.' },
    '매도가능증권처분손실': { kind: '비용', inc: '차변', desc: '매도가능증권을 장부금액보다 싸게 팔아 생긴 손실', ex: '차액은 매도가능증권처분손실로 기록해요.' },
    '단기매매증권': { kind: '당좌자산', inc: '차변', desc: '단기 시세차익을 위해 산 주식·채권', ex: '투자자산이 아니라 당좌자산이에요.' },
    '단기대여금': { kind: '당좌자산', inc: '차변', desc: '1년 안에 돌려받을 돈을 빌려준 것', ex: '6개월 뒤 받기로 빌려주면 단기대여금이에요.' },
    '선급금': { kind: '당좌자산', inc: '차변', desc: '상품을 사기 위해 미리 준 돈', ex: '계약금을 먼저 주면 선급금이에요.' },
    '가지급금': { kind: '당좌자산', inc: '차변', desc: '나중에 정산할 목적으로 잠시 준 돈', ex: '출장비를 어림잡아 주면 가지급금이에요.' },
    '부도어음': { kind: '당좌자산', inc: '차변', desc: '지급 거절된 어음', ex: '부도가 나면 받을어음을 부도어음으로 옮겨요.' },
    '경상개발비': { kind: '비용', inc: '차변', desc: '자산 인식 요건을 못 갖춘 개발비', ex: '요건을 못 갖추면 비용으로 처리해요.' },
    '선급비용': { kind: '당좌자산', inc: '차변', desc: '다음 기간의 비용을 미리 낸 것', ex: '다음 해 보험료를 미리 내면 선급비용이에요.' },
    '잡손실': { kind: '비용', inc: '차변', desc: '본업과 상관없이 생긴 손실', ex: '원인을 모르는 현금 부족을 잡손실로 처리해요. ' }
  };

  /* ────────── 문제 생성기 ──────────
     각 생성기는 rng를 받아 stage 본문을 돌려준다. */
  const G = {};

  /* ═══════════ 재고자산 ═══════════ */
  G['inv-buy-credit'] = (r) => {
    const a = int(r, 120, 480, 10) * 1000;
    return { tag: '3분법 매입', prompt: `${FIRM(r)}에서 판매용 ${pick(r, GOODS)} ${won(a)}어치를 외상으로 매입했다. (3분법)`, entries: [{ side: 'd', account: '매입', amount: a }, { side: 'c', account: '외상매입금', amount: a }], explain: '3분법에서는 상품을 사면 매입(비용)이 늘어 차변, 갚을 돈은 외상매입금(부채)이 늘어 대변이에요.' };
  };
  G['inv-sell-credit'] = (r) => {
    const a = int(r, 150, 520, 10) * 1000;
    return { tag: '3분법 매출', prompt: `${SHOP(r)}에서 ${pick(r, GOODS)} ${won(a)}어치를 외상으로 판매했다. (3분법)`, entries: [{ side: 'd', account: '외상매출금', amount: a }, { side: 'c', account: '매출', amount: a }], explain: '외상으로 팔면 받을 돈(외상매출금)이 늘어 차변, 매출(수익)이 늘어 대변이에요.' };
  };
  G['inv-buy-cash'] = (r) => {
    const a = int(r, 100, 400, 10) * 1000;
    return { tag: '현금 매입', prompt: `${FIRM(r)}에서 판매용 ${pick(r, GOODS)} ${won(a)}어치를 사고 현금으로 지급했다. (3분법)`, entries: [{ side: 'd', account: '매입', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '상품을 현금으로 사면 매입이 늘고 현금이 줄어요. 늘어난 매입은 차변, 줄어든 현금은 대변이에요.' };
  };
  G['inv-sell-cash'] = (r) => {
    const a = int(r, 120, 460, 10) * 1000;
    return { tag: '현금 매출', prompt: `${SHOP(r)}에서 ${pick(r, GOODS)} ${won(a)}어치를 팔고 현금으로 받았다. (3분법)`, entries: [{ side: 'd', account: '현금', amount: a }, { side: 'c', account: '매출', amount: a }], explain: '현금이 늘면 차변, 매출이 늘면 대변이에요.' };
  };
  G['inv-buy-check'] = (r) => {
    const a = int(r, 200, 600, 10) * 1000;
    return { tag: '당좌수표 매입', prompt: `${FIRM(r)}에서 원두 ${won(a)}어치를 사고 당좌수표를 발행해 지급했다. (3분법)`, entries: [{ side: 'd', account: '매입', amount: a }, { side: 'c', account: '당좌예금', amount: a }], explain: '당좌수표를 발행하면 당좌예금이 줄어 대변에 적어요.' };
  };
  G['inv-freight-in'] = (r) => {
    const a = int(r, 200, 500, 10) * 1000, f = int(r, 8, 25, 1) * 1000;
    return { tag: '매입운임', prompt: `${FIRM(r)}에서 ${pick(r, GOODS)} ${won(a)}어치를 외상으로 사고, 매입자가 부담하는 인수 운임 ${won(f)}을 현금으로 지급했다. (3분법)`, entries: [{ side: 'd', account: '매입', amount: a + f }, { side: 'c', account: '외상매입금', amount: a }, { side: 'c', account: '현금', amount: f }], explain: '매입자가 부담하는 매입운임은 매입에 더해요. 그래서 매입 금액이 ' + won(a + f) + '이 돼요.', amountPhase: true };
  };
  G['inv-freight-out'] = (r) => {
    const a = int(r, 200, 500, 10) * 1000, f = int(r, 8, 20, 1) * 1000;
    return { tag: '매출운임', prompt: `${SHOP(r)}에서 ${pick(r, GOODS)} ${won(a)}어치를 외상으로 팔고, 판매자가 부담하는 배송비 ${won(f)}을 현금으로 지급했다. (3분법)`, entries: [{ side: 'd', account: '외상매출금', amount: a }, { side: 'd', account: '운반비', amount: f }, { side: 'c', account: '매출', amount: a }, { side: 'c', account: '현금', amount: f }], explain: '판매자가 부담하는 매출운임은 운반비(비용)로 처리해요. 매출에는 더하지 않아요.', amountPhase: true };
  };
  G['inv-return-out'] = (r) => {
    const a = int(r, 30, 120, 5) * 1000;
    return { tag: '매출환입', prompt: `외상으로 판 ${pick(r, GOODS)} 중 ${won(a)}어치를 돌려받았다. 받을 돈에서 같은 금액을 뺐다. (3분법)`, entries: [{ side: 'd', account: '매출', amount: a }, { side: 'c', account: '외상매출금', amount: a }], explain: '매출환입은 매출을 직접 줄여요(차변 매출). 받을 돈도 줄어 대변 외상매출금이에요.' };
  };
  G['inv-return-out-cash'] = (r) => {
    const a = int(r, 30, 100, 5) * 1000;
    return { tag: '매출환입(현금)', prompt: `현금으로 팔았던 ${pick(r, GOODS)} 중 ${won(a)}어치를 돌려받고 현금으로 환불해 주었다. (3분법)`, entries: [{ side: 'd', account: '매출', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '돌려준 상품만큼 매출이 줄어 차변에 매출을 적고, 내준 현금은 대변에 적어요.' };
  };
  G['inv-return-in'] = (r) => {
    const a = int(r, 30, 150, 5) * 1000;
    return { tag: '매입환출', prompt: `외상으로 매입했던 ${pick(r, GOODS)} 중 ${won(a)}어치를 돌려보내고, 같은 금액을 외상대금에서 빼 주기로 했다. (3분법)`, entries: [{ side: 'd', account: '외상매입금', amount: a }, { side: 'c', account: '매입', amount: a }], explain: '매입환출은 매입을 줄여요(대변 매입). 갚을 돈도 줄어 차변 외상매입금이에요.' };
  };
  G['inv-allowance-in'] = (r) => {
    const a = int(r, 20, 90, 5) * 1000;
    return { tag: '매입에누리', prompt: `외상으로 매입한 ${pick(r, GOODS)}에 흠이 있어 ${won(a)}을 에누리받고 외상대금에서 빼 주기로 했다. (3분법)`, entries: [{ side: 'd', account: '외상매입금', amount: a }, { side: 'c', account: '매입', amount: a }], explain: '매입에누리도 매입을 직접 줄여요. 대변 매입, 차변 외상매입금이에요.' };
  };
  G['inv-allowance-out'] = (r) => {
    const a = int(r, 20, 90, 5) * 1000;
    return { tag: '매출에누리', prompt: `외상으로 판매한 ${pick(r, GOODS)} 대금에서 ${won(a)}을 에누리해 주고 외상대금에서 차감했다. (3분법)`, entries: [{ side: 'd', account: '매출', amount: a }, { side: 'c', account: '외상매출금', amount: a }], explain: '매출에누리는 매출을 직접 줄여요(차변 매출). 받을 돈도 줄어 대변이에요.' };
  };
  G['inv-discount-in'] = (r) => {
    const a = int(r, 250, 600, 10) * 1000, d = int(r, 5, 20, 1) * 1000;
    return { tag: '매입할인', prompt: `외상으로 매입한 ${pick(r, GOODS)} ${won(a)}을 오늘 현금으로 갚으며 매입할인 ${won(d)}을 받았다. (3분법)`, entries: [{ side: 'd', account: '외상매입금', amount: a }, { side: 'c', account: '현금', amount: a - d }, { side: 'c', account: '매입', amount: d }], explain: '매입할인은 매입을 줄여요. 실제로 낸 현금은 ' + won(a - d) + '이고, 할인액만큼 매입을 대변에 적어요.', amountPhase: true };
  };
  G['inv-combined-settle'] = (r) => {
    const a = int(r, 300, 700, 10) * 1000, b = int(r, 20, 80, 5) * 1000;
    return { tag: '환출 후 결제', prompt: `외상으로 매입한 상품 ${won(a)} 중 ${won(b)}어치를 돌려보내고, 남은 금액을 현금으로 지급했다. (3분법)`, entries: [{ side: 'd', account: '외상매입금', amount: a }, { side: 'c', account: '매입', amount: b }, { side: 'c', account: '현금', amount: a - b }], explain: '외상매입금 ' + won(a) + '을 없애고, 돌려보낸 ' + won(b) + '은 매입에서 빼고, 실제로 낸 ' + won(a - b) + '은 현금으로 기록해요.', amountPhase: true };
  };
  G['inv-periodic-cost'] = (r) => {
    const beg = int(r, 80, 160, 10) * 1000, pur = int(r, 300, 500, 10) * 1000, end = int(r, 100, 200, 10) * 1000;
    const cogs = beg + pur - end;
    return { mode: 'pick', tag: '매출원가 계산', prompt: `기초 상품 재고액 ${won(beg)}, 당기 순매입액 ${won(pur)}, 기말 상품 재고액 ${won(end)}일 때 매출원가는?`, picks: [{ label: won(cogs), value: cogs }], decoys: [{ label: won(beg + pur), value: beg + pur }, { label: won(pur - end), value: pur - end }, { label: won(cogs + 10000), value: cogs + 10000 }, { label: won(Math.max(10000, cogs - 10000)), value: cogs - 10000 }], explain: '매출원가 = 기초재고 ' + won(beg) + ' + 순매입 ' + won(pur) + ' − 기말재고 ' + won(end) + ' = ' + won(cogs) };
  };
  G['inv-net-purchase'] = (r) => {
    const total = int(r, 500, 800, 10) * 1000, f = int(r, 10, 30, 5) * 1000, e = int(r, 20, 60, 5) * 1000, ret = int(r, 20, 80, 5) * 1000;
    const net = total + f - e - ret;
    return { mode: 'pick', tag: '순매입액 계산', prompt: `당기 총매입액 ${won(total)}, 매입운임 ${won(f)}, 매입에누리 ${won(e)}, 매입환출 ${won(ret)}일 때 당기 순매입액은?`, picks: [{ label: won(net), value: net }], decoys: [{ label: won(total), value: total }, { label: won(total + f), value: total + f }, { label: won(total - e - ret), value: total - e - ret }, { label: won(net + f), value: net + f }], explain: '순매입액 = 총매입 ' + won(total) + ' + 매입운임 ' + won(f) + ' − 매입에누리 ' + won(e) + ' − 매입환출 ' + won(ret) + ' = ' + won(net) };
  };
  G['inv-gross-profit'] = (r) => {
    const rev = int(r, 500, 900, 10) * 1000, cogs = int(r, 3, 6, 1) * 100000;
    const gp = rev - cogs;
    return { mode: 'pick', tag: '매출총이익 계산', prompt: `당기 순매출액 ${won(rev)}, 매출원가 ${won(cogs)}일 때 매출총이익은?`, picks: [{ label: won(gp), value: gp }], decoys: [{ label: won(rev + cogs), value: rev + cogs }, { label: won(cogs), value: cogs }, { label: won(gp + 50000), value: gp + 50000 }, { label: won(Math.max(10000, gp - 50000)), value: gp - 50000 }], explain: '매출총이익 = 순매출액 ' + won(rev) + ' − 매출원가 ' + won(cogs) + ' = ' + won(gp) };
  };
  G['inv-bungi-sell'] = (r) => {
    const cost = int(r, 20, 60, 5) * 1000, gain = int(r, 5, 25, 5) * 1000;
    return { tag: '분기법 매출', prompt: `분기법: 원가 ${won(cost)}인 상품을 ${won(cost + gain)}에 외상으로 판매했다.`, entries: [{ side: 'd', account: '외상매출금', amount: cost + gain }, { side: 'c', account: '상품', amount: cost }, { side: 'c', account: '상품매출이익', amount: gain }], explain: '분기법은 팔 때마다 상품(원가)을 대변에서 줄이고, 차액을 상품매출이익으로 기록해요.', amountPhase: true };
  };
  G['inv-chonggi-sell'] = (r) => {
    const price = int(r, 30, 90, 5) * 1000;
    return { tag: '총기법 매출', prompt: `총기법: 원가 ${won(Math.round(price * 0.7 / 1000) * 1000)}인 상품을 ${won(price)}에 외상으로 판매했다.`, entries: [{ side: 'd', account: '외상매출금', amount: price }, { side: 'c', account: '상품', amount: price }], explain: '총기법은 판매금액 전체를 상품 계정 대변에 기록하고, 이익은 결산 때 따로 계산해요.' };
  };
  G['inv-bungi-buy'] = (r) => {
    const a = int(r, 150, 500, 10) * 1000;
    return { tag: '분기법 매입', prompt: `분기법: 상품 ${won(a)}을 외상으로 매입했다.`, entries: [{ side: 'd', account: '상품', amount: a }, { side: 'c', account: '외상매입금', amount: a }], explain: '분기법에서는 상품을 사면 상품 계정(자산)이 늘어 차변에 적어요.' };
  };
  G['inv-concept-method'] = (r) => {
    const items = [
      { q: '같은 종류의 상품을 살 때마다 새로 평균단가를 계산해 평가하는 방법은?', a: '이동평균법', d: ['선입선출법', '개별법', '총평균법'] },
      { q: '먼저 사들인 상품이 먼저 팔린 것으로 보고 기말 재고를 평가하는 방법은?', a: '선입선출법', d: ['총평균법', '이동평균법', '개별법'] },
      { q: '기말에 전체 상품의 평균단가를 한 번만 계산해 평가하는 방법은?', a: '총평균법', d: ['선입선출법', '개별법', '이동평균법'] },
      { q: '상품마다 실제로 산 가격을 하나하나 확인해 평가하는 방법은?', a: '개별법', d: ['총평균법', '선입선출법', '이동평균법'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '평가방법 개념', prompt: it.q + ' 알맞은 재고자산 평가방법을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '재고자산 평가방법 4종(개별법·선입선출법·총평균법·이동평균법)의 설명을 구별해 두면 서술형 1번이 쉬워져요.' };
  };
  G['inv-concept-account'] = (r) => {
    const items = [
      { q: '3분법에서 상품을 외상으로 살 때 차변에 쓰는 계정과목은?', a: '매입', d: ['상품', '매출', '외상매입금'] },
      { q: '3분법에서 상품을 외상으로 팔 때 대변에 쓰는 계정과목은?', a: '매출', d: ['상품', '매입', '외상매출금'] },
      { q: '매출환입을 기록할 때 차변에 쓰는 계정과목은?', a: '매출', d: ['매입', '상품', '매출원가'] },
      { q: '매입환출을 기록할 때 대변에 쓰는 계정과목은?', a: '매입', d: ['상품', '매출', '외상매입금'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '계정과목 찾기', prompt: it.q + ' 블록을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '3분법의 기본 계정은 매입·매출·상품 세 가지예요. 환입·에누리는 매입·매출에서 직접 빼요.' };
  };
  G['inv-amount-only'] = (r) => {
    const a = int(r, 200, 500, 10) * 1000, b = int(r, 30, 90, 5) * 1000;
    return { mode: 'pick', tag: '금액 계산', prompt: `총매출 ${won(a)} 중 ${won(b)}어치가 반품되어 돌아왔다. 매출환입 후 남는 매출 금액은?`, picks: [{ label: won(a - b), value: a - b }], decoys: [{ label: won(a), value: a }, { label: won(b), value: b }, { label: won(a + b), value: a + b }], explain: '매출 ' + won(a) + '에서 매출환입 ' + won(b) + '을 빼면 ' + won(a - b) + '이에요.' };
  };

  /* ═══════════ 투자자산 ═══════════ */
  G['fin-long-deposit'] = (r) => {
    const a = int(r, 500, 2000, 100) * 1000;
    return { tag: '장기금융상품', prompt: `${particle(FIRM(r), '은', '는')} 3년 만기 정기예금에 현금 ${won(a)}을 예입했다.`, entries: [{ side: 'd', account: '장기금융상품', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '만기가 1년을 넘는 예금은 장기금융상품(투자자산)이에요.' };
  };
  G['fin-hold-bond'] = (r) => {
    const a = int(r, 500, 1500, 100) * 1000;
    return { tag: '만기보유증권', prompt: `${particle(FIRM(r), '은', '는')} 만기까지 보유할 목적으로 국채를 ${won(a)}에 현금으로 취득했다.`, entries: [{ side: 'd', account: '만기보유증권', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '만기까지 보유할 목적의 채권은 만기보유증권(투자자산)이에요.' };
  };
  G['fin-available-stock'] = (r) => {
    const a = int(r, 300, 1200, 100) * 1000;
    return { tag: '매도가능증권', prompt: `${particle(FIRM(r), '은', '는')} 장기간 보유할 목적으로 다른 회사 주식을 ${won(a)}에 현금으로 취득했다.`, entries: [{ side: 'd', account: '매도가능증권', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '장기 보유 목적의 주식은 매도가능증권(투자자산)으로 분류해요.' };
  };
  G['fin-long-loan'] = (r) => {
    const a = int(r, 500, 2000, 100) * 1000;
    return { tag: '장기대여금', prompt: `${particle(FIRM(r), '은', '는')} 거래처에 현금 ${won(a)}을 2년간 빌려주었다.`, entries: [{ side: 'd', account: '장기대여금', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '1년이 넘게 빌려준 돈은 장기대여금(투자자산)이에요.' };
  };
  G['fin-lease-deposit'] = (r) => {
    const a = int(r, 1000, 3000, 100) * 1000;
    return { tag: '임차보증금', prompt: `${particle(SHOP(r), '은', '는')} 매장으로 쓸 건물을 빌리며 보증금 ${won(a)}을 현금으로 지급했다.`, entries: [{ side: 'd', account: '임차보증금', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '건물을 빌리며 맡긴 보증금은 임차보증금(투자자산)이에요.' };
  };
  G['fin-bond-fee'] = (r) => {
    const a = int(r, 500, 1200, 100) * 1000, f = int(r, 10, 30, 5) * 1000;
    return { tag: '만기보유증권+수수료', prompt: `${particle(FIRM(r), '은', '는')} 만기까지 보유할 국채를 ${won(a)}에 사고 취득 수수료 ${won(f)}까지 포함해 현금으로 지급했다.`, entries: [{ side: 'd', account: '만기보유증권', amount: a + f }, { side: 'c', account: '현금', amount: a + f }], explain: '취득에 직접 든 수수료는 증권의 취득원가에 더해요.' };
  };
  G['fin-stock-fee'] = (r) => {
    const a = int(r, 300, 900, 100) * 1000, f = int(r, 5, 25, 5) * 1000;
    return { tag: '매도가능증권+수수료', prompt: `${particle(FIRM(r), '은', '는')} 장기 보유 목적으로 주식을 ${won(a)}에 사고 수수료 ${won(f)}을 더해 당좌수표로 지급했다.`, entries: [{ side: 'd', account: '매도가능증권', amount: a + f }, { side: 'c', account: '당좌예금', amount: a + f }], explain: '수수료를 포함한 금액이 매도가능증권의 취득원가예요.' };
  };
  G['fin-invest-property'] = (r) => {
    const a = int(r, 2000, 5000, 100) * 1000, tax = int(r, 50, 150, 10) * 1000;
    return { tag: '투자부동산', prompt: `${particle(FIRM(r), '은', '는')} 임대 목적으로 상가 건물을 ${won(a)}에 사고 취득세 ${won(tax)}을 포함해 전액 당좌수표로 지급했다.`, entries: [{ side: 'd', account: '투자부동산', amount: a + tax }, { side: 'c', account: '당좌예금', amount: a + tax }], explain: '임대·시세차익 목적의 부동산은 투자부동산이고, 취득세는 취득원가에 더해요.' };
  };
  G['fin-loan-collect'] = (r) => {
    const a = int(r, 500, 1500, 100) * 1000, i = int(r, 20, 80, 5) * 1000;
    return { tag: '장기대여금 회수', prompt: `장기대여금 ${won(a)}의 만기가 되어 원금 ${won(a)}과 이자 ${won(i)}을 현금으로 함께 회수했다.`, entries: [{ side: 'd', account: '현금', amount: a + i }, { side: 'c', account: '장기대여금', amount: a }, { side: 'c', account: '이자수익', amount: i }], explain: '원금은 장기대여금이 줄고, 이자는 이자수익(수익)으로 기록해요.', amountPhase: true };
  };
  G['fin-classify'] = (r) => {
    const right = ['만기보유증권', '매도가능증권', '투자부동산', '장기대여금', '장기금융상품', '임차보증금'];
    const wrong = ['단기매매증권', '토지', '건설중인자산', '비품', '선급금', '미수금', '외상매출금'];
    const n = int(r, 2, 3, 1);
    const ans = pickN(r, right, n);
    return { mode: 'pick', tag: '투자자산 분류', prompt: `비유동자산 중 '투자자산'에 속하는 계정과목 ${n}개를 골라 모두 부수세요.`, picks: ans.map((x) => ({ label: x })), decoys: pickN(r, wrong, 3).map((x) => ({ label: x })), explain: '투자자산: 만기보유증권·매도가능증권·투자부동산·장기대여금·장기금융상품·임차보증금. 단기매매증권은 당좌자산, 토지·비품·건설중인자산은 유형자산이에요.' };
  };
  G['fin-bond-mature'] = (r) => {
    const a = int(r, 500, 1200, 100) * 1000, i = int(r, 20, 70, 5) * 1000;
    return { tag: '만기보유증권 만기', prompt: `만기보유증권 국채 ${won(a)}이 만기가 되어 원금과 이자 ${won(i)}을 보통예금으로 받았다.`, entries: [{ side: 'd', account: '보통예금', amount: a + i }, { side: 'c', account: '만기보유증권', amount: a }, { side: 'c', account: '이자수익', amount: i }], explain: '만기가 되면 만기보유증권이 줄고, 받은 이자는 이자수익이에요.', amountPhase: true };
  };
  G['fin-sell-available'] = (r) => {
    const book = int(r, 300, 900, 100) * 1000, gain = int(r, 10, 60, 5) * 1000;
    return { tag: '매도가능증권 처분', prompt: `매도가능증권(장부금액 ${won(book)})을 ${won(book + gain)}에 팔고 대금은 보통예금으로 받았다.`, entries: [{ side: 'd', account: '보통예금', amount: book + gain }, { side: 'c', account: '매도가능증권', amount: book }, { side: 'c', account: '매도가능증권처분이익', amount: gain }], explain: '장부금액보다 비싸게 팔면 차액은 매도가능증권처분이익이에요.', amountPhase: true };
  };
  G['fin-concept'] = (r) => {
    const items = [
      { q: '만기가 1년을 넘는 정기예금은?', a: '장기금융상품', d: ['보통예금', '단기매매증권', '현금'] },
      { q: '만기까지 보유할 목적으로 산 국채는?', a: '만기보유증권', d: ['단기매매증권', '매도가능증권', '장기금융상품'] },
      { q: '임대를 목적으로 보유한 상가 건물은?', a: '투자부동산', d: ['건물', '건설중인자산', '비품'] },
      { q: '건물을 빌리며 맡긴 전세 보증금은?', a: '임차보증금', d: ['선급금', '미수금', '장기대여금'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '투자자산 계정', prompt: it.q + ' 알맞은 계정과목을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '보유 목적(투자·임대)과 만기(1년 초과)를 먼저 확인하면 투자자산을 구별할 수 있어요.' };
  };

  /* ═══════════ 유형자산 ═══════════ */
  G['fa-buy-fixture'] = (r) => {
    const a = int(r, 300, 1200, 50) * 1000;
    return { tag: '비품 취득', prompt: `${SHOP(r)}에서 매장용 ${particle(pick(r, EQUIP), '을', '를')} ${won(a)}에 사고 현금으로 지급했다. (비품으로 처리)`, entries: [{ side: 'd', account: '비품', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '오래 쓰는 기구는 비품(유형자산)이 늘어 차변, 현금은 줄어 대변이에요.' };
  };
  G['fa-buy-fixture-install'] = (r) => {
    const a = int(r, 800, 2500, 100) * 1000, f = int(r, 50, 150, 10) * 1000;
    return { tag: '비품+설치비', prompt: `${SHOP(r)}에서 ${particle(pick(r, EQUIP), '을', '를')} ${won(a)}에 사고 설치비 ${won(f)}을 더해 현금으로 지급했다. (비품으로 처리)`, entries: [{ side: 'd', account: '비품', amount: a + f }, { side: 'c', account: '현금', amount: a + f }], explain: '설치비는 취득부대비용이라 비품의 취득원가에 더해요.' };
  };
  G['fa-buy-machine'] = (r) => {
    const a = int(r, 2000, 4000, 100) * 1000, f = int(r, 50, 200, 10) * 1000;
    return { tag: '기계장치+운송비', prompt: `${particle(FIRM(r), '은', '는')} 공장용 기계 ${won(a)}을 사고 운송비 ${won(f)}을 더해 당좌수표로 지급했다.`, entries: [{ side: 'd', account: '기계장치', amount: a + f }, { side: 'c', account: '당좌예금', amount: a + f }], explain: '운송비도 취득부대비용이라 기계장치의 취득원가에 더해요.' };
  };
  G['fa-buy-land'] = (r) => {
    const a = int(r, 4000, 9000, 100) * 1000, tax = int(r, 100, 300, 10) * 1000;
    return { tag: '토지+취득세', prompt: `${particle(FIRM(r), '은', '는')} 영업용 토지를 ${won(a)}에 사고 취득세 ${won(tax)}을 포함해 전액 당좌수표로 지급했다.`, entries: [{ side: 'd', account: '토지', amount: a + tax }, { side: 'c', account: '당좌예금', amount: a + tax }], explain: '토지의 취득원가는 구입대금 + 취득세 같은 부대비용이에요. 토지는 감가상각하지 않아요.' };
  };
  G['fa-buy-building'] = (r) => {
    const a = int(r, 8000, 20000, 500) * 1000, fee = int(r, 100, 400, 50) * 1000;
    return { tag: '건물+중개수수료', prompt: `${particle(FIRM(r), '은', '는')} 영업용 건물을 ${won(a)}에 사고 중개수수료 ${won(fee)}을 더해 현금으로 지급했다.`, entries: [{ side: 'd', account: '건물', amount: a + fee }, { side: 'c', account: '현금', amount: a + fee }], explain: '중개수수료는 취득부대비용이라 건물의 취득원가에 더해요.' };
  };
  G['fa-buy-vehicle'] = (r) => {
    const a = int(r, 3000, 6000, 100) * 1000;
    return { tag: '차량 취득', prompt: `${particle(SHOP(r), '은', '는')} 배달용 차량을 ${won(a)}에 사고 대금은 다음 달에 지급하기로 했다.`, entries: [{ side: 'd', account: '차량운반구', amount: a }, { side: 'c', account: '미지급금', amount: a }], explain: '상품이 아닌 물건을 외상으로 사면 미지급금(부채)으로 기록해요.' };
  };
  G['fa-construction'] = (r) => {
    const a = int(r, 1000, 3000, 100) * 1000;
    return { tag: '건설중인자산', prompt: `신축 중인 ${SHOP(r)} 건물의 공사대금 ${won(a)}을 현금으로 지급했다.`, entries: [{ side: 'd', account: '건설중인자산', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '완공 전에 지급한 공사대금은 건설중인자산으로 모아 둬요.' };
  };
  G['fa-construction-done'] = (r) => {
    const a = int(r, 4000, 8000, 500) * 1000, b = int(r, 1000, 3000, 100) * 1000;
    return { tag: '완공·인수', prompt: `공사 중 ${won(b)}을 건설중인자산으로 기록했다. 건물이 완공돼 잔금 ${won(a)}을 현금으로 냈다.`, entries: [{ side: 'd', account: '건물', amount: a + b }, { side: 'c', account: '건설중인자산', amount: b }, { side: 'c', account: '현금', amount: a }], explain: '완공되면 건설중인자산과 잔금을 합쳐 건물 계정으로 옮겨요.', amountPhase: true };
  };
  G['fa-capital-expense'] = (r) => {
    const a = int(r, 800, 2000, 100) * 1000;
    return { tag: '자본적 지출', prompt: `${SHOP(r)} 건물에 엘리베이터를 새로 설치하고 ${won(a)}을 현금으로 지급했다. (건물의 가치를 높이는 지출)`, entries: [{ side: 'd', account: '건물', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '건물의 가치를 높이거나 내용연수를 늘리는 지출은 자본적 지출이라 해당 자산(건물)에 더해요.' };
  };
  G['fa-revenue-expense'] = (r) => {
    const a = int(r, 100, 600, 50) * 1000;
    return { tag: '수익적 지출', prompt: `${SHOP(r)} 건물 외벽을 다시 도색하고 ${won(a)}을 현금으로 지급했다. (원래 상태를 유지하는 지출)`, entries: [{ side: 'd', account: '수선비', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '원래 상태를 유지하는 지출은 수익적 지출이라 수선비(비용)로 처리해요.' };
  };
  G['fa-mixed-expense'] = (r) => {
    const cap = int(r, 400, 900, 100) * 1000, rev = int(r, 100, 400, 50) * 1000;
    return { tag: '자본적+수익적', prompt: `건물 공사비 ${won(cap + rev)}을 현금으로 냈다. 이 중 ${won(cap)}은 가치를 높이는 엘리베이터 설치비이고, ${won(rev)}은 원래 상태를 유지하는 외벽 도색비다.`, entries: [{ side: 'd', account: '건물', amount: cap }, { side: 'd', account: '수선비', amount: rev }, { side: 'c', account: '현금', amount: cap + rev }], explain: '한 번에 낸 돈이라도 자본적 지출은 건물에, 수익적 지출은 수선비로 나눠 기록해요.', amountPhase: true };
  };
  G['fa-dep-indirect'] = (r) => {
    const life = int(r, 4, 6, 1), res = 100000;
    const dep = int(r, 150, 450, 25) * 1000;
    const cost = res + dep * life;
    return { tag: '정액법·간접법', prompt: `비품의 1년분 감가상각비를 정액법으로 계산해 간접법으로 기록한다. (취득원가 ${won(cost)}, 잔존가치 ${won(res)}, 내용연수 ${life}년)`, entries: [{ side: 'd', account: '감가상각비', amount: dep }, { side: 'c', account: '비품감가상각누계액', amount: dep }], explain: '정액법: (' + won(cost) + ' − ' + won(res) + ') ÷ ' + life + '년 = ' + won(dep) + '. 간접법은 비품을 줄이지 않고 누계액을 대변에 적어요.', amountPhase: true };
  };
  G['fa-dep-direct'] = (r) => {
    const life = int(r, 4, 5, 1), res = 100000;
    const dep = int(r, 100, 350, 25) * 1000;
    const cost = res + dep * life;
    return { tag: '정액법·직접법', prompt: `기계장치의 1년분 감가상각비를 정액법으로 계산해 직접법으로 기록한다. (취득원가 ${won(cost)}, 잔존가치 ${won(res)}, 내용연수 ${life}년)`, entries: [{ side: 'd', account: '감가상각비', amount: dep }, { side: 'c', account: '기계장치', amount: dep }], explain: '직접법은 자산 계정을 직접 줄여요. 간접법과 달리 누계액 계정을 쓰지 않아요.', amountPhase: true };
  };
  G['fa-dep-calc'] = (r) => {
    const life = int(r, 4, 6, 1), res = int(r, 1, 3, 1) * 100000;
    const dep = int(r, 150, 400, 25) * 1000;
    const cost = res + dep * life;
    return { mode: 'pick', tag: '감가상각액 계산', prompt: `취득원가 ${won(cost)}, 잔존가치 ${won(res)}, 내용연수 ${life}년인 비품의 정액법 1년 감가상각비는?`, picks: [{ label: won(dep), value: dep }], decoys: [{ label: won(cost / life), value: cost / life }, { label: won(cost - res), value: cost - res }, { label: won(dep + 25000), value: dep + 25000 }, { label: won(Math.max(10000, dep - 25000)), value: dep - 25000 }], explain: '정액법 = (취득원가 − 잔존가치) ÷ 내용연수 = (' + won(cost) + ' − ' + won(res) + ') ÷ ' + life + ' = ' + won(dep) };
  };
  G['fa-dispose-gain'] = (r) => {
    const cost = int(r, 600, 1200, 100) * 1000, acc = int(r, 1, 4, 1) * 100000;
    const book = cost - acc, price = book + int(r, 2, 6, 1) * 10000;
    return { tag: '유형자산 처분이익', prompt: `비품(취득원가 ${won(cost)}, 비품감가상각누계액 ${won(acc)})을 ${won(price)}에 팔고 현금으로 받았다.`, entries: [{ side: 'd', account: '현금', amount: price }, { side: 'd', account: '비품감가상각누계액', amount: acc }, { side: 'c', account: '비품', amount: cost }, { side: 'c', account: '유형자산처분이익', amount: price - book }], explain: '장부금액 = ' + won(cost) + ' − ' + won(acc) + ' = ' + won(book) + '. ' + won(price) + '에 팔았으니 차액 ' + won(price - book) + '이 처분이익이에요.', amountPhase: true };
  };
  G['fa-dispose-loss'] = (r) => {
    const cost = int(r, 600, 1500, 100) * 1000, acc = int(r, 1, 4, 1) * 100000;
    const book = cost - acc, price = Math.max(10000, book - int(r, 2, 5, 1) * 10000);
    return { tag: '유형자산 처분손실', prompt: `기계장치(취득원가 ${won(cost)}, 기계장치감가상각누계액 ${won(acc)})를 ${won(price)}에 팔고 보통예금으로 받았다.`, entries: [{ side: 'd', account: '보통예금', amount: price }, { side: 'd', account: '기계장치감가상각누계액', amount: acc }, { side: 'd', account: '유형자산처분손실', amount: book - price }, { side: 'c', account: '기계장치', amount: cost }], explain: '장부금액 ' + won(book) + '보다 ' + won(book - price) + ' 싸게 팔아서 처분손실이 생겼어요.', amountPhase: true };
  };
  G['fa-dispose-receivable'] = (r) => {
    const book = int(r, 300, 800, 50) * 1000;
    return { tag: '처분·대금 미수', prompt: `${particle(SHOP(r), '은', '는')} 사용하던 냉장고(장부금액 ${won(book)})를 ${won(book)}에 처분하고 대금은 다음 달 말에 받기로 했다.`, entries: [{ side: 'd', account: '미수금', amount: book }, { side: 'c', account: '비품', amount: book }], explain: '상품이 아닌 물건을 팔고 나중에 받을 돈은 미수금이에요.' };
  };
  G['fa-concept'] = (r) => {
    const items = [
      { q: '건물의 가치를 높이는 엘리베이터 설치비는?', a: '자본적 지출', d: ['수익적 지출', '소모품비', '판매비'] },
      { q: '원래 상태를 유지하는 외벽 도색비는?', a: '수익적 지출', d: ['자본적 지출', '취득원가', '건설중인자산'] },
      { q: '아직 완성되지 않은 유형자산을 모아 두는 계정은?', a: '건설중인자산', d: ['투자부동산', '건물', '미지급금'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '유형자산 개념', prompt: it.q + ' 알맞은 말을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '자본적 지출은 자산을 늘리고, 수익적 지출은 비용으로 처리해요.' };
  };
  G['fa-dep-account'] = (r) => {
    const items = [
      { q: '간접법으로 감가상각을 기록할 때 대변 계정은?', a: '비품감가상각누계액', d: ['비품', '수선비', '감가상각비'] },
      { q: '감가상각을 기록할 때 차변 계정은?', a: '감가상각비', d: ['수선비', '비품', '유형자산처분손실'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '감가상각 계정', prompt: it.q + ' 알맞은 계정과목을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '간접법: (차)감가상각비 (대)비품감가상각누계액 / 직접법: (차)감가상각비 (대)비품' };
  };

  /* ═══════════ 무형자산 ═══════════ */
  G['ia-patent'] = (r) => {
    const a = int(r, 300, 1200, 100) * 1000;
    return { tag: '특허권 취득', prompt: `${particle(FIRM(r), '은', '는')} 신제품 제조에 필요한 특허권을 ${won(a)}에 사고 현금으로 지급했다.`, entries: [{ side: 'd', account: '특허권', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '특허권은 무형자산이에요. 사면 차변에 적어요.' };
  };
  G['ia-software'] = (r) => {
    const a = int(r, 200, 900, 50) * 1000;
    return { tag: '소프트웨어 취득', prompt: `${particle(SHOP(r), '은', '는')} 매장 관리용 컴퓨터 소프트웨어를 ${won(a)}에 사고 현금으로 지급했다.`, entries: [{ side: 'd', account: '컴퓨터소프트웨어', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '사서 쓰는 프로그램은 컴퓨터소프트웨어(무형자산)로 처리해요.' };
  };
  G['ia-trademark'] = (r) => {
    const a = int(r, 200, 800, 50) * 1000;
    return { tag: '상표권 취득', prompt: `${particle(SHOP(r), '은', '는')} 가게 이름의 상표권을 ${won(a)}에 사고 당좌수표를 발행했다.`, entries: [{ side: 'd', account: '상표권', amount: a }, { side: 'c', account: '당좌예금', amount: a }], explain: '상표권은 무형자산이에요.' };
  };
  G['ia-development'] = (r) => {
    const a = int(r, 500, 1500, 100) * 1000;
    return { tag: '개발비 자산 인식', prompt: `${particle(FIRM(r), '은', '는')} 신기술 개발에 ${won(a)}을 썼고, 자산으로 인식할 요건을 모두 갖추었다. 현금으로 지급했다.`, entries: [{ side: 'd', account: '개발비', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '개발비는 자산 인식 요건을 충족할 때만 무형자산(개발비)으로 처리해요. 요건을 못 갖추면 비용이에요.' };
  };
  G['ia-goodwill'] = (r) => {
    const a = int(r, 1000, 3000, 100) * 1000;
    return { tag: '영업권', prompt: `${particle(FIRM(r), '은', '는')} 다른 회사를 인수하며 순자산 장부가치보다 ${won(a)}을 더 지급했다. (현금 지급)`, entries: [{ side: 'd', account: '영업권', amount: a }, { side: 'c', account: '현금', amount: a }], explain: '회사를 살 때 장부가치보다 더 낸 금액은 영업권(무형자산)이에요.' };
  };
  G['ia-classify'] = (r) => {
    const right = ['영업권', '특허권', '상표권', '컴퓨터소프트웨어', '개발비', '산업재산권'];
    const wrong = ['임차보증금', '경상개발비', '비품', '건설중인자산', '선급비용', '토지'];
    const n = int(r, 2, 3, 1);
    const ans = pickN(r, right, n);
    return { mode: 'pick', tag: '무형자산 분류', prompt: `재무상태표에 '무형자산'으로 보고할 계정과목 ${n}개를 골라 모두 부수세요.`, picks: ans.map((x) => ({ label: x })), decoys: pickN(r, wrong, 3).map((x) => ({ label: x })), explain: '무형자산: 영업권·특허권·상표권·컴퓨터소프트웨어·개발비·산업재산권. 임차보증금은 투자자산, 경상개발비는 비용이에요.' };
  };
  G['ia-amortize'] = (r) => {
    const life = int(r, 3, 5, 1), a = life * int(r, 1, 3, 1) * 100000;
    const am = a / life;
    return { tag: '무형자산 상각', prompt: `특허권 ${won(a)}을 내용연수 ${life}년 동안 정액법으로 상각한다. 1년분 상각액을 직접법으로 기록하세요.`, entries: [{ side: 'd', account: '무형자산상각비', amount: am }, { side: 'c', account: '특허권', amount: am }], explain: '무형자산은 보통 직접법으로 상각해요. ' + won(a) + ' ÷ ' + life + ' = ' + won(am), amountPhase: true };
  };
  G['ia-amortize-sw'] = (r) => {
    const life = int(r, 2, 4, 1), a = life * int(r, 1, 3, 1) * 100000;
    const am = a / life;
    return { tag: '소프트웨어 상각', prompt: `컴퓨터소프트웨어 ${won(a)}을 내용연수 ${life}년 동안 정액법으로 상각한다. 1년분을 기록하세요.`, entries: [{ side: 'd', account: '무형자산상각비', amount: am }, { side: 'c', account: '컴퓨터소프트웨어', amount: am }], explain: '무형자산 상각은 (차)무형자산상각비 (대)해당 자산이에요.', amountPhase: true };
  };
  G['ia-dispose-gain'] = (r) => {
    const book = int(r, 200, 600, 50) * 1000, gain = int(r, 20, 90, 10) * 1000;
    return { tag: '무형자산 처분이익', prompt: `특허권(장부금액 ${won(book)})을 ${won(book + gain)}에 팔고 현금으로 받았다.`, entries: [{ side: 'd', account: '현금', amount: book + gain }, { side: 'c', account: '특허권', amount: book }, { side: 'c', account: '무형자산처분이익', amount: gain }], explain: '장부금액보다 비싸게 팔면 차액은 무형자산처분이익이에요.', amountPhase: true };
  };
  G['ia-dispose-loss'] = (r) => {
    const book = int(r, 200, 600, 50) * 1000, loss = int(r, 20, 80, 10) * 1000;
    return { tag: '무형자산 처분손실', prompt: `컴퓨터소프트웨어(장부금액 ${won(book)})를 ${won(book - loss)}에 팔고 보통예금으로 받았다.`, entries: [{ side: 'd', account: '보통예금', amount: book - loss }, { side: 'd', account: '무형자산처분손실', amount: loss }, { side: 'c', account: '컴퓨터소프트웨어', amount: book }], explain: '장부금액보다 싸게 팔면 차액만큼 무형자산처분손실이 생겨요.', amountPhase: true };
  };
  G['ia-total'] = (r) => {
    const gw = int(r, 8, 15, 1) * 100000, pat = int(r, 3, 8, 1) * 100000, sw = int(r, 2, 6, 1) * 100000, dev = int(r, 2, 6, 1) * 100000, dep = int(r, 3, 9, 1) * 100000;
    return { mode: 'pick', tag: '무형자산 합계', prompt: `영업권 ${won(gw)}, 특허권 ${won(pat)}, 임차보증금 ${won(dep)}, 컴퓨터소프트웨어 ${won(sw)}, 개발비 ${won(dev)}일 때 재무상태표의 무형자산 합계는?`, picks: [{ label: won(gw + pat + sw + dev), value: gw + pat + sw + dev }], decoys: [{ label: won(gw + pat + sw + dev + dep), value: gw + pat + sw + dev + dep }, { label: won(gw + pat + sw), value: gw + pat + sw }, { label: won(pat + sw + dev), value: pat + sw + dev }], explain: '임차보증금은 투자자산이라 무형자산 합계에서 빠져요. ' + won(gw) + ' + ' + won(pat) + ' + ' + won(sw) + ' + ' + won(dev) + ' = ' + won(gw + pat + sw + dev) };
  };
  G['ia-concept'] = (r) => {
    const items = [
      { q: '자산으로 인식할 요건을 갖춘 신제품 개발비는?', a: '개발비', d: ['경상개발비', '판매비', '영업권'] },
      { q: '회사를 인수하며 장부가치보다 더 낸 금액은?', a: '영업권', d: ['특허권', '개발비', '영업이익'] },
      { q: '무형자산을 상각할 때 쓰는 비용 계정은?', a: '무형자산상각비', d: ['감가상각비', '수선비', '소모품비'] }
    ];
    const it = pick(r, items);
    return { mode: 'pick', tag: '무형자산 개념', prompt: it.q + ' 알맞은 계정과목을 골라 부수세요.', picks: [{ label: it.a }], decoys: it.d.map((x) => ({ label: x })), explain: '무형자산은 형체가 없지만 오래 쓰는 자산이에요. 상각은 무형자산상각비로 기록해요.' };
  };

  G['fa-vehicle-maintenance'] = () => ({
    tag: '차량유지비와 수선비',
    prompt: '배달용 차량이 원래 성능을 유지하도록 수리했다. 수리비 120,000원을 현금으로 냈다.',
    entries: [{ side: 'd', account: '차량유지비', amount: 120000 }, { side: 'c', account: '현금', amount: 120000 }],
    explain: '차량의 수리비는 차량유지비, 건물의 도색비는 수선비로 기록해요. 둘 다 원래 상태를 유지하는 수익적 지출이에요.'
  });
  G['fa-no-depreciation'] = () => ({
    mode: 'pick', tag: '감가상각 제외',
    prompt: '감가상각을 하지 않는 유형자산끼리 짝지은 보기 하나를 고르세요.',
    picks: [{ label: '토지·건설중인자산' }],
    decoys: ['건물·비품', '차량운반구·기계장치', '토지·차량운반구'].map(label => ({ label })),
    explain: '토지와 아직 사용할 수 없는 건설중인자산은 감가상각하지 않아요.'
  });

  const EXPOSE = new Set('inv-13 inv-14 inv-18 inv-21 inv-25 inv-29 inv-31 inv-35 fin-5 fa-5 fa-7 fa-11 fa-13 fa-38 inv-19 inv-24 inv-28 inv-33 fa-43'.split(' '));
  const CHECKLIST = new Set(['fa-43', 'inv-19', 'inv-24', 'inv-28', 'inv-33']);
  function isFinal(corner, gen) {
    return corner === 'ia' || /^(fa-dep-|fa-dispose-|inv-bungi-|inv-chonggi-|inv-concept-method)/.test(gen);
  }

  /* ────────── 코너별 단계 배치 ────────── */
  const CORNERS = [
    {
      key: 'inv', name: '재고자산', emoji: '📦', color: '#5ad0a3', stages: 50,
      desc: '3분법·환입·에누리·분기법까지',
      plan: [
        'inv-buy-credit', 'inv-sell-credit', 'inv-buy-cash', 'inv-sell-cash', 'inv-buy-check',
        'inv-buy-credit', 'inv-sell-credit', 'inv-sell-cash', 'inv-buy-check', 'inv-concept-account',
        'inv-return-out', 'inv-return-in', 'inv-allowance-in', 'inv-allowance-out', 'inv-freight-in',
        'inv-return-out-cash', 'inv-return-in', 'inv-allowance-out', 'inv-freight-out', 'inv-concept-account',
        'inv-net-purchase', 'inv-discount-in', 'inv-combined-settle', 'inv-freight-in', 'inv-periodic-cost',
        'inv-return-out', 'inv-freight-out', 'inv-combined-settle', 'inv-net-purchase', 'inv-amount-only',
        'inv-periodic-cost', 'inv-gross-profit', 'inv-discount-in', 'inv-combined-settle', 'inv-net-purchase',
        'inv-bungi-buy', 'inv-chonggi-sell', 'inv-bungi-sell', 'inv-bungi-buy', 'inv-chonggi-sell',
        'inv-concept-method', 'inv-bungi-sell', 'inv-chonggi-sell', 'inv-concept-method', 'inv-gross-profit',
        'inv-bungi-sell', 'inv-bungi-buy', 'inv-concept-method', 'inv-chonggi-sell', 'inv-bungi-sell'
      ]
    },
    {
      key: 'fin', name: '투자자산', emoji: '💎', color: '#7bb8ff', stages: 30,
      desc: '만기·보유목적 구별부터 취득·회수까지',
      plan: [
        'fin-long-deposit', 'fin-hold-bond', 'fin-available-stock', 'fin-long-loan', 'fin-lease-deposit',
        'fin-concept', 'fin-hold-bond', 'fin-available-stock', 'fin-bond-fee', 'fin-stock-fee',
        'fin-invest-property', 'fin-loan-collect', 'fin-long-deposit', 'fin-hold-bond', 'fin-concept',
        'fin-stock-fee', 'fin-invest-property', 'fin-bond-fee', 'fin-classify', 'fin-classify',
        'fin-loan-collect', 'fin-bond-mature', 'fin-classify', 'fin-invest-property', 'fin-classify',
        'fin-bond-mature', 'fin-sell-available', 'fin-bond-fee', 'fin-sell-available', 'fin-classify'
      ]
    },
    {
      key: 'fa', name: '유형자산', emoji: '🏗️', color: '#ffb95a', stages: 50,
      desc: '취득원가·자본적 지출·감가상각·처분',
      plan: [
        'fa-buy-fixture', 'fa-buy-machine', 'fa-buy-land', 'fa-buy-fixture-install', 'fa-construction',
        'fa-buy-building', 'fa-buy-vehicle', 'fa-buy-fixture-install', 'fa-buy-land', 'fa-concept',
        'fa-vehicle-maintenance', 'fa-capital-expense', 'fa-construction-done', 'fa-mixed-expense', 'fa-buy-machine',
        'fa-capital-expense', 'fa-revenue-expense', 'fa-mixed-expense', 'fa-buy-building', 'fa-capital-expense',
        'fa-dep-indirect', 'fa-dep-account', 'fa-dep-calc', 'fa-dep-direct', 'fa-dep-indirect',
        'fa-dep-account', 'fa-dep-calc', 'fa-mixed-expense', 'fa-dep-direct', 'fa-dep-indirect',
        'fa-dep-calc', 'fa-dispose-receivable', 'fa-dispose-gain', 'fa-dispose-loss', 'fa-dep-indirect',
        'fa-dispose-gain', 'fa-dispose-loss', 'fa-no-depreciation', 'fa-dispose-receivable', 'fa-dep-calc',
        'fa-dispose-gain', 'fa-dispose-loss', 'fa-mixed-expense', 'fa-dispose-gain', 'fa-dep-account',
        'fa-dispose-loss', 'fa-dep-indirect', 'fa-dispose-gain', 'fa-concept', 'fa-dispose-loss'
      ]
    },
    {
      key: 'ia', name: '무형자산', emoji: '📜', color: '#c59bff', stages: 30,
      desc: '영업권·특허권·소프트웨어·상각',
      plan: [
        'ia-patent', 'ia-software', 'ia-trademark', 'ia-development', 'ia-goodwill',
        'ia-concept', 'ia-patent', 'ia-software', 'ia-classify', 'ia-classify',
        'ia-amortize', 'ia-amortize-sw', 'ia-development', 'ia-classify', 'ia-total',
        'ia-amortize', 'ia-concept', 'ia-amortize-sw', 'ia-classify', 'ia-total',
        'ia-dispose-gain', 'ia-dispose-loss', 'ia-amortize', 'ia-total', 'ia-classify',
        'ia-dispose-gain', 'ia-dispose-loss', 'ia-total', 'ia-concept', 'ia-dispose-gain'
      ]
    }
  ];

  const DECOY_POOL = {
    inv: ['현금', '외상매출금', '외상매입금', '운반비', '상품매출이익', '매출원가', '당좌예금', '미수금', '선급금', '비품'],
    fin: ['단기매매증권', '현금', '보통예금', '당좌예금', '이자수익', '토지', '건물', '비품', '미지급금', '단기대여금'],
    fa: ['현금', '당좌예금', '수선비', '소모품비', '미지급금', '미수금', '건물', '비품', '기계장치', '감가상각비'],
    ia: ['현금', '당좌예금', '무형자산상각비', '경상개발비', '임차보증금', '영업권', '특허권', '비품', '선급비용', '감가상각비']
  };

  function buildStage(corner, stageNo) {
    const gen = G[corner.plan[stageNo - 1]];
    const rng = makeRng(corner.key.charCodeAt(0) * 7919 + stageNo * 104729 + 17);
    const base = gen(rng);
    const st = {
      id: corner.key + '-' + stageNo,
      corner: corner.key,
      stage: stageNo,
      gen: corner.plan[stageNo - 1],
      mode: base.mode || 'journal',
      tag: base.tag || '',
      prompt: base.prompt,
      entries: base.entries || [],
      picks: base.picks || [],
      explain: base.explain || '',
      amountPhase: !!base.amountPhase
    };
    st.scope = isFinal(st.corner, st.gen) ? 'final' : 'third';
    if (st.picks.length > 1) {
      const outside = st.decoys || base.decoys;
      st.picks = [outside[0]];
      base.decoys = base.picks;
      st.prompt = (st.corner === 'fin' ? '투자자산' : '무형자산') + '이 아닌 계정과목 하나를 고르세요.';
    }
    if (CHECKLIST.has(st.id) || st.gen === 'ia-total' || /^fa-dep-(direct|indirect)$/.test(st.gen)) {
      const split = st.prompt.replace(/, (판매자가|매입자가|남은 금액을)/, '\n$1')
        .replace(/(.+?) 오늘 현금으로 갚으며 (매입할인 .+?) 받았다\./, '$1 갚기로 했다.\n$2 받고 나머지를 현금으로 냈다.')
        .replace('. 이 중 ', '.\n이 중 ').replace(' 설치비이고, ', ' 설치비다.\n');
      if (st.gen === 'ia-total') {
        st.conditions = split.split(/, (?=[가-힣])/).map(text => text.replace(/일 때 재무상태표의 무형자산 합계는\?$/, ''));
        st.prompt = '재무상태표에 표시할 무형자산의 합계는 얼마인가요?';
      } else if (/^fa-dep-(direct|indirect)$/.test(st.gen)) {
        const [task, givens] = split.split(' (');
        st.conditions = givens.slice(0, -1).split(/, (?=[가-힣])/);
        st.prompt = task.replace('기록한다.', '기록하세요.');
      } else {
        st.conditions = split.replace(/ \(3분법\)$/, '').split('\n').map(text =>
          text.replace(/팔고$/, '팔았다.').replace(/사고$/, '샀다.').replace(/돌려보내고$/, '돌려보냈다.'));
        st.prompt = st.corner === 'inv' ? '다음 거래를 3분법으로 분개하세요.' : '다음 지출을 나누어 분개하세요.';
      }
    }
    // 복합분개가 아니어도 16단계부터는 금액 라운드를 붙인다
    if (st.mode === 'journal' && !st.amountPhase && stageNo >= 16) st.amountPhase = true;
    if (st.mode === 'journal') {
      // 방해 블록: 정답 계정을 제외하고 3~6개
      const answers = st.entries.map((e) => e.account);
      const pool = DECOY_POOL[corner.key].filter((a) => answers.indexOf(a) < 0 && ACCOUNTS[a]);
      const need = Math.min(pool.length, 2 + Math.ceil(stageNo / 12));
      st.decoys = pickN(rng, pool, need).map((a) => ({ account: a }));
      // 금액 라운드 방해 숫자
      if (st.amountPhase) {
        const top = Math.max.apply(null, st.entries.map((e) => e.amount));
        const cand = [top + 10000, top - 10000, top + 50000, Math.round(top / 2 / 1000) * 1000, top * 2]
          .filter((v) => v > 0 && !st.entries.some((e) => e.amount === v));
        st.amountDecoys = pickN(rng, cand, Math.min(2, cand.length));
      }
    } else {
      st.decoys = (base.decoys || []);
      if (!st.decoys.length) st.decoys = [{ label: '없음' }];
    }
    // 제한 시간: 단계가 오를수록 짧아진다
    st.timeLimit = Math.max(40, 100 - Math.floor(stageNo * 1.1));
    return st;
  }

  const STAGES = {};
  CORNERS.forEach((c) => {
    STAGES[c.key] = [];
    for (let i = 1; i <= c.stages; i++) STAGES[c.key].push(buildStage(c, i));
  });

  // Mode placement has its own seed. Transaction generation continues to use makeRng.
  function modeSeed(key) {
    return [...('blast-v8:' + key)].reduce((hash, ch) =>
      Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  }

  function assignModes(corner, stages) {
    const long = corner.stages === 50;
    const hardCount = long ? 8 : 5;
    const pureCount = long ? 20 : 10;
    const targets = (st) => [...new Set(st.entries.map((entry) => entry.amount)
      .filter((amount) => amount >= 300000 && amount <= 950000 && amount % 10000 === 0))];
    const candidates = stages.filter((st) => st.stage >= 6 && st.stage < corner.stages &&
      st.mode === 'journal' && !EXPOSE.has(st.id) && targets(st).length);
    let best = [];
    let bestCost = Infinity;

    function spread(start, selected, cost) {
      if (cost >= bestCost) return;
      if (selected.length === hardCount) {
        best = selected;
        bestCost = cost;
        return;
      }
      const ideal = 16 + selected.length * (corner.stages - 17) / (hardCount - 1);
      for (let i = start; i <= candidates.length - (hardCount - selected.length); i++) {
        const st = candidates[i];
        const adjacent = st.stage - (selected.at(-1)?.stage ?? 0) === 1;
        const tie = modeSeed(corner.key + ':hard:' + st.stage) / 4294967296;
        spread(i + 1, [...selected, st], cost + (adjacent ? 10000 : 0) + (st.stage < 16 ? 1000 : 0) + (st.stage - ideal) ** 2 + tie / 10);
      }
    }

    spread(0, [], 0);
    best.forEach((st) => {
      st.mode = 'hard';
      st.hardTargets = targets(st);
    });

    const taken = [1, corner.stages];
    for (let i = 0; i < pureCount; i++) {
      const eligible = stages.slice(1, -1).filter((st) => st.mode !== 'hard' && st.mode !== 'pure' && !EXPOSE.has(st.id))
        .filter((st) => {
          // Never let another speed stage create a run of four.
          let start = st.stage - 1;
          let end = start;
          while (stages[start - 1]?.mode === 'pure') start--;
          while (stages[end + 1]?.mode === 'pure') end++;
          return end - start < 3;
        });
      const spacing = (st) => Math.min(...taken.map((n) => Math.abs(n - st.stage)));
      eligible.sort((a, b) => spacing(b) - spacing(a) ||
        modeSeed(corner.key + ':pure:' + a.stage) - modeSeed(corner.key + ':pure:' + b.stage));
      const st = eligible[0];
      st.mode = 'pure';
      taken.push(st.stage);
    }
  }
  CORNERS.forEach((corner) => assignModes(corner, STAGES[corner.key]));

  /* 11월 30일 3차 서술형평가 출제 유형과 같은 단계 (단계 선택 화면에 '3차' 표시) */
  const EXAM = {
    'inv-sell-credit': '3차 1번 유형 · 상품 외상매출',
    'inv-freight-in': '3차 2번 유형 · 매입운임',
    'inv-return-out': '3차 3번 유형 · 매출환입',
    'inv-allowance-in': '3차 4번 유형 · 매입에누리',
    'fin-hold-bond': '3차 5번 유형 · 만기보유증권',
    'fin-available-stock': '3차 6번 유형 · 매도가능증권',
    'fa-buy-fixture-install': '3차 7번 유형 · 비품+설치비',
    'fa-mixed-expense': '3차 8번 유형 · 지출 구분',
    'fa-vehicle-maintenance': '3차 9번 유형 · 차량유지비',
    'fa-construction': '3차 10번 유형 · 공사비 지급',
    'fa-construction-done': '3차 10번 유형 · 완공 대체',
    'fa-no-depreciation': '3차 10번 유형 · 감가상각 제외'
  };
  const FINAL_EXAM = {
    'fa-dep-indirect': '정액법 간접법',
    'ia-software': '소프트웨어'
  };
  const api = { FINAL_EXAM, CORNERS, STAGES, ACCOUNTS, EXAM, buildStage, makeRng, won };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BlasterData = api;
})(typeof window !== 'undefined' ? window : globalThis);
