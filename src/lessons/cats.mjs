// 고양이 자리 길: 5단원 14차시 + 단원 미션 5개 (docs/기획서.md 5.2)
// 판 글자: 대문자 A~J 구역, 소문자는 그 구역 칸에 놓인 고양이(짚기 문제에서만).

export const CT_UNITS = [
  { unit: 1, title: '고양이와 첫 만남', size: 4 },
  { unit: 2, title: '줄에 갇힌 구역', size: 6 },
  { unit: 3, title: '닿으면 안 돼', size: 7 },
  { unit: 4, title: '묶어서 보기', size: 8 },
  { unit: 5, title: '가정해 보기', size: 9 },
];

export const CT_LESSONS = [
  {
    id: 'C01', unit: 1, title: '규칙 네 가지', size: 4, maxTech: 'last-spot',
    cards: [
      { title: '고양이 자리', text: ['판은 색깔 구역으로 나뉘어 있어요.', '가로줄마다, 세로줄마다, 구역마다 고양이가 꼭 한 마리씩 앉아요.'], board: ['AbBB', 'AABd', 'cAAD', 'CCaD'] },
      { title: '닿으면 안 돼요', text: ['고양이끼리는 서로 닿으면 안 돼요.', '옆, 위아래, 대각선 여덟 방향 모두 닿은 거예요.'], board: ['AABBB', 'AAcBB', 'DDCCE', 'DDCEE', 'DDCEE'], show: 'blocked' },
    ],
    items: [
      { t: 'tap', board: ['aAbB', 'AABB', 'CCDD', 'CCDD'], check: 'conflict', prompt: '규칙을 어긴 고양이를 하나 눌러 보세요.', why: '두 고양이가 같은 가로줄에 있어요.' },
      { t: 'tap', board: ['AABB', 'AaBB', 'CCdD', 'CCDD'], check: 'conflict', prompt: '규칙을 어긴 고양이를 하나 눌러 보세요.', why: '두 고양이가 대각선으로 닿아 있어요.' },
      { t: 'tap', board: ['aAAB', 'CCaB', 'CDDB', 'CDDB'], check: 'conflict', prompt: '규칙을 어긴 고양이를 하나 눌러 보세요.', why: '두 고양이가 같은 구역에 있어요.' },
      { t: 'quiz', q: '대각선으로 닿은 고양이 두 마리는 괜찮을까요?', options: ['괜찮아요', '안 돼요'], answer: 1, why: '대각선도 닿은 거예요. 여덟 방향 모두 안 돼요.' },
    ],
    summary: '줄마다, 구역마다 한 마리. 서로 닿지 않게.',
  },
  {
    id: 'C02', unit: 1, title: '지우기 표시', size: 4, maxTech: 'last-spot',
    cards: [
      { title: '×로 비워 둘 칸 표시하기', text: ['고양이를 하나 놓으면 둘 수 없는 칸이 많이 생겨요.', '같은 가로줄, 같은 세로줄, 같은 구역, 그리고 바로 둘레 여덟 칸이에요.', '그 칸에 ×를 해 두면 남은 자리가 잘 보여요.'], board: ['aABB', 'AABB', 'CCDD', 'CCDD'], show: 'blocked' },
    ],
    items: [
      { t: 'tap', board: ['aABB', 'AABB', 'CCDD', 'CCDD'], check: 'blocked', prompt: '이 고양이 때문에 비워 둘 칸에 모두 ×를 하세요.', why: '같은 줄, 같은 구역, 둘레 칸이에요.' },
      { t: 'tap', board: ['AAAB', 'CCaB', 'CDDB', 'CDDB'], check: 'blocked', prompt: '이 고양이 때문에 비워 둘 칸에 모두 ×를 하세요.', why: '같은 줄, 같은 구역, 둘레 칸이에요.' },
      { t: 'tap', board: ['AABBB', 'AACBB', 'DDcCE', 'DDCEE', 'DDCEE'], check: 'blocked', prompt: '이 고양이 때문에 비워 둘 칸에 모두 ×를 하세요.', why: '같은 줄, 같은 구역, 둘레 칸이에요.' },
    ],
    summary: '고양이를 놓으면 줄, 구역, 둘레에 ×.',
  },
  {
    id: 'C03', unit: 1, title: '마지막 자리', size: 5, maxTech: 'last-spot', need: ['last-spot'],
    cards: [
      { title: '자리가 하나 남았을 때', text: ['×를 하고 나서 어떤 줄이나 구역에 빈 자리가 하나만 남으면, 거기가 고양이 자리예요.', '한 칸짜리 구역은 처음부터 자리가 하나뿐이에요.'], demo: { pack: 'c4-ls', i: 0, tech: 'last-spot' } },
    ],
    items: [
      { t: 'step', pack: 'c4-ls', i: 1, tech: 'last-spot' },
      { t: 'step', pack: 'c4-ls', i: 2, tech: 'last-spot', nth: 1 },
      { t: 'solve', pack: 'c4-ls', i: 3 },
      { t: 'solve', pack: 'c5-ls', i: 0 },
    ],
    summary: '자리가 하나 남은 줄이나 구역을 찾아요.',
  },
  {
    id: 'C04', unit: 2, title: '한 줄에 갇힌 구역', size: 5, maxTech: 'one-line', need: ['one-line'],
    cards: [
      { title: '구역이 한 줄 안에 있을 때', text: ['어떤 구역의 남은 자리가 모두 한 가로줄(또는 세로줄)에 있으면, 그 줄의 고양이는 이 구역 몫이에요.', '그래서 그 줄의 다른 구역 칸에는 ×를 해요.'], demo: { pack: 'c5-ol', i: 0, tech: 'one-line', match: { variant: 'reg-in-line' } } },
    ],
    items: [
      { t: 'step', pack: 'c5-ol', i: 1, tech: 'one-line', match: { variant: 'reg-in-line' } },
      { t: 'step', pack: 'c5-ol', i: 2, tech: 'one-line', match: { variant: 'reg-in-line' } },
      { t: 'step', pack: 'c5-ol', i: 3, tech: 'one-line', match: { variant: 'reg-in-line' } },
      { t: 'solve', pack: 'c5-ol', i: 4 },
    ],
    summary: '구역이 한 줄에 갇히면, 그 줄의 나머지는 ×.',
  },
  {
    id: 'C05', unit: 2, title: '한 구역에만 남은 줄', size: 6, maxTech: 'one-line', need: ['one-line'],
    cards: [
      { title: '거꾸로 보기', text: ['이번에는 줄을 봐요.', '어떤 줄의 남은 자리가 모두 한 구역 안에 있으면, 그 구역의 고양이는 이 줄에 앉아요.', '그래서 그 구역의 다른 칸에는 ×를 해요.'], demo: { pack: 'c6-ol', i: 0, tech: 'one-line', match: { variant: 'line-in-reg' } } },
    ],
    items: [
      { t: 'step', pack: 'c6-ol', i: 1, tech: 'one-line', match: { variant: 'line-in-reg' } },
      { t: 'step', pack: 'c6-ol', i: 2, tech: 'one-line', match: { variant: 'line-in-reg' } },
      { t: 'step', pack: 'c6-ol', i: 9, tech: 'one-line', match: { variant: 'line-in-reg' } },
      { t: 'solve', pack: 'c6-ol', i: 3 },
    ],
    summary: '줄이 한 구역에만 남으면, 구역의 나머지는 ×.',
  },
  {
    id: 'C06', unit: 2, title: '작은 구역부터 보기', size: 6, maxTech: 'one-line',
    cards: [
      { title: '어디부터 볼까', text: ['칸이 적은 구역은 자리가 적어서 먼저 풀려요.', '가장 작은 구역부터 보고, 그다음 한 줄에 갇힌 구역을 찾아요.'] },
    ],
    items: [
      { t: 'tap', board: { pack: 'c6-ol', i: 4 }, check: 'smallest', prompt: '가장 작은 구역의 칸을 하나 눌러 보세요.', why: '칸 수를 세어 보면 이 구역이 가장 작아요.' },
      { t: 'solve', pack: 'c6-ol', i: 4 },
      { t: 'solve', pack: 'c6-ol', i: 5 },
    ],
    summary: '작은 구역부터, 그다음 갇힌 구역.',
  },
  {
    id: 'C07', unit: 3, title: '2×2 네모에는 하나만', size: 6, maxTech: 'blocks-all', need: ['blocks-all'],
    cards: [
      { title: '네 칸짜리 네모', text: ['가로 2칸, 세로 2칸 네모 안의 칸은 서로 모두 닿아요.', '그래서 이 네모 안에는 고양이가 한 마리까지만 앉을 수 있어요.', '어떤 구역의 자리가 한 네모 안에 다 있으면, 그 둘레 칸은 비워 둬요.'] },
    ],
    items: [
      { t: 'quiz', q: '2×2 네모 안에는 고양이가 몇 마리까지 앉을 수 있을까요?', options: ['1마리', '2마리', '4마리'], answer: 0, why: '네모 안 네 칸은 서로 옆이나 대각선으로 닿아요.' },
      { t: 'step', pack: 'c6-ba', i: 0, tech: 'blocks-all' },
      { t: 'step', pack: 'c6-ba', i: 1, tech: 'blocks-all' },
      { t: 'solve', pack: 'c6-ba', i: 2 },
    ],
    summary: '2×2 네모에는 한 마리.',
  },
  {
    id: 'C08', unit: 3, title: '모두가 닿는 칸', size: 7, maxTech: 'blocks-all', need: ['blocks-all'],
    cards: [
      { title: '두 칸짜리 자리의 이웃', text: ['어떤 구역의 남은 자리 모두와 닿는 칸이 있어요.', '거기에 고양이를 두면 그 구역에 앉을 곳이 없어져요.', '그래서 그 칸은 ×예요.'], demo: { pack: 'c6-ba', i: 3, tech: 'blocks-all', match: { unitKind: 'reg' } } },
    ],
    items: [
      { t: 'step', pack: 'c6-ba', i: 4, tech: 'blocks-all', match: { unitKind: 'reg' } },
      { t: 'step', pack: 'c7-ba', i: 0, tech: 'blocks-all', match: { unitKind: 'reg' } },
      { t: 'step', pack: 'c7-ba', i: 1, tech: 'blocks-all', match: { unitKind: 'reg' } },
      { t: 'solve', pack: 'c7-ba', i: 2 },
    ],
    summary: '구역의 자리 모두와 닿는 칸은 ×.',
  },
  {
    id: 'C09', unit: 3, title: '두면 막히는 칸', size: 7, maxTech: 'blocks-all', need: ['blocks-all'],
    cards: [
      { title: '줄 전체를 막는 칸', text: ['구역만이 아니라 가로줄, 세로줄도 마찬가지예요.', '어떤 칸에 두면 한 줄의 남은 자리가 모두 막히면, 그 칸은 ×예요.'] },
    ],
    items: [
      { t: 'step', pack: 'c7-ba', i: 3, tech: 'blocks-all', match: { unitKind: ['row', 'col'] } },
      { t: 'step', pack: 'c7-ba', i: 4, tech: 'blocks-all', match: { unitKind: ['row', 'col'] } },
      { t: 'step', pack: 'c7-ba', i: 5, tech: 'blocks-all' },
      { t: 'solve', pack: 'c7-ba', i: 6 },
    ],
    summary: '두면 줄이나 구역이 막히는 칸은 ×.',
  },
  {
    id: 'C10', unit: 4, title: '두 구역, 두 줄', size: 7, maxTech: 'k-lines', need: ['k-lines'],
    cards: [
      { title: '두 구역을 묶어서', text: ['두 구역의 남은 자리가 모두 두 가로줄 안에 있을 때가 있어요.', '두 줄의 고양이 두 마리는 이 두 구역이 가져가요.', '그래서 두 줄의 다른 구역 칸은 ×예요.'], demo: { pack: 'c7-kl', i: 0, tech: 'k-lines', match: { k: 2 } } },
    ],
    items: [
      { t: 'step', pack: 'c7-kl', i: 1, tech: 'k-lines', match: { k: 2 } },
      { t: 'step', pack: 'c7-kl', i: 2, tech: 'k-lines', match: { k: 2 } },
      { t: 'step', pack: 'c7-kl', i: 3, tech: 'k-lines', match: { k: 2 } },
      { t: 'solve', pack: 'c7-kl', i: 4 },
    ],
    summary: '구역 둘이 줄 둘에 갇히면, 그 줄의 나머지는 ×.',
  },
  {
    id: 'C11', unit: 4, title: '세 구역, 세 줄', size: 8, maxTech: 'k-lines', need: ['k-lines'],
    cards: [
      { title: '셋으로 넓히기', text: ['같은 생각을 셋으로 넓혀요.', '세 구역의 남은 자리가 모두 세 줄 안에 있으면, 세 줄의 다른 구역 칸은 ×예요.'], demo: { pack: 'c8-k3', i: 0, tech: 'k-lines', match: { k: 3 } } },
    ],
    items: [
      { t: 'step', pack: 'c8-k3', i: 1, tech: 'k-lines', match: { k: 3 } },
      { t: 'step', pack: 'c8-k3', i: 2, tech: 'k-lines', match: { k: 3 } },
      { t: 'step', pack: 'c8-k3', i: 3, tech: 'k-lines', match: { k: 3 } },
      { t: 'solve', pack: 'c8-k3', i: 4 },
    ],
    summary: '구역 셋이 줄 셋에 갇혀도 똑같아요.',
  },
  {
    id: 'C12', unit: 4, title: '남은 수 세기', size: 8, maxTech: 'k-lines',
    cards: [
      { title: '줄과 구역의 수 맞추기', text: ['줄 몇 개에 고양이 몇 마리가 들어가는지 세어 봐요.', '구역 수와 줄 수가 같아지는 묶음을 찾으면 지울 칸이 보여요.'] },
    ],
    items: [
      { t: 'solve', pack: 'c8-kl', i: 0 },
      { t: 'solve', pack: 'c8-kl', i: 1 },
      { t: 'solve', pack: 'c8-kl', i: 2 },
    ],
    summary: '구역 수와 줄 수가 같은 묶음을 찾아요.',
  },
  {
    id: 'C13', unit: 5, title: '두었다고 해 보기', size: 8, maxTech: 'what-if', need: ['what-if'],
    cards: [
      { title: '가정해 보기는 추측과 달라요', text: ['배운 기법으로 더 지울 칸이 없을 때, 한 칸에 고양이를 두었다고 해 보고 배운 기법으로 따라가 봐요.', '어떤 줄이나 구역에 둘 곳이 없어지면, 처음 칸은 고양이 자리가 아니에요.', '모순을 찾았을 때만 ×를 하니까 추측이 아니에요.'], demo: { pack: 'c8-wi', i: 0, tech: 'what-if', easiest: true } },
    ],
    items: [
      { t: 'step', pack: 'c8-wi', i: 1, tech: 'what-if', easiest: true },
      { t: 'step', pack: 'c8-wi', i: 2, tech: 'what-if', easiest: true },
      { t: 'step', pack: 'c8-wi', i: 3, tech: 'what-if', easiest: true },
      { t: 'solve', pack: 'c8-wi', i: 4 },
    ],
    summary: '두었다고 해 보고, 막히면 ×.',
  },
  {
    id: 'C14', unit: 5, title: '큰 판 풀이 순서', size: 9, maxTech: 'what-if',
    cards: [
      { title: '순서표', text: ['마지막 자리, 한 줄에 갇힌 구역, 모두가 닿는 칸, 묶어서 보기, 가정해 보기 순서로 봐요.', '힌트 단추도 이 순서로 다음 한 수를 찾아요.'] },
    ],
    items: [
      { t: 'guided', pack: 'c9-mix', i: 0, steps: 8 },
      { t: 'solve', pack: 'c9-mix', i: 1 },
      { t: 'solve', pack: 'c9-mix', i: 2 },
    ],
    summary: '쉬운 기법부터 차례로, 가정해 보기는 마지막에.',
  },
];

export const CT_MISSIONS = [
  { id: 'MC1', unit: 1, title: '5×5 세 문제', maxTech: 'last-spot', items: [1, 2, 3].map((i) => ({ t: 'solve', pack: 'c5-ls', i })) },
  { id: 'MC2', unit: 2, title: '6×6 세 문제', maxTech: 'one-line', items: [6, 7, 8].map((i) => ({ t: 'solve', pack: 'c6-ol', i })) },
  { id: 'MC3', unit: 3, title: '7×7 세 문제', maxTech: 'blocks-all', items: [7, 8, 9].map((i) => ({ t: 'solve', pack: 'c7-ba', i })) },
  { id: 'MC4', unit: 4, title: '8×8 세 문제', maxTech: 'k-lines', items: [3, 4, 5].map((i) => ({ t: 'solve', pack: 'c8-kl', i })) },
  { id: 'MC5', unit: 5, title: '9×9 세 문제', maxTech: 'what-if', items: [{ t: 'solve', pack: 'c9-wi', i: 0 }, { t: 'solve', pack: 'c9-wi', i: 1 }, { t: 'solve', pack: 'c9-mix', i: 3 }] },
];
