#!/bin/bash
# API接口快速测试脚本

BASE_URL="http://localhost:3000/api"
EMAIL="test@example.com"
PASSWORD="Test123!"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  智能论文写作平台 API 测试脚本"
echo "================================================"
echo ""

# 1. 测试注册
echo -e "${YELLOW}[1/6] 测试用户注册...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'

# 提取token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tokens.access_token')
CREDITS=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.credits')

if [ "$CREDITS" = "100" ]; then
  echo -e "${GREEN}✓ 注册成功，获得100初始积分${NC}"
else
  echo -e "${RED}✗ 注册失败${NC}"
  exit 1
fi
echo ""

# 2. 测试查询余额
echo -e "${YELLOW}[2/6] 测试查询积分余额...${NC}"
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/credits/balance" \
  -H "Authorization: Bearer $TOKEN")

echo "$BALANCE_RESPONSE" | jq '.'
CURRENT_CREDITS=$(echo "$BALANCE_RESPONSE" | jq -r '.data.credits')

if [ "$CURRENT_CREDITS" = "100" ]; then
  echo -e "${GREEN}✓ 积分余额正确${NC}"
else
  echo -e "${RED}✗ 积分余额异常${NC}"
fi
echo ""

# 3. 测试创建论文
echo -e "${YELLOW}[3/6] 测试创建论文...${NC}"
PAPER_RESPONSE=$(curl -s -X POST "$BASE_URL/papers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试论文",
    "content": {"type": "doc", "content": []},
    "tags": ["测试"]
  }')

echo "$PAPER_RESPONSE" | jq '.'
PAPER_ID=$(echo "$PAPER_RESPONSE" | jq -r '.data.id')

if [ "$PAPER_ID" != "null" ]; then
  echo -e "${GREEN}✓ 论文创建成功，ID: $PAPER_ID${NC}"
else
  echo -e "${RED}✗ 论文创建失败${NC}"
fi
echo ""

# 4. 测试AI润色
echo -e "${YELLOW}[4/6] 测试AI段落润色...${NC}"
AI_RESPONSE=$(curl -s -X POST "$BASE_URL/ai/polish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "本文探讨了AI在教育的应用",
    "type": "grammar"
  }')

echo "$AI_RESPONSE" | jq '.'

# 检查是否扣费
CREDITS_AFTER=$(echo "$AI_RESPONSE" | jq -r '.data.credits_remaining // empty')

if [ -n "$CREDITS_AFTER" ]; then
  COST=$(echo "$AI_RESPONSE" | jq -r '.data.credits_cost')
  echo -e "${GREEN}✓ AI润色成功，消耗${COST}积分，剩余${CREDITS_AFTER}积分${NC}"
else
  echo -e "${YELLOW}⚠ AI服务未实现或需要配置代理${NC}"
fi
echo ""

# 5. 测试积分流水
echo -e "${YELLOW}[5/6] 测试积分流水查询...${NC}"
TRANSACTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/credits/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$TRANSACTIONS_RESPONSE" | jq '.'
TRANSACTION_COUNT=$(echo "$TRANSACTIONS_RESPONSE" | jq -r '.data.items | length')

if [ "$TRANSACTION_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✓ 流水记录查询成功，共${TRANSACTION_COUNT}条${NC}"
else
  echo -e "${YELLOW}⚠ 暂无流水记录${NC}"
fi
echo ""

# 6. 测试签到
echo -e "${YELLOW}[6/6] 测试每日签到...${NC}"
CHECKIN_RESPONSE=$(curl -s -X POST "$BASE_URL/user/checkin" \
  -H "Authorization: Bearer $TOKEN")

echo "$CHECKIN_RESPONSE" | jq '.'
CHECKIN_CREDITS=$(echo "$CHECKIN_RESPONSE" | jq -r '.data.credits_earned // empty')

if [ -n "$CHECKIN_CREDITS" ]; then
  echo -e "${GREEN}✓ 签到成功，获得${CHECKIN_CREDITS}积分${NC}"
else
  echo -e "${YELLOW}⚠ 签到功能未实现或今日已签到${NC}"
fi
echo ""

# 总结
echo "================================================"
echo -e "${GREEN}测试完成！${NC}"
echo ""
echo "生成的测试数据："
echo "  - 邮箱: $EMAIL"
echo "  - 密码: $PASSWORD"
echo "  - Token: ${TOKEN:0:30}..."
echo "  - 论文ID: $PAPER_ID"
echo ""
echo "你可以使用这些数据在Apifox/Postman中继续测试"
echo "================================================"
