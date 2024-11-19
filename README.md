# cognito-custom-attributes

Cognito にトークン生成前 Lambda トリガーを設定し、JWT にカスタムクレームの追加を検証する

## deploy

```bash
(cd layer/aws-sdk-layer/nodejs && npm install -y)
```

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
  # e.g.)
  # {
  #     "User": {
  #         "Username": "3794eaa8-8031-70a8-d249-a7561c694a0f",
  #         "Attributes": [
  #             {
  #                 "Name": "email",
  #                 "Value": "nemoto@opentone.co.jp"
  #             },
  #             {
  #                 "Name": "sub",
  #                 "Value": "3794eaa8-8031-70a8-d249-a7561c694a0f"
  #             }
  #         ],
  #         "UserCreateDate": "2024-11-19T00:24:04.217000+00:00",
  #         "UserLastModifiedDate": "2024-11-19T00:24:04.217000+00:00",
  #         "Enabled": true,
  #         "UserStatus": "FORCE_CHANGE_PASSWORD"
  #     }
  # }
```

User: `nemoto@opentone.co.jp`
Pass: `Passw0rd???`

### 一時パスワード更新

```bash
SESSION_ID=$(aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd???' | jq -r '.Session' | tee /dev/tty)
  # e.g.)
  # AYABeOcVfV...VsUVujXVfw

aws cognito-idp respond-to-auth-challenge \
    --client-id ${USER_POOL_CLIENT_ID} \
    --challenge-name NEW_PASSWORD_REQUIRED \
    --challenge-responses USERNAME=nemoto@opentone.co.jp,NEW_PASSWORD='Passw0rd!!!' \
    --session ${SESSION_ID}
  # e.g.)
  # {
  #     "ChallengeParameters": {},
  #     "AuthenticationResult": {
  #         "AccessToken": "eyJraWQiOi...6wdrB1ITeA",
  #         "ExpiresIn": 3600,
  #         "TokenType": "Bearer",
  #         "RefreshToken": "eyJjdHkiOi...AzQnFapf7A",
  #         "IdToken": "eyJraWQiOi...wyH9oC7prQ"
  #     }
  # }
```

Pass: `Passw0rd!!!`

### JWT 確認

```bash
aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd!!!' | jq -r '.AuthenticationResult.IdToken' | sed "s/\./\n/g" | sed -n 2p | base64 -d | jq .
  # e.g.)
  # {
  #   "sub": "3794eaa8-8031-70a8-d249-a7561c694a0f",
  #   "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_l7tXMpbpv",
  #   "cognito:username": "3794eaa8-8031-70a8-d249-a7561c694a0f",
  #   "origin_jti": "476375af-cf07-48f1-b781-099e7298264e",
  #   "aud": "4pifq5u1rrkrpaij3odsgs3gku",
  #   "event_id": "ed07cfab-8efb-43e5-8591-2add65480884",
  #   "token_use": "id",
  #   "auth_time": 1731975923,
  #   "exp": 1731979523,
  #   "iat": 1731975923,
  #   "jti": "c0fe9752-7adc-4233-a325-3c7d7a6f5c01",
  #   "email": "nemoto@opentone.co.jp"
  # }
```

### DynamoDB に属性情報を登録

```bash
SUB=$(aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd!!!' | jq -r '.AuthenticationResult.IdToken' | sed "s/\./\n/g" | sed -n 2p | base64 -d 2>/dev/null | jq -r .sub | tee /dev/tty)
  # e.g.)
  # 3794eaa8-8031-70a8-d249-a7561c694a0f

aws dynamodb put-item \
    --table-name AuthorizationTable \
    --item "{
        \"id\": {\"S\": \"${SUB}\"},
        \"economic_ripple_effect\": {\"BOOL\": true},
        \"demand_forecasting\": {\"BOOL\": true}
    }"
```

```bash
aws dynamodb get-item --table-name AuthorizationTable --key "{\"id\":{\"S\":\"${SUB}\"}}"
  # {
  #     "Item": {
  #         "id": {
  #             "S": "c7a44ab8-b011-7062-23ec-e6d30893c22a"
  #         },
  #         "economic_ripple_effect": {
  #             "BOOL": true
  #         },
  #         "demand_forecasting": {
  #             "BOOL": true
  #         }
  #     }
  # }
```

### JWT 確認

```bash
aws cognito-idp initiate-auth \
    --client-id ${USER_POOL_CLIENT_ID} \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=nemoto@opentone.co.jp,PASSWORD='Passw0rd!!!' | jq -r '.AuthenticationResult.IdToken' | sed "s/\./\n/g" | sed -n 2p | base64 -d | jq .
  # e.g.)
  # {
  #   "sub": "3794eaa8-8031-70a8-d249-a7561c694a0f",
  #   "custom:economic_ripple_effect": "true",
  #   "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_l7tXMpbpv",
  #   "cognito:username": "3794eaa8-8031-70a8-d249-a7561c694a0f",
  #   "origin_jti": "3ed2dd2c-3b76-44ff-93e5-f3a67b50b3d6",
  #   "aud": "4pifq5u1rrkrpaij3odsgs3gku",
  #   "event_id": "79c15a08-aa9e-4f87-97fb-336005ce0962",
  #   "token_use": "id",
  #   "auth_time": 1731976255,
  #   "exp": 1731979854,
  #   "custom:demand_forecasting": "true",
  #   "iat": 1731976255,
  #   "jti": "ea6a4bd1-2a7b-490d-b1fc-5b91c03eafa3",
  #   "email": "nemoto@opentone.co.jp"
  # }
```
