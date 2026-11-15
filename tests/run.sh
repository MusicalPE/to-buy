#!/bin/bash
# 올리기 전 시험
#   tests/run.sh check   단순 수정(글귀·색·여백·그림): 코드 검사만
#   tests/run.sh full    기능 수정(새 기능·화면 배치·서버·저장 방식) 또는 애매할 때: 코드 검사 + 화면 시험 전부
# 하나라도 실패하면 끝에 "실패"가 나오고 0이 아닌 값으로 끝남 → 올리지 말고 먼저 고치기
cd "$(dirname "$0")"
mode="${1:-full}"
node check.mjs || { echo "== 코드 검사 실패: 올리지 마세요 =="; exit 1; }
[ "$mode" = "check" ] && { echo "== 코드 검사 통과 =="; exit 0; }

# 화면 시험 준비(처음 한 번): 글꼴 · QR 라이브러리
[ -d node_modules/qrcode-generator ] || npm install --silent --no-audit --no-fund >/dev/null 2>&1 || { echo "시험 준비(npm install) 실패"; exit 1; }
mkdir -p out && cd out
fail=0; n=0
for t in basic family receipts share demo; do
  n=$((n+1))
  out=$(timeout 180 node ../$t.mjs 2>&1 | grep -v "agent-proxy\|connect_rejected\|Allowed domains\|For details\|^- \|^(oldest\|^$")
  last=$(echo "$out" | tail -1)
  if echo "$last" | grep -qE "문제 없음"; then echo "통과  $t"; else echo "실패  $t"; echo "$out" | tail -8; fail=1; fi
done
[ $fail = 0 ] && echo "== 전체 시험 통과 (코드 검사 + 화면 시험 ${n}가지) ==" || { echo "== 전체 시험 실패: 올리지 마세요 =="; exit 1; }
