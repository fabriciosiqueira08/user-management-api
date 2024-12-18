const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);
    const timestamp = new Date().getTime();

    const command = new UpdateCommand({
      TableName: process.env.USERS_TABLE,
      Key: { id },
      UpdateExpression:
        "set #name = :name, email = :email, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": data.name,
        ":email": data.email,
        ":updatedAt": timestamp,
      },
      ReturnValues: "ALL_NEW",
    });

    const { Attributes } = await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not update user" }),
    };
  }
};
