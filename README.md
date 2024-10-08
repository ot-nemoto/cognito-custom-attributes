# cognito-custom-attributes

Cognito にトークン生成前 Lambda トリガーを設定し、JWT にカスタムクレームの追加を検証する

## deploy

```bash
npx cdk deploy
```

## 環境変数

Cognito の設定を環境変数に設定

```bash
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name CognitoCustomAttributesStack \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text | tee /dev/tty)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name CognitoCustomAttributesStack \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text | tee /dev/tty)

```

## 動作確認

### ユーザ作成

```bash
aws cognito-idp admin-create-user \
    --user-pool-id ${USER_POOL_ID} \
    --username nemoto@opentone.co.jp \
    --user-attributes Name=email,Value=nemoto@opentone.co.jp \
    --temporary-password 'Passw0rd???'
```

### 一時パスワード更新

```bash
SESSION_ID=$(aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd???' | jq -r '.Session' | tee /dev/tty)

aws cognito-idp respond-to-auth-challenge \
    --client-id ${USER_POOL_CLIENT_ID} \
    --challenge-name NEW_PASSWORD_REQUIRED \
    --challenge-responses USERNAME=nemoto@opentone.co.jp,NEW_PASSWORD='Passw0rd!!!' \
    --session ${SESSION_ID}
```

### JWT 確認

```bash
aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd!!!' | jq -r '.AuthenticationResult.IdToken' | sed "s/\./\n/g" | sed -n 2p | base64 -d | jq .
  # {
  #   "sub": "c7a44ab8-b011-7062-23ec-e6d30893c22a",
  #   "custom:department": "sales",
  #   "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_vqpfFWPiX",
  #   "cognito:username": "c7a44ab8-b011-7062-23ec-e6d30893c22a",
  #   "origin_jti": "3b30c2dc-82d7-4a63-bfc8-f5ee96ad2cb0",
  #   "aud": "7lmq5ulr8sevce4jkr30gj04dl",
  #   "event_id": "19a90ca4-b606-4ee9-b86f-ae4106a9ee3e",
  #   "token_use": "id",
  #   "auth_time": 1728369461,
  #   "exp": 1728373061,
  #   "custom:role": "admin",
  #   "iat": 1728369461,
  #   "jti": "342b5396-4609-408f-be78-24b4ae5b3342",
  #   "email": "nemoto@opentone.co.jp"
  # }
```
