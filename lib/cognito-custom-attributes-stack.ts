import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class CognitoCustomAttributesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS SDKのLambda Layerを作成
    const awsSdkLayer = new lambda.LayerVersion(this, 'AwsSdkLayer', {
      code: lambda.Code.fromAsset('layer/aws-sdk-layer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],

      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda関数の作成
    const preTokenGenerationLambda = new lambda.Function(
      this,
      'PreTokenGenerationLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'index.handler',
        layers: [awsSdkLayer],
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

    // DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, 'AuthorizationTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }, // パーティションキー
      tableName: 'AuthorizationTable', // テーブル名
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンドモード

      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にテーブルも削除
    });
    table.grantReadData(preTokenGenerationLambda); // Lambda関数にテーブルの読み取り権限を付与

    // 出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
  }
}
