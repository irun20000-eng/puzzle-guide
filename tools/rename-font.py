# 서브셋 글꼴의 이름을 바꾼다(SIL OFL 1.1 조건 3: 수정본은 예약 글꼴 이름 "Pretendard"를 쓰지 않는다).
# 0(저작권), 13(라이선스 설명), 14(라이선스 주소)는 그대로 둔다. 나머지 이름 기록에서 Pretendard 를 PG Sans 로 바꾼다.
# 사용: python tools/rename-font.py <woff2 파일> <굵기 이름 Regular|Bold>
# 출력: 바꾼 뒤 이름 기록 1·4·6을 JSON 한 줄로
import json
import sys
from fontTools.ttLib import TTFont

path, style = sys.argv[1], sys.argv[2]
FAMILY = 'PG Sans'
PS = 'PGSans-' + style
KEEP = {0, 13, 14}
font = TTFont(path)
name = font['name']
fixed = {1: FAMILY, 2: style, 3: f'{PS};subset', 4: f'{FAMILY} {style}', 6: PS, 16: FAMILY, 17: style}
for rec in list(name.names):
    if rec.nameID in KEEP:
        continue
    if rec.nameID in fixed:
        rec.string = fixed[rec.nameID]
    elif 'Pretendard' in rec.toUnicode():
        rec.string = rec.toUnicode().replace('Pretendard', FAMILY)
if 'CFF ' in font:
    cff = font['CFF '].cff
    cff.fontNames = [PS]
    top = cff.topDictIndex[0]
    for key, value in (('FullName', f'{FAMILY} {style}'), ('FamilyName', FAMILY)):
        if hasattr(top, key):
            setattr(top, key, value)
font.flavor = 'woff2'
font.save(path)
check = TTFont(path)
out = {str(i): check['name'].getDebugName(i) for i in (0, 1, 4, 6, 13, 14)}
left = [r.nameID for r in check['name'].names if r.nameID not in KEEP and 'Pretendard' in r.toUnicode()]
out['left'] = left
print(json.dumps(out, ensure_ascii=True))
