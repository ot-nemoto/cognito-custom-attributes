const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const params = {
    TableName: 'AuthorizationTable',
    Key: {
      id: event.userName,
    },
  };

  // DynamoDB からデータを取得
  const data = await dynamoDB.get(params).promise();

  if (!data.Item) {
    return event;
  }

  // event の context にカスタムクレームを追加する
  const claimsToAddOrOverride = {
    'custom:economic_ripple_effect': data.Item.economic_ripple_effect,
    'custom:demand_forecasting': data.Item.demand_forecasting,
  };

  // クレームを idToken, accessToken, refreshToken に追加
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: claimsToAddOrOverride,
    },
  };

  return event;
};
