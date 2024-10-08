import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RemovalPolicy } from 'aws-cdk-lib';

export class CognitoCustomAttributesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // // Lambda関数の作成
    const preTokenGenerationLambda = new lambda.Function(
      this,
      'preTokenGenerationLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X, // Node.js 20.x を使用
        code: lambda.Code.fromAsset('lambda'), // "lambda" ディレクトリからコードを読み込む
        handler: 'index.handler', // ファイルは "index", 関数は "handler"
      }
    );

    // User Poolの作成
    const userPool = new cognito.UserPool(this, 'UserPool', {
      signInAliases: {
        email: true, // メールアドレスでサインインを許可
      },
      autoVerify: { email: true }, // メールアドレスを自動で検証
      removalPolicy: RemovalPolicy.DESTROY, // 削除時にリソースも削除する設定
    });

    // Cognito User PoolにLambdaトリガーを追加
    userPool.addTrigger(
      cognito.UserPoolOperation.PRE_TOKEN_GENERATION,
      preTokenGenerationLambda
    );

    // User Pool Clientの作成
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false, // クライアントシークレットの生成を無効に
      authFlows: {
        userPassword: true, // USER_PASSWORD_AUTH フローを有効に
      },
    });

    // 出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
  }
}
