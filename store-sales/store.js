/* 매장판매 스테이션 · 공용 스크립트 (4모듈 + 케이스스터디)
   - 페이지마다 필요한 부분만 동작합니다. 없는 요소는 건너뜁니다.
   - 어떤 입력도 서버로 보내지 않습니다. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var $$ = function(sel, root){ return [].slice.call((root || document).querySelectorAll(sel)); };
  var won = function(n){ return Math.round(n).toLocaleString('ko-KR') + '원'; };
  var esc = function(s){
    return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  };

  /* ---------- 상단 내비게이션: 현재 페이지 표시 ---------- */
  var here = location.pathname.replace(/\/+$/, '/').split('/').slice(-1)[0] || 'index.html';
  $$('[data-nav]').forEach(function(a){
    var target = a.getAttribute('href') || '';
    var file = target.split('/').pop().split('#')[0];
    if (target.indexOf('case-study') > -1) file = 'case-study.html';
    if (file === '' ) file = 'index.html';
    if (file === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- 페이지 안 구역 하이라이트 ---------- */
  var navLinks = $$('#navScroll a[href^="#"]');
  if (navLinks.length) {
    var sections = navLinks.map(function(a){ return document.querySelector(a.getAttribute('href')); });
    var syncNav = function(){
      var y = window.scrollY + 150, idx = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].offsetTop <= y) idx = i;
      }
      navLinks.forEach(function(a, k){
        if (k === idx) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var ticking = false;
    window.addEventListener('scroll', function(){
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function(){ syncNav(); ticking = false; });
    }, { passive: true });
    syncNav();
  }

  /* ---------- 두 개의 눈 ---------- */
  var eyeList = $('eyeList');
  if (eyeList) {
    var EYES = [
      {h:'무한리필 · 무료 리필', c:'부담 없이 배불리 먹을 수 있어 좋다.', m:'원재료비와 폐기량이 같이 늘어난다.'},
      {h:'넓은 매장', c:'답답하지 않고 단체로 와도 편하다.', m:'임대료·관리비·인건비가 함께 커진다.'},
      {h:'무료 배송', c:'배송비 부담이 없어 더 자주 시킨다.', m:'배송비와 파손·지연 응대가 매장에 남는다.'},
      {h:'유리병에 담은 음료', c:'모양이 예쁘고 선물하기 좋다.', m:'파손 위험, 포장재, 사고 응대까지 붙는다.'},
      {h:'늦은 밤까지 영업', c:'퇴근 후에도 들를 수 있어 고맙다.', m:'심야 인건비·전기료에 회전율은 낮다.'}
    ];
    var eyeNote = $('eyeNote'), eyeMode = 'c';
    var renderEyes = function(){
      eyeList.innerHTML = EYES.map(function(it){
        return '<div class="eye-item"><h3>' + it.h + '</h3><p>' + (eyeMode === 'c' ? it.c : it.m) + '</p></div>';
      }).join('');
      eyeNote.innerHTML = eyeMode === 'c'
        ? '<b>손님의 눈</b>으로 보고 있습니다. 장점만 보이면 놓치는 비용이 생기고, 비용만 보이면 손님이 떠납니다.'
        : '<b>매장관리자의 눈</b>으로 보고 있습니다. 비용만 보면 손님이 떠나고, 장점만 보면 남는 돈이 사라집니다.';
    };
    $('eyeCustomer').addEventListener('click', function(){
      eyeMode = 'c'; this.setAttribute('aria-pressed','true'); $('eyeManager').setAttribute('aria-pressed','false'); renderEyes();
    });
    $('eyeManager').addEventListener('click', function(){
      eyeMode = 'm'; this.setAttribute('aria-pressed','true'); $('eyeCustomer').setAttribute('aria-pressed','false'); renderEyes();
    });
    renderEyes();
  }

  /* ---------- 불만 접수 6단계 ---------- */
  var caseChips = $('caseChips');
  if (caseChips) {
    var STEPS = ['듣기','확인','판단','해결','안내','기록'];
    var CASES = [
      {
        id:'dalgona', tag:'프랜차이즈 카페 · 홀', label:'달고나 개수',
        scene:'메뉴 사진보다 달고나가 적다며 손님이 계산대 앞에서 사진을 보여 줍니다. 목소리가 조금 커졌고, 뒤에 줄이 서 있습니다.',
        ask:'사진과 실제 음료가 다르다며 달고나를 더 달라는 요구',
        steps:[
          {q:'손님이 사진을 보여 주며 항의를 시작합니다. 첫마디는?', opts:[
            {t:'“사진과 실제가 달라 속상하셨겠어요. 어떤 점이 가장 불편하셨어요?”', s:2, fb:'먼저 감정을 받아 주면 손님은 사실을 말하기 시작합니다. 듣기는 해결이 아니라 정보 수집입니다.', led:''},
            {t:'“저는 매뉴얼대로 만들었는데요.”', s:0, fb:'내가 틀리지 않았다는 말이 먼저 나오면, 손님은 사실 대신 감정으로 싸우게 됩니다.', led:''},
            {t:'“잠시만요, 사진부터 다시 볼게요.”', s:1, fb:'확인은 좋지만 손님의 말을 받아 주지 않은 채 화면부터 보면 무시당했다고 느낍니다.', led:''}
          ]},
          {q:'무엇을 확인해야 할까요?', opts:[
            {t:'주문 내역과 메뉴 사진을 함께 놓고, 받은 음료도 같이 봅니다.', s:2, fb:'주문·기준·결과를 한자리에서 확인하면 “내 말이 맞다”는 다툼이 “무엇이 다른가”의 확인으로 바뀝니다.', led:''},
            {t:'“다른 손님들도 그냥 가시는데요.”', s:0, fb:'다른 손님을 근거로 쓰면 이 손님의 문제는 해결되지 않고 자존심 문제가 됩니다.', led:''},
            {t:'사진만 확인하고 음료는 보지 않습니다.', s:1, fb:'기준만 확인하면 실제로 무엇이 나갔는지를 놓칩니다. 두 가지를 같이 봐야 합니다.', led:''}
          ]},
          {q:'사실을 확인했습니다. 무엇을 제안할까요?', opts:[
            {t:'“달고나는 제가 더 올려 드릴 수 있어요. 2분 정도 걸립니다.”', s:2, fb:'내 권한 안에서 할 수 있는 일과 걸리는 시간을 함께 말하면 손님이 선택할 수 있습니다.', led:''},
            {t:'“바로 환불해 드릴까요?”', s:1, fb:'환불은 강한 카드입니다. 먼저 작은 해결책을 제시하면 매장 손실도 줄고 손님도 만족합니다.', led:''},
            {t:'“본사 규정상 안 됩니다.”', s:0, fb:'규정은 이유가 될 수 있지만 대안이 없으면 손님에게는 거절만 남습니다.', led:''}
          ]},
          {q:'해결 단계에서 실제로 할 일은?', opts:[
            {t:'달고나를 더 올리고, 제조 과정을 짧게 설명해 드린다.', s:2, fb:'해결과 설명이 함께 가면 손님은 “다음에도 여기서 사도 되겠다”고 판단합니다.', led:'달고나 추가 제공 + 제조 기준 설명'},
            {t:'음료를 새로 만들어 통째로 교체한다.', s:1, fb:'친절하지만 원가 손실이 큽니다. 문제가 달고나 개수라면 그만큼만 고치는 것이 정확합니다.', led:'음료 전체 재제조'},
            {t:'그대로 전달하고 다음 손님을 받는다.', s:0, fb:'해결하지 않은 불만은 리뷰와 재방문 포기로 돌아옵니다.', led:'조치 없이 전달'}
          ]},
          {q:'해결한 뒤 어떻게 안내할까요?', opts:[
            {t:'“더 넣어 드렸어요. 다음에 주문하실 때 말씀 주시면 맞춰 드릴게요.”', s:2, fb:'안내는 결과 + 다음에 달라지는 점까지 말할 때 완성됩니다.', led:'“더 넣어 드렸고, 다음 주문 때 말씀 주시면 맞춰 드립니다”'},
            {t:'“됐죠?”', s:0, fb:'해결은 했지만 말이 결과를 지웁니다.', led:'“됐죠?”'},
            {t:'“본사에 건의해 볼게요.”', s:1, fb:'좋은 의도지만 지금 손님의 문제 해결과는 거리가 있습니다.', led:'“본사에 건의하겠습니다”'}
          ]},
          {q:'마지막으로 무엇을 남길까요?', opts:[
            {t:'접수 대장에 시간·주문·차이·조치를 적고, 사진과 실제 음료 차이를 매니저에게 보고한다.', s:2, fb:'기록은 다음 손님을 위한 준비입니다. 반복되는 불만이면 메뉴 사진이나 제조 기준을 고칠 근거가 됩니다.', led:'접수 대장 기록 + 매니저 보고'},
            {t:'기억해 둔다.', s:0, fb:'기억은 다음 주에 사라집니다. 기록만이 VOC가 됩니다.', led:'구두로만 기억'},
            {t:'손님에게 사과하고 끝낸다.', s:1, fb:'응대는 끝났지만 매장은 아무것도 배우지 못했습니다.', led:'사과 후 종료'}
          ]}
        ]
      },
      {
        id:'icehot', tag:'베이커리 카페 · 홀', label:'아이스/핫 주문',
        scene:'아이스 아메리카노 두 잔을 주문한 손님이 “따뜻한 걸 시켰다”며 다시 만들어 달라고 합니다. 주문 내역에는 아이스로 찍혀 있고, 손님 목소리가 커지자 매니저가 다가옵니다.',
        ask:'주문과 다른 음료가 나왔다며 재제조를 요구',
        steps:[
          {q:'첫마디는?', opts:[
            {t:'“불편하셨겠어요. 어떤 음료를 받으셨어요?”', s:2, fb:'사실보다 감정이 먼저 올라온 상황입니다. 받아 주고 나서 확인해야 대화가 됩니다.', led:''},
            {t:'“주문서에는 아이스로 되어 있는데요.”', s:0, fb:'맞는 말이지만 첫마디로 쓰면 손님은 “내 말은 안 듣는다”고 느낍니다.', led:''},
            {t:'“제가 잘못 들었을 수도 있으니 확인해 볼게요.”', s:1, fb:'겸손하지만 사실관계를 흐리면 나중에 판단이 어려워집니다.', led:''}
          ]},
          {q:'어떻게 확인할까요?', opts:[
            {t:'주문 내역·영수증·현재 음료 상태를 함께 확인한다.', s:2, fb:'확인은 세 가지를 같이 볼 때 사실이 됩니다.', led:''},
            {t:'손님 말만 듣고 바로 다시 만든다.', s:1, fb:'빠르지만 반복되면 주문 오류가 누구의 문제인지 알 수 없게 됩니다.', led:''},
            {t:'내 기억만 믿는다.', s:0, fb:'기억은 증거가 아닙니다. 확인 없이 맞서면 매니저가 개입할 일만 커집니다.', led:''}
          ]},
          {q:'내 권한과 사실을 알고 있습니다. 어떻게 판단할까요?', opts:[
            {t:'“확인해 보니 아이스로 주문되어 있어요. 그래도 불편하셨으니 한 잔은 다시 만들어 드릴게요.”', s:2, fb:'사실을 말하되 손님의 불편을 인정하고, 내 권한 안의 대안을 제시합니다.', led:''},
            {t:'“제가 맞는데 왜 그러세요?”', s:0, fb:'이기는 대화는 남지만 손님은 잃습니다. 매장 입장에서도 손해입니다.', led:''},
            {t:'매니저에게 바로 넘긴다.', s:1, fb:'권한 밖이라면 맞지만, 확인 가능한 일까지 넘기면 성장이 없습니다.', led:''}
          ]},
          {q:'해결은 어떻게?', opts:[
            {t:'한 잔만 교체하고, 남은 한 잔과 추가 요청을 확인한다.', s:2, fb:'문제가 된 부분만 고치면 손실을 줄이면서 손님도 만족합니다.', led:'한 잔 교체 + 나머지 확인'},
            {t:'두 잔 모두 새로 만든다.', s:1, fb:'만족은 크지만 원가 손실이 두 배가 됩니다. 이유 없이 쓰면 다음에도 같은 요구가 옵니다.', led:'두 잔 모두 교체'},
            {t:'교체를 거부한다.', s:0, fb:'사실이 맞아도 거부만 하면 불만은 리뷰로 옮겨 갑니다.', led:'교체 거부'}
          ]},
          {q:'안내 문장은?', opts:[
            {t:'“따뜻한 음료로 바꿔 드렸습니다. 다음 주문 때 한 번 더 확인하겠습니다.”', s:2, fb:'결과와 다음 행동을 함께 말하면 손님은 매장이 달라졌다고 기억합니다.', led:'“따뜻한 음료로 바꿔 드렸고, 다음 주문 때 확인하겠습니다”'},
            {t:'“다음부터 잘 확인하세요.”', s:0, fb:'손님에게 숙제를 주는 말입니다. 응대가 아니라 훈계가 됩니다.', led:'“다음부터 잘 확인하세요”'},
            {t:'아무 말 없이 음료만 건넨다.', s:1, fb:'해결은 했지만 말이 없으면 또 다른 불친절로 기억됩니다.', led:'말없이 전달'}
          ]},
          {q:'기록은?', opts:[
            {t:'접수 대장에 주문 오류·응대 방식을 적고, 주문 확인 멘트 개선안을 제안한다.', s:2, fb:'개인의 실수를 시스템의 개선으로 바꾸는 것이 VOC입니다.', led:'대장 기록 + 주문 확인 멘트 개선 제안'},
            {t:'매니저에게 구두로만 알린다.', s:1, fb:'빠르지만 쌓이지 않습니다. 같은 일이 반복되면 근거가 없습니다.', led:'구두 보고만'},
            {t:'그냥 넘어간다.', s:0, fb:'다음에도 같은 장면이 반복됩니다.', led:'기록 없음'}
          ]}
        ]
      },
      {
        id:'cake', tag:'베이커리 · 예약 픽업', label:'예약 케이크 누락',
        scene:'예약 시간에 맞춰 온 손님 앞에 케이크가 없습니다. 예약 장부는 홀 직원이 확인하지 않았고, 냉장고에는 다른 이름의 케이크만 있습니다.',
        ask:'예약한 케이크가 없으니 지금 받을 수 있게 해 달라는 요구',
        steps:[
          {q:'첫마디는?', opts:[
            {t:'“예약 시간에 오셨는데 없어서 당황하셨겠어요. 예약 내용부터 확인하겠습니다.”', s:2, fb:'사과와 확인을 한 문장에 담으면 손님은 기다릴 이유를 얻습니다.', led:''},
            {t:'“예약 장부에는 없는데요.”', s:0, fb:'장부만 보면 손님은 사라집니다. 실제 예약 경로(전화·메시지)도 확인해야 합니다.', led:''},
            {t:'“잠시만 기다려 주세요.”', s:1, fb:'기다리게 하는 것은 확인 중임을 알려야 의미가 있습니다.', led:''}
          ]},
          {q:'확인할 것은?', opts:[
            {t:'전화·문자·온라인 예약 기록과 결제 내역을 모두 확인한다.', s:2, fb:'예약은 여러 경로로 들어옵니다. 한 곳만 보면 “누락”이 아니라 “확인 실패”가 됩니다.', led:''},
            {t:'장부만 다시 본다.', s:1, fb:'이미 없는 것을 다시 봐도 없습니다.', led:''},
            {t:'“예약한 적 없으시죠?”라고 묻는다.', s:0, fb:'손님을 의심하는 말은 사실 확인이 아니라 다툼의 시작입니다.', led:''}
          ]},
          {q:'확인 결과 예약이 맞습니다. 어떻게 판단할까요?', opts:[
            {t:'지금 만들 수 있는 대체 케이크와 시간을 안내하고, 원하는 쪽을 고르게 한다.', s:2, fb:'대안을 두 개 이상 주면 손님은 “선택”을 하게 되고, 불만은 협의로 바뀝니다.', led:''},
            {t:'환불만 안내한다.', s:1, fb:'정확하지만 오늘의 기념일은 사라집니다. 대안이 있으면 먼저 제시합니다.', led:''},
            {t:'“내일 다시 오세요.”', s:0, fb:'손님의 일정을 매장이 결정하는 말입니다.', led:''}
          ]},
          {q:'해결은?', opts:[
            {t:'대체 케이크를 같은 가격으로 제공하고, 메시지 카드를 무료로 넣어 준다.', s:2, fb:'핵심 요구(오늘 챙긴다)를 지키면서 작은 보상으로 감정을 회복합니다.', led:'대체 케이크 동일 가격 제공 + 메시지 카드'},
            {t:'다음 방문 때 할인 쿠폰을 준다.', s:1, fb:'오늘 필요한 사람에게 내일의 쿠폰은 크게 와닿지 않습니다.', led:'다음 방문 할인 쿠폰'},
            {t:'아무것도 제공하지 않는다.', s:0, fb:'매장 실수에 대한 보상이 없으면 신뢰가 사라집니다.', led:'보상 없음'}
          ]},
          {q:'안내는?', opts:[
            {t:'“오늘 챙기실 수 있게 준비했고, 예약 확인은 제가 두 번 확인하겠습니다.”', s:2, fb:'다음에 달라질 점을 말하면 손님은 재방문을 결정할 수 있습니다.', led:'“오늘 챙기실 수 있게 준비했고, 예약 확인을 두 번 하겠습니다”'},
            {t:'“죄송합니다.”만 말한다.', s:1, fb:'사과만 있고 다음이 없으면 같은 일이 반복될 것이라 느낍니다.', led:'“죄송합니다”만'},
            {t:'“본사 시스템 문제예요.”', s:0, fb:'책임을 바깥으로 돌리면 매장 신뢰만 떨어집니다.', led:'“시스템 문제”로 안내'}
          ]},
          {q:'기록은?', opts:[
            {t:'예약 대장에 누락 사실과 조치를 적고, 예약 확인 절차(오전·픽업 전)를 제안한다.', s:2, fb:'절차를 바꾸는 기록이 진짜 재발 방지입니다.', led:'예약 대장 기록 + 확인 절차 2회 제안'},
            {t:'직원에게 “다음부터 잘하자”고 말한다.', s:1, fb:'의지는 좋지만 절차가 없으면 잊힙니다.', led:'구두 주의'},
            {t:'기록하지 않는다.', s:0, fb:'같은 누락이 반복될 조건이 그대로 남습니다.', led:'기록 없음'}
          ]}
        ]
      },
      {
        id:'coupon', tag:'카페 · 계산대', label:'기간 지난 쿠폰',
        scene:'손님이 지난주에 끝난 쿠폰을 내밀며 “이거 왜 안 되냐”고 묻습니다. 쿠폰에는 기간이 작게 인쇄되어 있고, 손님은 “안내를 못 봤다”고 말합니다.',
        ask:'기간이 지난 쿠폰을 오늘 사용하게 해 달라는 요구',
        steps:[
          {q:'첫마디는?', opts:[
            {t:'“쿠폰을 챙겨 오셨는데 사용이 안 되면 아쉬우시겠어요. 기간을 같이 확인해 볼게요.”', s:2, fb:'거절이 예정된 대화일수록 감정을 먼저 받아 줘야 설명이 들어갑니다.', led:''},
            {t:'“기간 지났어요.”', s:0, fb:'사실이지만 말이 짧으면 무례하게 들립니다.', led:''},
            {t:'“어디서 받으신 쿠폰인가요?”', s:1, fb:'확인은 필요하지만 먼저 손님의 아쉬움을 인정하면 대화가 부드러워집니다.', led:''}
          ]},
          {q:'확인할 것은?', opts:[
            {t:'쿠폰의 기간·사용 조건과 함께, 매장에 안내가 제대로 있었는지 확인한다.', s:2, fb:'손님 잘못만 확인하면 개선할 것이 안 보입니다. 안내 방식도 함께 봅니다.', led:''},
            {t:'쿠폰 기간만 본다.', s:1, fb:'사실은 확인되지만 매장의 안내 책임은 놓칩니다.', led:''},
            {t:'“안내를 못 보셨으면 어쩔 수 없죠.”', s:0, fb:'손님 탓으로 끝내면 매장은 아무것도 배우지 못합니다.', led:''}
          ]},
          {q:'어떻게 판단할까요?', opts:[
            {t:'원칙은 기간 준수로 안내하되, 오늘 한 번만 쓸 수 있는 대안(소액 할인·음료 사이즈 업)을 제시한다.', s:2, fb:'원칙과 배려를 동시에 지키는 판단입니다. 다만 “한 번만”이라는 경계를 분명히 합니다.', led:''},
            {t:'바로 사용 처리한다.', s:0, fb:'한 번의 친절이 다른 손님에게는 불공정이 됩니다. 기준이 무너지면 응대가 매번 달라집니다.', led:''},
            {t:'정중히 거절만 한다.', s:1, fb:'원칙은 지켰지만 손님의 기분은 남습니다.', led:''}
          ]},
          {q:'해결은?', opts:[
            {t:'오늘만 적용되는 대안을 안내하고, 손님이 선택하면 그대로 처리한다.', s:2, fb:'작은 대안도 손님이 고르면 만족도가 달라집니다.', led:'오늘 1회 대안 제공(소액 할인 또는 사이즈 업)'},
            {t:'새 쿠폰을 발급한다.', s:1, fb:'다음 방문을 만드는 좋은 방법이지만 재방문 조건을 확인해야 합니다.', led:'새 쿠폰 발급'},
            {t:'아무 대안 없이 돌려보낸다.', s:0, fb:'원칙은 지켰지만 관계는 끊깁니다.', led:'대안 없음'}
          ]},
          {q:'안내는?', opts:[
            {t:'“기간이 지나면 사용이 어렵지만, 오늘은 이렇게 도와드릴 수 있어요. 다음 쿠폰에는 기간을 크게 표시해 드릴게요.”', s:2, fb:'거절의 이유와 오늘의 예외, 다음의 개선을 한 번에 전달합니다.', led:'“기간이 지나 사용은 어렵지만, 오늘은 이렇게 도와드리고 다음 쿠폰은 기간을 크게 표시하겠습니다”'},
            {t:'“다음부터 기간 확인하세요.”', s:0, fb:'훈계는 응대가 아닙니다.', led:'“다음부터 확인하세요”'},
            {t:'“규정이라 어쩔 수 없어요.”', s:1, fb:'설명은 되지만 대안이 없습니다.', led:'“규정상 어렵습니다”'}
          ]},
          {q:'기록은?', opts:[
            {t:'대장에 유형(기간 만료)을 적고, 쿠폰 안내 문구·인쇄 크기 개선을 건의한다.', s:2, fb:'같은 불만이 반복된다면 응대가 아니라 쿠폰 설계를 고쳐야 합니다.', led:'유형 기록 + 쿠폰 안내 문구 개선 건의'},
            {t:'기록하지 않는다.', s:0, fb:'반복되는 불만을 볼 수 없습니다.', led:'기록 없음'},
            {t:'손님에게만 다시 설명한다.', s:1, fb:'이 손님은 이해했지만 다음 손님은 같은 자리에서 멈춥니다.', led:'개별 설명만'}
          ]}
        ]
      },
      {
        id:'hotel', tag:'호텔 · 프런트', label:'업그레이드 요구',
        scene:'체크인 중, 유명 인플루언서라고 밝힌 손님이 “내 채널에 소개해 줄 테니 방을 올려 달라”고 요청합니다. 뒤에는 대기하는 손님이 있고, 남은 상위 객실은 한 개입니다.',
        ask:'홍보를 조건으로 무료 객실 업그레이드를 요구',
        steps:[
          {q:'첫마디는?', opts:[
            {t:'“소개해 주신다니 감사합니다. 가능한 범위를 확인해서 바로 말씀드릴게요.”', s:2, fb:'호의에는 감사를, 요청에는 확인을. 두 가지를 분리하면 협상이 가능해집니다.', led:''},
            {t:'“그런 요청은 안 됩니다.”', s:0, fb:'즉시 거절은 이유를 말할 기회를 없앱니다.', led:''},
            {t:'“잠시만요.”라고만 하고 자리를 비운다.', s:1, fb:'확인은 좋지만 무엇을 확인하는지 말해야 손님이 기다립니다.', led:''}
          ]},
          {q:'확인할 것은?', opts:[
            {t:'남은 객실, 오늘 예약 상황, 업그레이드 가능 기준(멤버십·요금·프로모션)을 확인한다.', s:2, fb:'감정이 아니라 재고와 기준을 확인해야 공정한 판단이 됩니다.', led:''},
            {t:'남은 객실만 확인한다.', s:1, fb:'재고만 보면 기준을 놓쳐 다른 손님과 형평성이 깨집니다.', led:''},
            {t:'인플루언서의 채널 규모를 확인한다.', s:0, fb:'홍보 효과를 기준으로 삼으면 매장 원칙이 사람에 따라 달라집니다.', led:''}
          ]},
          {q:'어떻게 판단할까요?', opts:[
            {t:'기준 안에서 가능한 대안(상위 객실 할인, 늦은 체크아웃, 조식 제공)을 제시한다.', s:2, fb:'원칙을 지키면서 호의를 표현하는 방법은 여러 가지입니다.', led:''},
            {t:'무료로 올려 준다.', s:0, fb:'한 사람의 홍보를 위해 기준을 깨면, 그 기준은 다시는 기준이 아니게 됩니다.', led:''},
            {t:'“규정상 안 됩니다.”로 끝낸다.', s:1, fb:'원칙은 지켰지만 호의를 표현할 기회를 버렸습니다.', led:''}
          ]},
          {q:'해결은?', opts:[
            {t:'가능한 대안을 두 가지로 정리해 손님이 고르게 한다.', s:2, fb:'선택지는 손님에게 존중을, 매장에는 통제를 줍니다.', led:'가능한 대안 2가지 제시(할인·늦은 체크아웃 등)'},
            {t:'다음 숙박에 쓸 수 있는 바우처를 준다.', s:1, fb:'재방문을 만드는 좋은 방법입니다. 다만 오늘의 요구는 해결되지 않습니다.', led:'다음 숙박 바우처'},
            {t:'요청을 그대로 들어준다.', s:0, fb:'원칙이 사람에 따라 달라지면 뒤에 서 있는 손님도 같은 요구를 하게 됩니다.', led:'무료 업그레이드 제공'}
          ]},
          {q:'안내는?', opts:[
            {t:'“오늘 가능한 선에서 이렇게 준비했습니다. 홍보는 부담 없이 해 주셔도 되고, 안 하셔도 괜찮습니다.”', s:2, fb:'조건과 호의를 분리하면 손님도 매장도 자유로워집니다.', led:'“오늘 가능한 선에서 준비했고, 홍보는 부담 갖지 않으셔도 됩니다”'},
            {t:'“다음에 소개해 주시면 또 도와드릴게요.”', s:0, fb:'홍보를 조건처럼 들리게 만들어 손님도 불편해집니다.', led:'“다음에 소개해 주시면 도와드릴게요”'},
            {t:'아무 설명 없이 대안만 제시한다.', s:1, fb:'대안의 이유를 모르면 손님은 “차별”로 느낄 수 있습니다.', led:'설명 없이 대안 제시'}
          ]},
          {q:'기록은?', opts:[
            {t:'요청 유형과 응대 기준을 기록하고, 프런트 공통 기준으로 공유한다.', s:2, fb:'개인의 판단을 매장의 기준으로 만드는 기록입니다.', led:'요청 유형·응대 기준 기록 + 프런트 공유'},
            {t:'슈퍼바이저에게 구두로 전한다.', s:1, fb:'알리기는 했지만 기준으로 남지 않습니다.', led:'구두 전달'},
            {t:'그냥 넘어간다.', s:0, fb:'다음 손님에게 같은 고민이 반복됩니다.', led:'기록 없음'}
          ]}
        ]
      }
    ];

    var state = {caseIdx:0, step:0, picks:[], answered:false};
    var sceneEl = $('caseScene'), rail = $('stepRail'), qbox = $('qbox');
    var stepKey = $('stepKey'), stepQ = $('stepQ'), optsEl = $('opts'), fbEl = $('fb'), nextBtn = $('nextStep');
    var ledger = $('ledger'), ledgerSub = $('ledgerSub'), ledgerBody = $('ledgerBody');

    caseChips.innerHTML = CASES.map(function(c, i){
      return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + c.label + '</button>';
    }).join('');

    var caseNow = function(){ return CASES[state.caseIdx]; };

    var renderRail = function(){
      rail.innerHTML = STEPS.map(function(s, i){
        var cls = i < state.step ? 'done' : (i === state.step ? 'now' : '');
        return '<span class="dot ' + cls + '"><i></i><b>' + (i + 1) + ' ' + s + '</b></span>';
      }).join('');
    };

    var startCase = function(i){
      state.caseIdx = i; state.step = 0; state.picks = []; state.answered = false;
      $$('button', caseChips).forEach(function(b, k){ b.setAttribute('aria-pressed', String(k === i)); });
      sceneEl.innerHTML = '<b>SCENE · ' + caseNow().tag + '</b>' + caseNow().scene;
      ledger.classList.remove('show');
      qbox.hidden = false;
      renderRail();
      renderStep();
    };

    var renderStep = function(){
      var c = caseNow(), st = c.steps[state.step];
      state.answered = false;
      stepKey.textContent = (state.step + 1) + ' / 6 · ' + STEPS[state.step];
      stepQ.textContent = st.q;
      fbEl.className = 'fb';
      fbEl.innerHTML = '';
      nextBtn.hidden = true;
      nextBtn.textContent = state.step === c.steps.length - 1 ? '접수 대장 만들기 →' : '다음 단계 →';
      optsEl.innerHTML = st.opts.map(function(o, k){
        return '<button type="button" class="opt" data-k="' + k + '"><span class="num">' + (k + 1) + '</span><span>' + o.t + '</span></button>';
      }).join('');
      $$('button', optsEl).forEach(function(btn){
        btn.addEventListener('click', function(){ choose(parseInt(btn.getAttribute('data-k'), 10)); });
      });
      renderRail();
    };

    var choose = function(k){
      if (state.answered) return;
      var st = caseNow().steps[state.step];
      var o = st.opts[k];
      state.answered = true;
      state.picks.push({step: STEPS[state.step], title: o.t, s: o.s, led: o.led, fb: o.fb});
      $$('button', optsEl).forEach(function(btn, i){
        btn.disabled = true;
        var v = st.opts[i];
        if (i === k) btn.setAttribute('data-state', v.s === 2 ? 'best' : (v.s === 1 ? 'soso' : 'bad'));
        else if (v.s === 2) btn.setAttribute('data-state', 'best');
        else if (v.s === 1) btn.setAttribute('data-state', 'soso');
        else btn.setAttribute('data-state', 'bad');
      });
      fbEl.className = 'fb show ' + (o.s === 2 ? 'best' : (o.s === 1 ? 'soso' : 'bad'));
      fbEl.innerHTML = '<b>' + (o.s === 2 ? '좋은 판단' : (o.s === 1 ? '괜찮지만 아쉬움' : '위험한 판단')) + '</b>' + o.fb;
      nextBtn.hidden = false;
    };

    var score = function(){
      return state.picks.reduce(function(a, p){ return a + p.s; }, 0);
    };

    nextBtn.addEventListener('click', function(){
      var c = caseNow();
      if (state.step < c.steps.length - 1) {
        state.step += 1;
        renderStep();
        qbox.scrollIntoView({block:'nearest', behavior:'smooth'});
        return;
      }
      showLedger();
    });

    var row = function(dt, dd){
      return '<div class="row"><dt>' + dt + '</dt><dd>' + dd + '</dd></div>';
    };

    var showLedger = function(){
      var c = caseNow();
      var total = score(), best = state.picks.filter(function(p){ return p.s === 2; }).length;
      var grade, cls;
      if (best >= 5) { grade = '매장관리자급 응대'; cls = 'g'; }
      else if (best >= 3) { grade = '현장실습생급 응대'; cls = 'y'; }
      else { grade = '다시 연습이 필요한 응대'; cls = 'r'; }
      var pick = function(name){
        var p = state.picks.filter(function(x){ return x.step === name; })[0];
        return p ? p.led || p.title : '—';
      };
      var now = new Date();
      var stamp = now.getFullYear() + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + String(now.getDate()).padStart(2,'0') + ' ' +
                  String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      ledgerSub.textContent = 'NO. ' + stamp + ' · ' + c.label;
      ledgerBody.innerHTML =
        row('사례', c.tag + ' · ' + c.label) +
        row('고객 요구', c.ask) +
        row('해결', pick('해결')) +
        row('안내', pick('안내')) +
        row('기록·개선', pick('기록')) +
        '<div class="row"><dt>응대 평가</dt><dd><span class="badge ' + cls + '">' + grade + '</span> <span class="hint">좋은 판단 ' + best + '/6 · 점수 ' + total + '/12</span></dd></div>';
      ledger.classList.add('show');
      qbox.hidden = true;
      ledger.scrollIntoView({block:'nearest', behavior:'smooth'});
    };

    $('againBtn').addEventListener('click', function(){
      state.caseIdx = (state.caseIdx + 1) % CASES.length;
      startCase(state.caseIdx);
      qbox.scrollIntoView({block:'nearest', behavior:'smooth'});
    });

    $$('button', caseChips).forEach(function(b){
      b.addEventListener('click', function(){ startCase(parseInt(b.getAttribute('data-i'), 10)); });
    });
    startCase(0);
  }

  /* ---------- 매장 숫자 진단 ---------- */
  if ($('inGuests')) {
    var PRESETS = {
      buffet:{g:300, s:22000, c:50, f:9000},
      cafe:{g:120, s:6500, c:35, f:1500},
      dessert:{g:80, s:12000, c:30, f:1200}
    };
    var inG = $('inGuests'), inS = $('inSpend'), inC = $('inCost'), inF = $('inFixed');
    var num = function(el, max){ var v = parseFloat(el.value); if (isNaN(v) || v < 0) v = 0; if (max && v > max) v = max; return v; };
    var calc = function(){
      var g = num(inG, 5000), s = num(inS, 200000), c = num(inC, 100), f = num(inF, 100000);
      var daily = g * s, monthly = daily * 30;
      var cost = monthly * c / 100;
      var fixed = f * 10000;
      var profit = monthly - cost - fixed;
      $('outDaily').textContent = won(daily);
      $('outMonthly').textContent = won(monthly);
      $('outCost').textContent = won(cost);
      $('outFixed').textContent = won(fixed);
      $('outProfit').textContent = won(profit);
      $('outProfit').className = profit < 0 ? 'neg' : 'pos';
      $('outLift').textContent = won(g * 1000 * 30 * (1 - c / 100)) + ' 더 남음';
      $('costBar').style.width = Math.max(0, Math.min(100, c)) + '%';
      $('costLabel').textContent = '원가율 ' + c + '% · 매출의 ' + Math.round(c) + '%가 재료로 나갑니다';
      var v = $('verdict');
      if (profit < 0) {
        v.innerHTML = '<b>지금 구조로는 한 달에 ' + won(Math.abs(profit)) + '이 모자랍니다.</b><br>손님을 늘리기 전에 원가율이나 고정비를 먼저 확인해 보세요. 객단가를 1,000원 올리면 ' + won(g * 1000 * 30 * (1 - c/100)) + '이 더 남습니다.';
      } else if (c >= 50) {
        v.innerHTML = '<b>남는 돈은 있지만 원가율이 ' + c + '%로 높습니다.</b><br>원재료·폐기·할인 중 어디서 새는지 확인해 보세요. 매출이 조금 줄어도 바로 적자로 바뀔 수 있는 구조입니다.';
      } else if (profit < fixed * 0.2) {
        v.innerHTML = '<b>고정비가 버거운 구조입니다.</b><br>한 달 남는 돈이 고정비의 20%도 되지 않습니다. 회전율이나 객단가를 함께 올려야 안정됩니다.';
      } else {
        v.innerHTML = '<b>구조가 버티고 있습니다.</b><br>원가율 ' + c + '%에서 남는 돈이 ' + won(profit) + '입니다. 여기서 손님을 더 늘릴지, 객단가를 올릴지 비교해 보세요.';
      }
    };
    [inG, inS, inC, inF].forEach(function(el){
      el.addEventListener('input', calc);
      el.addEventListener('change', calc);
    });
    $$('[data-preset]').forEach(function(b){
      b.addEventListener('click', function(){
        var p = PRESETS[b.getAttribute('data-preset')];
        inG.value = p.g; inS.value = p.s; inC.value = p.c; inF.value = p.f; calc();
      });
    });
    calc();
  }

  /* ---------- 입지 판단 ---------- */
  if ($('locOpts')) {
    var LOC = [
      {
        sit:'친구와 오래 앉아 이야기하는 10대·20대가 주 고객인 디저트 카페. 음료보다 디저트가 중심이고, 좌석과 분위기가 중요하다.',
        opts:[
          {t:'1층 횡단보도 앞 소형 매장', ok:false, fb:'시인성은 좋지만 좁은 좌석과 높은 임대료가 발목을 잡습니다. 오래 머무는 손님에게는 불리합니다.'},
          {t:'2층 넓은 매장', ok:true, fb:'목적 구매에 가깝고 체류 시간이 길어 넓은 좌석이 필요합니다. 같은 임대료로 면적을 확보하는 2층이 맞습니다.'},
          {t:'외곽 대형 창고형 매장', ok:false, fb:'차로 방문하는 벌크 구매 업종에 맞습니다. 디저트 카페에는 과합니다.'},
          {t:'골목 안쪽 소형 매장', ok:false, fb:'조용하지만 시인성이 낮아 “지나가다 발견”이 어렵습니다.'}
        ]
      },
      {
        sit:'등교하는 학생과 출근하는 직장인이 주 고객인 테이크아웃 커피 매장. 빠른 주문과 이동 동선이 중요하다.',
        opts:[
          {t:'학교 앞 또는 버스정류장 근처', ok:true, fb:'동선 위에 서 있어야 테이크아웃이 됩니다. 접근성과 속도가 핵심입니다.'},
          {t:'2층 넓은 매장', ok:false, fb:'앉아서 머무는 카페에는 좋지만, 계단을 오르는 시간이 테이크아웃 수요를 줄입니다.'},
          {t:'외곽 대형 매장', ok:false, fb:'차량 방문·체류형 업종에 맞습니다.'},
          {t:'골목 안쪽 매장', ok:false, fb:'조용하지만 지나가는 손님을 잡기 어렵습니다.'}
        ]
      },
      {
        sit:'필요한 생활용품을 사러 직접 찾아오는 할인 매장. 많은 상품을 진열해야 해 넓은 공간이 필요하다.',
        opts:[
          {t:'1층 소형 매장', ok:false, fb:'진열 공간이 부족해 상품 구색을 맞추기 어렵습니다.'},
          {t:'2층 또는 지하의 넓은 매장', ok:true, fb:'목적 구매 고객은 층을 가리지 않습니다. 낮은 임대료로 넓은 면적을 확보하는 것이 유리합니다.'},
          {t:'사거리 한가운데 소형 매장', ok:false, fb:'비싼 자리에 좁게 들어가면 이 업종의 강점이 사라집니다.'},
          {t:'테이크아웃 전용 매장', ok:false, fb:'업종 자체가 맞지 않습니다.'}
        ]
      },
      {
        sit:'이동 중 빠르게 식사를 해결하려는 손님이 주 고객인 패스트푸드 매장. 주문 속도와 접근성이 중요하다.',
        opts:[
          {t:'역세권 또는 사거리', ok:true, fb:'유동 인구와 동선이 만나는 자리입니다. 이동 중 빠른 식사의 조건을 갖춥니다.'},
          {t:'조용한 주택가 안쪽', ok:false, fb:'유동 인구가 적어 회전율을 만들기 어렵습니다.'},
          {t:'2층 구석 매장', ok:false, fb:'빠르게 들렀다 나가는 손님에게 계단은 비용입니다.'},
          {t:'외곽 창고형 매장', ok:false, fb:'벌크 구매 업종의 자리입니다.'}
        ]
      }
    ];
    var locIdx = 0, locAnswered = false;
    var locSit = $('locSit'), locOpts = $('locOpts'), locFb = $('locFb'), locNext = $('locNext'), locDots = $('locDots');
    var renderLoc = function(){
      var L = LOC[locIdx];
      locAnswered = false;
      locSit.innerHTML = '<b>상황 ' + (locIdx + 1) + '</b>' + L.sit;
      locFb.className = 'fb';
      locFb.innerHTML = '';
      locNext.hidden = true;
      locNext.textContent = locIdx === LOC.length - 1 ? '처음부터 다시 →' : '다음 상황 →';
      locOpts.innerHTML = L.opts.map(function(o, i){
        return '<button type="button" class="opt" data-k="' + i + '"><span class="num">' + (i + 1) + '</span><span>' + o.t + '</span></button>';
      }).join('');
      $$('button', locOpts).forEach(function(b){
        b.addEventListener('click', function(){
          if (locAnswered) return;
          locAnswered = true;
          var k = parseInt(b.getAttribute('data-k'), 10), o = L.opts[k];
          $$('button', locOpts).forEach(function(btn, i){
            btn.disabled = true;
            btn.setAttribute('data-state', i === k ? (o.ok ? 'best' : 'bad') : (L.opts[i].ok ? 'best' : 'soso'));
          });
          locFb.className = 'fb show ' + (o.ok ? 'best' : 'bad');
          locFb.innerHTML = '<b>' + (o.ok ? '맞는 판단' : '다시 생각해 보기') + '</b>' + o.fb;
          locNext.hidden = false;
        });
      });
      locDots.innerHTML = LOC.map(function(_, i){
        return '<i class="' + (i === locIdx ? 'on' : '') + '"></i>';
      }).join('');
    };
    locNext.addEventListener('click', function(){
      locIdx = (locIdx + 1) % LOC.length;
      renderLoc();
    });
    renderLoc();
  }

  /* ---------- 포장 순서 + 5분 타이머 ---------- */
  if ($('seq')) {
    var SEQ = [
      {id:'cut', t:'포장지를 책 크기에 맞게 자른다', n:'포장지 재단하기'},
      {id:'place', t:'책을 포장지 가운데에 놓는다', n:'책을 가운데에 놓기'},
      {id:'fold', t:'양쪽 날개를 접어 각을 세운다', n:'양쪽 날개 접어 각 세우기'},
      {id:'tape', t:'테이프로 고정한다', n:'테이프로 고정하기'},
      {id:'ribbon', t:'리본을 묶어 마무리한다', n:'리본 묶어 마무리하기'}
    ];
    var order = [2,0,4,1,3];
    var seqDone = 0;
    var seqEl = $('seq'), seqHint = $('seqHint');
    var renderSeq = function(){
      seqEl.innerHTML = order.map(function(idx){
        var s = SEQ[idx];
        return '<button type="button" data-id="' + s.id + '"><span class="n">' + (idx + 1) + '</span><span>' + s.t + '</span></button>';
      }).join('');
      $$('button', seqEl).forEach(function(b){
        b.addEventListener('click', function(){ tapSeq(b); });
      });
    };
    var timerT = $('timerT'), timerStart = $('timerStart'), timerReset = $('timerReset');
    var tapSeq = function(btn){
      var id = btn.getAttribute('data-id');
      var expected = SEQ[seqDone].id;
      if (id === expected) {
        btn.classList.add('done');
        btn.disabled = true;
        seqDone++;
        if (seqDone === SEQ.length) {
          seqHint.innerHTML = '<b style="color:var(--mint)">포장 완성!</b> 이제 5분 타이머로 실제 속도를 재 보세요. 각을 세우고 리본을 묶는 데 대부분의 시간이 쓰입니다.';
          if (timerStart) timerStart.focus();
        } else {
          seqHint.textContent = '좋아요. 다음은 ‘' + SEQ[seqDone].n + '’입니다.';
        }
      } else {
        btn.classList.remove('wrong');
        void btn.offsetWidth;
        btn.classList.add('wrong');
        seqHint.innerHTML = '<b style="color:var(--cherry)">순서가 달라요.</b> 지금 필요한 일은 ‘' + SEQ[seqDone].n + '’입니다.';
        setTimeout(function(){ btn.classList.remove('wrong'); }, 400);
      }
    };
    renderSeq();

    var tId = null, tStart = 0, tElapsed = 0;
    var fmt = function(ms){
      var s = Math.floor(ms / 1000);
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2,'0');
    };
    var paint = function(){
      var ms = tElapsed + (tId ? (Date.now() - tStart) : 0);
      timerT.textContent = fmt(ms);
      timerT.classList.toggle('over', ms > 300000);
    };
    timerStart.addEventListener('click', function(){
      if (tId) {
        clearInterval(tId); tElapsed += Date.now() - tStart; tId = null; timerStart.textContent = '이어서';
      } else {
        tStart = Date.now(); tId = setInterval(paint, 200); timerStart.textContent = '멈춤';
      }
      paint();
    });
    timerReset.addEventListener('click', function(){
      if (tId) { clearInterval(tId); tId = null; }
      tElapsed = 0; timerStart.textContent = '시작'; paint();
    });
    paint();
  }

  /* ---------- 배송 주문서 ---------- */
  if ($('dProduct')) {
    var dProduct = $('dProduct'), dName = $('dName'), dPhone = $('dPhone'), dAddr = $('dAddr');
    var dDate = $('dDate'), dTime = $('dTime'), dMethod = $('dMethod'), dMemo = $('dMemo');
    var orderEl = $('order'), orderBody = $('orderBody'), orderFlags = $('orderFlags'), orderSay = $('orderSay'), orderNo = $('orderNo'), dErr = $('dErr');
    var makeOrder = function(){
      var product = dProduct.options[dProduct.selectedIndex].text;
      var name = dName.value.trim(), phone = dPhone.value.trim(), addr = dAddr.value.trim(), memo = dMemo.value.trim();
      var date = dDate.value, time = dTime.value, method = dMethod.value;
      if (!name || !phone || !addr) {
        dErr.textContent = '받는 사람, 연락처, 주소는 꼭 적어 주세요. 배송 사고는 대부분 이 칸들이 비어서 생깁니다.';
        dErr.style.display = 'block';
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dErr.textContent = '받는 날을 2026-11-25 형식으로 적어 주세요. (숫자만 입력하면 자동으로 맞춰집니다)';
        dErr.style.display = 'block';
        return;
      }
      dErr.style.display = 'none';
      var flags = [];
      if (dProduct.value === 'bottle') { flags.push(['파손 주의','red'],['냉장 유지',''],['세워서 운반','']); }
      if (dProduct.value === 'cake') { flags.push(['냉장 유지','red'],['기울임 금지',''],['픽업 시간 확인','']); }
      if (dProduct.value === 'gift') { flags.push(['리본 변형 주의',''],['충격 주의','']); }
      if (memo.indexOf('경비실') > -1) flags.push(['경비실 수령','']);
      orderBody.innerHTML =
        '<div class="row"><dt>상품</dt><dd>' + esc(product) + '</dd></div>' +
        '<div class="row"><dt>받는 사람</dt><dd>' + esc(name) + ' · ' + esc(phone) + '</dd></div>' +
        '<div class="row"><dt>주소</dt><dd>' + esc(addr) + '</dd></div>' +
        '<div class="row"><dt>일시</dt><dd>' + esc(date) + ' ' + esc(time) + '</dd></div>' +
        '<div class="row"><dt>방법</dt><dd>' + esc(method) + '</dd></div>' +
        '<div class="row"><dt>요청</dt><dd>' + (memo ? esc(memo) : '없음') + '</dd></div>';
      orderFlags.innerHTML = flags.map(function(f){ return '<span class="flag ' + (f[1] || '') + '">' + f[0] + '</span>'; }).join('');
      orderSay.textContent = '“' + product + '을 ' + date + ' ' + time + '까지 ' + method + '로 보내 드립니다. ' +
        '받는 분은 ' + name + ' 님이고, 연락처는 ' + phone + '입니다. ' +
        (memo ? '요청 사항은 ‘' + memo + '’입니다. ' : '') +
        '파손·지연이 생기면 바로 연락드리겠습니다.”';
      orderNo.textContent = 'NO. ' + String(Math.floor(Math.random() * 9000) + 1000);
      orderEl.classList.add('show');
      orderEl.scrollIntoView({ block:'nearest', behavior:'smooth' });
    };
    dDate.addEventListener('input', function(){
      var d = dDate.value.replace(/[^0-9]/g, '').slice(0, 8), out = d;
      if (d.length > 4) out = d.slice(0, 4) + '-' + d.slice(4);
      if (d.length > 6) out = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6);
      dDate.value = out;
    });
    $('dMake').addEventListener('click', makeOrder);
    $('dClear').addEventListener('click', function(){
      [dName, dPhone, dAddr, dMemo].forEach(function(el){ el.value = ''; });
      dDate.value = '';
      orderEl.classList.remove('show');
    });
  }

  /* ---------- 보고서 체크리스트 + 탭 ---------- */
  $$('[data-report]').forEach(function(box){
    var key = box.getAttribute('data-report');
    var list = [];
    try { list = JSON.parse($('report-' + key).textContent); } catch (e) { return; }
    box.innerHTML = list.map(function(it, i){
      return '<label><input type="checkbox" data-key="' + key + '" data-i="' + i + '"><span><b>' + esc(it[0]) + '</b><span>' + esc(it[1]) + '</span></span></label>';
    }).join('');
    $$('input', box).forEach(function(cb){
      cb.addEventListener('change', function(){ updateProgress(key); });
    });
    updateProgress(key);
  });
  function updateProgress(key){
    var inputs = $$('input[data-key="' + key + '"]');
    if (!inputs.length) return;
    var n = inputs.filter(function(i){ return i.checked; }).length;
    var textEl = document.querySelector('[data-prog-text="' + key + '"]');
    var barEl = document.querySelector('[data-prog-bar="' + key + '"]');
    if (textEl) textEl.textContent = n + ' / ' + inputs.length + (n === inputs.length ? ' · 준비 완료' : '');
    if (barEl) barEl.style.width = (n / inputs.length * 100) + '%';
  }

  $$('[role="tab"][aria-controls]').forEach(function(tab){
    tab.addEventListener('click', function(){
      var group = $$('[role="tab"][aria-controls]').filter(function(t){
        return t.parentNode === tab.parentNode;
      });
      group.forEach(function(t){
        var sel = t === tab;
        t.setAttribute('aria-selected', String(sel));
        var panel = $(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
    });
  });

  /* ---------- 한 문장 정리 ---------- */
  if ($('sentenceIn')) {
    var sIn = $('sentenceIn'), sOut = $('sentenceOut');
    var base = sOut.getAttribute('data-base') || sOut.textContent;
    sIn.addEventListener('input', function(){
      var v = sIn.value.trim();
      sOut.textContent = v ? base.replace('______', v) : base;
    });
  }

  /* ---------- 간단 판단 퀴즈 ---------- */
  $$('[data-quiz]').forEach(function(box){
    var key = box.getAttribute('data-quiz');
    var data;
    try { data = JSON.parse($('quiz-' + key).textContent); } catch (e) { return; }
    var items = data.items || [];
    var idx = 0;
    var qEl = box.querySelector('.qz-q'), oEl = box.querySelector('.opts'), fEl = box.querySelector('.fb'), nEl = box.querySelector('.qz-next');
    var render = function(){
      var it = items[idx];
      qEl.innerHTML = '<b>' + (idx + 1) + '/' + items.length + '</b>' + esc(it.q);
      fEl.className = 'fb';
      fEl.innerHTML = '';
      if (nEl) { nEl.hidden = true; nEl.textContent = idx === items.length - 1 ? '처음부터 →' : '다음 문제 →'; }
      oEl.innerHTML = it.opts.map(function(o, k){
        return '<button type="button" class="opt" data-k="' + k + '"><span class="num">' + (k + 1) + '</span><span>' + esc(o.t) + '</span></button>';
      }).join('');
      $$('button', oEl).forEach(function(btn){
        btn.addEventListener('click', function(){
          var k = parseInt(btn.getAttribute('data-k'), 10), o = it.opts[k];
          $$('button', oEl).forEach(function(b, i){
            b.disabled = true;
            var v = it.opts[i];
            b.setAttribute('data-state', v.ok ? 'best' : (i === k ? 'bad' : 'soso'));
          });
          fEl.className = 'fb show ' + (o.ok ? 'best' : 'bad');
          fEl.innerHTML = '<b>' + (o.ok ? '맞았습니다' : '다시 생각해 보기') + '</b>' + esc(o.fb);
          if (nEl) nEl.hidden = false;
        });
      });
    };
    if (nEl) {
      nEl.addEventListener('click', function(){
        idx = (idx + 1) % items.length;
        render();
      });
    }
    if (items.length) render();
  });

  /* ---------- 랜덤 고객 카드 ---------- */
  $$('[data-draw]').forEach(function(box){
    var key = box.getAttribute('data-draw');
    var cards;
    try { cards = JSON.parse($('draw-' + key).textContent); } catch (e) { return; }
    var host = box.querySelector('.draw-card');
    var btn = box.querySelector('[data-draw-next]');
    var last = -1;
    var show = function(){
      var i = Math.floor(Math.random() * cards.length);
      if (cards.length > 1 && i === last) i = (i + 1) % cards.length;
      last = i;
      var c = cards[i];
      host.innerHTML =
        '<span class="dc-kind">' + esc(c.kind) + '</span>' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<p class="dc-trait">' + esc(c.trait) + '</p>' +
        '<p class="dc-say">' + esc(c.say) + '</p>' +
        '<p class="dc-watch"><b>관찰 포인트 · </b>' + esc(c.watch) + '</p>';
      host.hidden = false;
    };
    if (btn) btn.addEventListener('click', show);
    if (host && host.getAttribute('data-initial') === 'hide') host.hidden = true;
  });

  /* ---------- 케이스 스터디 탭 ---------- */
  var chipBar = $('caseChipsNav');
  if (chipBar) {
    var panels = $$('.casepanel');
    var buttons = $$('button', chipBar);
    var select = function(id, scroll){
      buttons.forEach(function(b){
        b.setAttribute('aria-selected', String(b.getAttribute('data-case') === id));
      });
      panels.forEach(function(p){
        p.hidden = p.id !== id;
      });
      if (scroll) {
        var el = $(id);
        if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    };
    buttons.forEach(function(b){
      b.addEventListener('click', function(){ select(b.getAttribute('data-case'), true); });
    });
    var initial = (location.hash || '').replace('#', '');
    if (initial && $(initial) && $(initial).classList.contains('casepanel')) select(initial, false);
    else select(panels[0].id, false);
  }
})();
