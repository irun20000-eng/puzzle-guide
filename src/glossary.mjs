// 용어 사전: 기법 카드(작은 판 그림 + 한 줄 설명). 영어 이름은 여기에만 쓴다(기획서 4장).
// demo 는 차시 '걸음'과 같은 모양({ pack, i, tech, match }). 화면이 풀이 길에서 그 상태를 찾아 그린다.
export const GLOSSARY = [
  { kind: 'sd', id: 'rule', name: '스도쿠 규칙', en: 'Sudoku', text: '가로줄, 세로줄, 상자마다 숫자가 한 번씩 들어가요.', lesson: 'S01' },
  { kind: 'sd', id: 'full-house', name: '마지막 빈칸', en: 'Full house', text: '줄이나 상자에 빈칸이 하나 남으면 빠진 숫자를 넣어요.', lesson: 'S02', demo: { pack: 's4-fh', i: 0, tech: 'full-house' } },
  { kind: 'sd', id: 'hidden-single', name: '숨은 한 자리', en: 'Hidden single', text: '어떤 숫자가 줄이나 상자 안에서 갈 곳이 한 칸뿐이면 거기에 놓아요.', lesson: 'S03', demo: { pack: 's4-hb', i: 0, tech: 'hidden-single-box' } },
  { kind: 'sd', id: 'naked-single', name: '하나뿐인 숫자', en: 'Naked single', text: '한 칸에 들어갈 수 있는 숫자가 하나뿐이면 그 숫자를 놓아요.', lesson: 'S07', demo: { pack: 's6-ns', i: 0, tech: 'naked-single' } },
  { kind: 'sd', id: 'memo', name: '메모(후보 숫자)', en: 'Pencil marks, candidates', text: '칸에 들어갈 수 있는 숫자를 작게 적어 둬요.', lesson: 'S08' },
  { kind: 'sd', id: 'pointing', name: '가리키기', en: 'Pointing (locked candidates)', text: '상자 안의 후보가 한 줄에 몰리면, 그 줄의 상자 밖에서 지워요.', lesson: 'S12', demo: { pack: 's9-pt', i: 0, tech: 'pointing' } },
  { kind: 'sd', id: 'claiming', name: '차지하기', en: 'Claiming (locked candidates)', text: '줄 안의 후보가 한 상자에 몰리면, 그 상자의 다른 칸에서 지워요.', lesson: 'S13', demo: { pack: 's9-cl', i: 0, tech: 'claiming' } },
  { kind: 'sd', id: 'naked-pair', name: '드러난 짝', en: 'Naked pair', text: '두 칸이 같은 두 후보만 가지면, 같은 줄이나 상자의 다른 칸에서 지워요.', lesson: 'S14', demo: { pack: 's9-np', i: 0, tech: 'naked-pair' } },
  { kind: 'sd', id: 'hidden-pair', name: '숨은 짝', en: 'Hidden pair', text: '두 숫자가 두 칸에만 들어가면, 그 두 칸의 다른 후보를 지워요.', lesson: 'S15', demo: { pack: 's9-hp', i: 0, tech: 'hidden-pair' } },
  { kind: 'sd', id: 'triple', name: '셋 묶음', en: 'Naked/Hidden triple', text: '세 칸이 세 숫자를 나눠 가지면, 같은 줄이나 상자의 다른 칸에서 지워요.', lesson: 'S16', demo: { pack: 's9-tr', i: 0, tech: 'naked-triple' } },
  { kind: 'sd', id: 'x-wing', name: 'X-윙', en: 'X-Wing', text: '두 줄의 후보가 똑같은 두 칸 자리에만 있으면, 두 세로줄(또는 가로줄)의 다른 칸에서 지워요.', lesson: 'S17', demo: { pack: 's9-xw', i: 0, tech: 'x-wing' } },
  { kind: 'ct', id: 'rule', name: '고양이 자리 규칙', en: 'Star Battle (1 star)', text: '가로줄, 세로줄, 구역마다 고양이 한 마리. 서로 닿지 않게 앉혀요.', lesson: 'C01' },
  { kind: 'ct', id: 'mark', name: '지우기 표시(×)', en: 'Marking', text: '고양이가 앉을 수 없는 칸에 ×를 해 둬요.', lesson: 'C02' },
  { kind: 'ct', id: 'last-spot', name: '마지막 자리', en: 'Last cell', text: '줄이나 구역에 남은 자리가 하나면 거기에 앉혀요.', lesson: 'C03', demo: { pack: 'c4-ls', i: 0, tech: 'last-spot' } },
  { kind: 'ct', id: 'one-line', name: '한 줄에 갇힌 구역', en: 'Region confined to a line', text: '구역의 자리가 한 줄에만 있으면, 그 줄의 다른 칸은 ×예요.', lesson: 'C04', demo: { pack: 'c5-ol', i: 0, tech: 'one-line', match: { variant: 'reg-in-line' } } },
  { kind: 'ct', id: 'blocks-all', name: '모두가 닿는 칸', en: 'Nosy neighbors', text: '두면 어떤 줄이나 구역의 자리가 모두 막히는 칸은 ×예요.', lesson: 'C08', demo: { pack: 'c6-ba', i: 3, tech: 'blocks-all', match: { unitKind: 'reg' } } },
  { kind: 'ct', id: 'k-lines', name: '묶어서 보기', en: 'N regions in N lines', text: '구역 k개가 줄 k개 안에만 있으면, 그 줄들의 다른 구역 칸은 ×예요.', lesson: 'C10', demo: { pack: 'c7-kl', i: 0, tech: 'k-lines', match: { k: 2 } } },
  { kind: 'ct', id: 'what-if', name: '가정해 보기', en: 'Contradiction', text: '두었다고 해 보고 막히면, 그 칸은 ×예요. 모순을 찾았을 때만 지우니 추측이 아니에요.', lesson: 'C13', demo: { pack: 'c8-wi', i: 0, tech: 'what-if', easiest: true } },
];

// 퍼즐 이야기: 출처가 있는 내용만(docs/조사.md). 장르 이름은 이 화면에서만 밝힌다.
export const STORIES = [
  { kind: 'sd', title: '스도쿠라는 이름', text: ['스도쿠는 4×4, 6×6, 9×9처럼 여러 크기로 풀 수 있어요.', '일본에서 이 이름은 퍼즐 회사 니코리의 등록상표라서, 다른 출판사는 "넘버 플레이스"라고 불러요.'], src: 'docs/조사.md [T1][T2][T5]' },
  { kind: 'ct', title: '고양이 자리는 어떤 퍼즐일까', text: ['이 퍼즐은 스타 배틀이라는 장르예요.', '스타 배틀은 2003년 네덜란드에서 열린 세계 퍼즐 선수권을 위해 한스 엔데박이 만들었어요.', '원래는 별을 넣는데, 이 앱에서는 고양이를 앉혀요(설정에서 별로 바꿀 수 있어요).'], src: 'docs/조사.md [S1][S3]' },
];
