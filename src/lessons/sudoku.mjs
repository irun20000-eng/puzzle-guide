// 스도쿠 길: 5단원 18차시 + 단원 미션 5개 (docs/기획서.md 5.1)
// 판은 글자('.' 빈칸) 또는 묶음 번호 { pack, i }. 정답은 적지 않는다(엔진이 풀어 확인).
// maxTech: 이 차시 문제가 넘으면 안 되는 기법(빌드 시험이 확인). need: 이 차시에서 꼭 써 보는 기법.

export const SD_UNITS = [
  { unit: 1, title: '4×4 첫걸음', size: 4 },
  { unit: 2, title: '6×6으로 넓히기', size: 6 },
  { unit: 3, title: '9×9 판', size: 9 },
  { unit: 4, title: '몰림과 짝', size: 9 },
  { unit: 5, title: '더 높이', size: 9 },
];

export const SD_LESSONS = [
  {
    id: 'S01', unit: 1, title: '줄, 칸, 상자', size: 4, maxTech: 'full-house',
    cards: [
      { title: '스도쿠는 이렇게', text: ['4×4 판에는 1부터 4까지 숫자가 들어가요.', '가로줄, 세로줄, 굵은 선으로 나눈 상자마다 1, 2, 3, 4가 한 번씩 들어가요.', '같은 숫자가 한 줄이나 한 상자에 두 번 나오면 안 돼요.'], board: '1234341221434321', show: 'box0' },
    ],
    items: [
      { t: 'tap', board: '1..1.2....3.....', check: 'conflict', prompt: '같은 숫자가 겹친 칸을 하나 눌러 보세요.', why: '맨 위 가로줄에 1이 두 번 있어요.' },
      { t: 'tap', board: '2.........3.2...', check: 'conflict', prompt: '같은 숫자가 겹친 칸을 하나 눌러 보세요.', why: '첫째 세로줄에 2가 두 번 있어요.' },
      { t: 'tap', board: '4....4.........1', check: 'conflict', prompt: '같은 숫자가 겹친 칸을 하나 눌러 보세요.', why: '왼쪽 위 상자에 4가 두 번 있어요.' },
      { t: 'quiz', q: '4×4 판의 상자 하나에는 칸이 몇 개 있을까요?', options: ['2개', '4개', '8개'], answer: 1, why: '상자는 가로 2칸, 세로 2칸이라 4칸이에요.' },
    ],
    summary: '가로줄, 세로줄, 상자마다 숫자는 한 번씩만.',
  },
  {
    id: 'S02', unit: 1, title: '마지막 빈칸', size: 4, maxTech: 'full-house', need: ['full-house'],
    cards: [
      { title: '빈칸이 하나 남았을 때', text: ['줄이나 상자에 빈칸이 하나만 남으면, 빠진 숫자를 넣으면 돼요.', '1, 2, 3, 4 중에서 없는 숫자를 찾아요.'], demo: { pack: 's4-fh', i: 0, tech: 'full-house' } },
    ],
    items: [
      { t: 'step', pack: 's4-fh', i: 1, tech: 'full-house' },
      { t: 'step', pack: 's4-fh', i: 2, tech: 'full-house' },
      { t: 'step', pack: 's4-fh', i: 3, tech: 'full-house', match: { unitKind: 'box' } },
      { t: 'solve', pack: 's4-fh', i: 4 },
    ],
    summary: '빈칸이 하나 남은 곳부터 채워요.',
  },
  {
    id: 'S03', unit: 1, title: '상자 안의 숨은 한 자리', size: 4, maxTech: 'hidden-single-box', need: ['hidden-single-box'],
    cards: [
      { title: '숫자 하나를 골라 상자 보기', text: ['상자 하나와 숫자 하나를 골라요.', '그 숫자가 이미 있는 가로줄과 세로줄의 칸은 지워요.', '남은 칸이 하나뿐이면 거기가 그 숫자의 자리예요.'], demo: { pack: 's4-hb', i: 0, tech: 'hidden-single-box' } },
    ],
    items: [
      { t: 'guided', pack: 's4-hb', i: 1, steps: 4 },
      { t: 'step', pack: 's4-hb', i: 2, tech: 'hidden-single-box' },
      { t: 'step', pack: 's4-hb', i: 3, tech: 'hidden-single-box' },
      { t: 'step', pack: 's4-hb', i: 4, tech: 'hidden-single-box' },
      { t: 'solve', pack: 's4-hb', i: 5 },
    ],
    summary: '상자 안에서 숫자가 갈 곳이 하나뿐인지 봐요.',
  },
  {
    id: 'S04', unit: 1, title: '줄 안의 숨은 한 자리', size: 4, maxTech: 'hidden-single-line', need: ['hidden-single-line'],
    cards: [
      { title: '줄에서도 똑같이', text: ['가로줄이나 세로줄 하나를 골라요.', '어떤 숫자가 들어갈 수 있는 칸이 그 줄에 하나뿐이면 거기에 놓아요.'], demo: { pack: 's4-hl', i: 0, tech: 'hidden-single-line' } },
    ],
    items: [
      { t: 'step', pack: 's4-hl', i: 1, tech: 'hidden-single-line' },
      { t: 'step', pack: 's4-hl', i: 2, tech: 'hidden-single-line' },
      { t: 'step', pack: 's4-hl', i: 3, tech: 'hidden-single-line' },
      { t: 'solve', pack: 's4-hl', i: 4 },
    ],
    summary: '상자에서 안 보이면 줄에서 찾아요.',
  },
  {
    id: 'S05', unit: 2, title: '2×3 상자', size: 6, maxTech: 'hidden-single-line',
    cards: [
      { title: '6×6 판', text: ['6×6 판에는 1부터 6까지 들어가요.', '상자는 가로 3칸, 세로 2칸이에요.', '규칙은 4×4와 똑같아요.'], board: '123456456123231564564231312645645312', show: 'box0' },
    ],
    items: [
      { t: 'tap', board: '....................................', check: 'unit:box:1', prompt: '2번 상자(위 오른쪽)의 칸을 하나 눌러 보세요.', why: '상자는 위에서부터, 왼쪽에서 오른쪽으로 번호를 매겨요.' },
      { t: 'tap', board: '....................................', check: 'unit:box:4', prompt: '5번 상자의 칸을 하나 눌러 보세요.', why: '5번 상자는 맨 아래 줄의 왼쪽 상자예요.' },
      { t: 'tap', board: '5.......5...........................', check: 'conflict', prompt: '같은 숫자가 겹친 칸을 하나 눌러 보세요.', why: '1번 상자에 5가 두 번 있어요.' },
      { t: 'step', pack: 's6-hs', i: 0, tech: 'hidden-single-box' },
    ],
    summary: '6×6 상자는 가로 3칸, 세로 2칸.',
  },
  {
    id: 'S06', unit: 2, title: '한 숫자 따라 훑기', size: 6, maxTech: 'hidden-single-line', need: ['hidden-single-box', 'hidden-single-line'],
    cards: [
      { title: '숫자 하나로 판 전체 훑기', text: ['숫자 하나를 정하고 판 전체를 훑어요.', '그 숫자가 있는 줄과 상자를 지우면 갈 곳이 보여요.', '1부터 6까지 차례로 해 봐요.'] },
    ],
    items: [
      { t: 'tap', board: { pack: 's6-hs', i: 1 }, check: 'cand:auto:box:0', prompt: '1번 상자에서 {d} 들어갈 수 있는 칸을 모두 고르세요.', why: '같은 가로줄이나 세로줄에 그 숫자가 이미 있는 칸은 안 돼요.' },
      { t: 'step', pack: 's6-hs', i: 2, tech: 'hidden-single-box' },
      { t: 'step', pack: 's6-hs', i: 3, tech: 'hidden-single-line' },
      { t: 'solve', pack: 's6-hs', i: 4 },
    ],
    summary: '숫자 하나씩 정해서 판 전체를 훑어요.',
  },
  {
    id: 'S07', unit: 2, title: '하나뿐인 숫자', size: 6, maxTech: 'naked-single', need: ['naked-single'],
    cards: [
      { title: '칸 하나 보기', text: ['이번에는 칸 하나를 골라요.', '그 칸의 가로줄, 세로줄, 상자에 이미 있는 숫자를 지워요.', '남은 숫자가 하나뿐이면 그 숫자를 놓아요.'], demo: { pack: 's6-ns', i: 0, tech: 'naked-single' } },
    ],
    items: [
      { t: 'count', pack: 's6-ns', i: 1, cell: null },
      { t: 'step', pack: 's6-ns', i: 1, tech: 'naked-single' },
      { t: 'step', pack: 's6-ns', i: 2, tech: 'naked-single' },
      { t: 'solve', pack: 's6-ns', i: 3 },
    ],
    summary: '칸 하나에 들어갈 숫자가 하나뿐인지 세어 봐요.',
  },
  {
    id: 'S08', unit: 2, title: '메모 쓰기와 지우기', size: 6, maxTech: 'naked-single', need: ['naked-single'],
    cards: [
      { title: '메모(후보 숫자)', text: ['칸에 들어갈 수 있는 숫자를 작게 적어 두는 것을 메모라고 해요.', '메모 단추를 켜고 숫자를 누르면 작게 적혀요.', '숫자를 놓으면 같은 줄과 상자의 메모에서 그 숫자가 저절로 지워져요.'] },
    ],
    items: [
      { t: 'memo', pack: 's6-ns', i: 4, cell: null },
      { t: 'step', pack: 's6-ns', i: 5, tech: 'naked-single', notes: true },
      { t: 'solve', pack: 's6-ns', i: 6, prompt: '메모를 써 가며 끝까지 풀어 보세요.' },
    ],
    summary: '헷갈리면 메모를 적고, 하나 남은 칸부터.',
  },
  {
    id: 'S09', unit: 3, title: '9×9 판 읽기', size: 9, maxTech: 'hidden-single-line',
    cards: [
      { title: '9×9 판', text: ['9×9 판에는 1부터 9까지 들어가고, 상자는 3×3이에요.', '상자 번호는 왼쪽 위가 1번, 가운데가 5번, 오른쪽 아래가 9번이에요.', '칸 이름은 "3줄 7칸"처럼 위에서 몇째 줄, 왼쪽에서 몇째 칸으로 불러요.'], board: '534678912672195348198342567859761423426853791713924856961537284287419635345286179', show: 'box4' },
    ],
    items: [
      { t: 'tap', board: '.'.repeat(81), check: 'unit:box:4', prompt: '5번 상자의 칸을 하나 눌러 보세요.', why: '5번 상자는 한가운데 상자예요.' },
      { t: 'tap', board: '.'.repeat(81), check: 'unit:box:2', prompt: '3번 상자의 칸을 하나 눌러 보세요.', why: '3번 상자는 오른쪽 위 상자예요.' },
      { t: 'tap', board: '.'.repeat(81), check: 'cell:2:6', prompt: '3줄 7칸을 눌러 보세요.', why: '위에서 셋째 줄, 왼쪽에서 일곱째 칸이에요.' },
      { t: 'tap', board: '...........2..................7......4............7...................5..........', check: 'conflict', prompt: '같은 숫자가 겹친 칸을 하나 눌러 보세요.', why: '5번 상자에 7이 두 번 있어요.' },
    ],
    summary: '상자 번호와 칸 이름으로 판을 읽어요.',
  },
  {
    id: 'S10', unit: 3, title: '숨은 한 자리 사냥', size: 9, maxTech: 'hidden-single-line', need: ['hidden-single-box', 'hidden-single-line'],
    cards: [
      { title: '1부터 9까지 차례로', text: ['숫자 1부터 9까지 하나씩 골라 판 전체를 훑어요.', '상자마다, 줄마다 그 숫자가 갈 곳이 하나뿐인지 봐요.', '쉬운 9×9는 이것만으로 끝까지 풀려요.'], demo: { pack: 's9-hs', i: 0, tech: 'hidden-single-box' } },
    ],
    items: [
      { t: 'step', pack: 's9-hs', i: 1, tech: 'hidden-single-box' },
      { t: 'step', pack: 's9-hs', i: 2, tech: 'hidden-single-box', nth: 3 },
      { t: 'step', pack: 's9-hs', i: 3, tech: 'hidden-single-line' },
      { t: 'solve', pack: 's9-hs', i: 4 },
    ],
    summary: '숫자 하나씩, 상자와 줄을 차례로.',
  },
  {
    id: 'S11', unit: 3, title: '메모로 하나뿐인 숫자 찾기', size: 9, maxTech: 'naked-single', need: ['naked-single'],
    cards: [
      { title: '숨은 한 자리가 안 보일 때', text: ['빈칸이 많으면 메모를 적어 봐요.', '메모가 하나만 남은 칸이 바로 하나뿐인 숫자예요.'], demo: { pack: 's9-ns', i: 0, tech: 'naked-single', notes: true } },
    ],
    items: [
      { t: 'count', pack: 's9-ns', i: 1, cell: null },
      { t: 'step', pack: 's9-ns', i: 1, tech: 'naked-single', notes: true },
      { t: 'step', pack: 's9-ns', i: 2, tech: 'naked-single', notes: true },
      { t: 'solve', pack: 's9-ns', i: 3 },
    ],
    summary: '메모가 하나 남은 칸을 찾아요.',
  },
  {
    id: 'S12', unit: 4, title: '가리키기', size: 9, maxTech: 'pointing', need: ['pointing'],
    cards: [
      { title: '상자 안에서 한 줄에 몰린 숫자', text: ['어떤 상자에서 숫자 하나가 들어갈 칸이 모두 한 줄에 있을 때가 있어요.', '그러면 그 숫자는 이 상자 안의 그 줄에 꼭 들어가요.', '그래서 같은 줄의 상자 밖 칸에서는 그 숫자를 메모에서 지워요.'], demo: { pack: 's9-pt', i: 0, tech: 'pointing' } },
    ],
    items: [
      { t: 'step', pack: 's9-pt', i: 1, tech: 'pointing' },
      { t: 'step', pack: 's9-pt', i: 2, tech: 'pointing' },
      { t: 'step', pack: 's9-pt', i: 3, tech: 'pointing' },
      { t: 'solve', pack: 's9-pt', i: 4 },
    ],
    summary: '상자 안에서 한 줄에 몰리면, 줄의 나머지에서 지워요.',
  },
  {
    id: 'S13', unit: 4, title: '차지하기', size: 9, maxTech: 'claiming', need: ['claiming'],
    cards: [
      { title: '줄 안에서 한 상자에 몰린 숫자', text: ['가리키기를 거꾸로 봐요.', '어떤 줄에서 숫자 하나가 들어갈 칸이 모두 한 상자 안에 있으면, 그 상자의 자리는 이 줄이 차지해요.', '그래서 그 상자의 다른 칸에서는 그 숫자를 지워요.'], demo: { pack: 's9-cl', i: 0, tech: 'claiming' } },
    ],
    items: [
      { t: 'step', pack: 's9-cl', i: 1, tech: 'claiming' },
      { t: 'step', pack: 's9-cl', i: 2, tech: 'claiming' },
      { t: 'step', pack: 's9-cl', i: 3, tech: 'claiming' },
      { t: 'solve', pack: 's9-cl', i: 4 },
    ],
    summary: '줄 안에서 한 상자에 몰리면, 상자의 나머지에서 지워요.',
  },
  {
    id: 'S14', unit: 4, title: '드러난 짝', size: 9, maxTech: 'naked-pair', need: ['naked-pair'],
    cards: [
      { title: '같은 두 후보를 가진 두 칸', text: ['한 줄이나 상자에서 두 칸의 메모가 똑같이 두 숫자뿐일 때가 있어요.', '두 숫자는 이 두 칸이 나눠 가져요.', '그래서 같은 줄이나 상자의 다른 칸에서는 두 숫자를 지워요.'], demo: { pack: 's9-np', i: 0, tech: 'naked-pair' } },
    ],
    items: [
      { t: 'step', pack: 's9-np', i: 1, tech: 'naked-pair' },
      { t: 'step', pack: 's9-np', i: 2, tech: 'naked-pair' },
      { t: 'step', pack: 's9-np', i: 3, tech: 'naked-pair' },
      { t: 'solve', pack: 's9-np', i: 4 },
    ],
    summary: '두 칸이 같은 두 숫자를 가지면, 나머지에서 지워요.',
  },
  {
    id: 'S15', unit: 4, title: '숨은 짝', size: 9, maxTech: 'hidden-pair', need: ['hidden-pair'],
    cards: [
      { title: '두 칸에만 들어가는 두 숫자', text: ['한 줄이나 상자에서 두 숫자가 들어갈 수 있는 칸이 똑같은 두 칸뿐일 때가 있어요.', '그 두 칸은 이 두 숫자의 자리예요.', '그래서 두 칸의 다른 메모는 지워요.'], demo: { pack: 's9-hp', i: 0, tech: 'hidden-pair' } },
    ],
    items: [
      { t: 'step', pack: 's9-hp', i: 1, tech: 'hidden-pair' },
      { t: 'step', pack: 's9-hp', i: 2, tech: 'hidden-pair' },
      { t: 'step', pack: 's9-hp', i: 3, tech: 'hidden-pair' },
      { t: 'solve', pack: 's9-hp', i: 4 },
    ],
    summary: '두 숫자가 두 칸에만 갈 수 있으면, 그 칸의 다른 메모는 지워요.',
  },
  {
    id: 'S16', unit: 5, title: '셋 묶음', size: 9, maxTech: 'hidden-triple', need: ['naked-triple'],
    cards: [
      { title: '짝을 셋으로 넓히기', text: ['세 칸의 메모를 합쳐 세 숫자뿐이면, 세 숫자는 이 세 칸이 나눠 가져요.', '칸마다 세 숫자를 다 가질 필요는 없어요.', '같은 줄이나 상자의 다른 칸에서는 세 숫자를 지워요.'], demo: { pack: 's9-tr', i: 0, tech: 'naked-triple' } },
    ],
    items: [
      { t: 'step', pack: 's9-tr', i: 1, tech: 'naked-triple' },
      { t: 'step', pack: 's9-tr', i: 2, tech: 'naked-triple' },
      { t: 'step', pack: 's9-tr', i: 3, tech: 'naked-triple' },
      { t: 'solve', pack: 's9-tr', i: 4 },
    ],
    summary: '세 칸에 세 숫자뿐이면, 나머지에서 지워요.',
  },
  {
    id: 'S17', unit: 5, title: 'X-윙', size: 9, maxTech: 'x-wing', need: ['x-wing'],
    cards: [
      { title: '네모 꼭짓점 네 칸', text: ['두 가로줄에서 어떤 숫자가 들어갈 칸이 똑같이 두 세로줄에만 있을 때가 있어요.', '그러면 네모 꼭짓점 중 마주 보는 두 칸에 그 숫자가 들어가요.', '그래서 두 세로줄의 다른 칸에서는 그 숫자를 지워요.'], demo: { pack: 's9-xw', i: 0, tech: 'x-wing' } },
    ],
    items: [
      { t: 'step', pack: 's9-xw', i: 1, tech: 'x-wing' },
      { t: 'step', pack: 's9-xw', i: 2, tech: 'x-wing' },
      { t: 'step', pack: 's9-xw', i: 3, tech: 'x-wing' },
      { t: 'solve', pack: 's9-xw', i: 4 },
    ],
    summary: '두 줄, 두 칸이 네모를 이루면 X-윙이에요.',
  },
  {
    id: 'S18', unit: 5, title: '막혔을 때 다시 보는 순서', size: 9, maxTech: 'x-wing',
    cards: [
      { title: '순서표', text: ['막히면 쉬운 기법부터 다시 봐요.', '마지막 빈칸, 숨은 한 자리, 하나뿐인 숫자, 가리키기와 차지하기, 짝, 셋 묶음, X-윙 순서예요.', '힌트 단추도 이 순서로 다음 한 수를 찾아요.'] },
    ],
    items: [
      { t: 'guided', pack: 's9-mix', i: 0, steps: 8 },
      { t: 'solve', pack: 's9-mix', i: 1 },
      { t: 'solve', pack: 's9-mix', i: 2 },
    ],
    summary: '막히면 순서표를 처음부터 다시.',
  },
];

export const SD_MISSIONS = [
  { id: 'MS1', unit: 1, title: '4×4 다섯 문제', maxTech: 'hidden-single-line', items: [5, 6, 7, 8, 9].map((i) => ({ t: 'solve', pack: 's4-hl', i })) },
  { id: 'MS2', unit: 2, title: '6×6 다섯 문제', maxTech: 'naked-single', items: [{ t: 'solve', pack: 's6-hs', i: 5 }, { t: 'solve', pack: 's6-hs', i: 6 }, ...[7, 8, 9].map((i) => ({ t: 'solve', pack: 's6-ns', i }))] },
  { id: 'MS3', unit: 3, title: '쉬운 9×9 세 문제', maxTech: 'naked-single', items: [4, 5, 6].map((i) => ({ t: 'solve', pack: 's9-ns', i })) },
  { id: 'MS4', unit: 4, title: '보통 9×9 세 문제', maxTech: 'hidden-pair', items: [{ t: 'solve', pack: 's9-np', i: 5 }, { t: 'solve', pack: 's9-hp', i: 5 }, { t: 'solve', pack: 's9-cl', i: 5 }] },
  { id: 'MS5', unit: 5, title: '어려운 9×9 세 문제', maxTech: 'x-wing', items: [{ t: 'solve', pack: 's9-xw', i: 5 }, { t: 'solve', pack: 's9-mix', i: 3 }, { t: 'solve', pack: 's9-tr', i: 5 }] },
];
