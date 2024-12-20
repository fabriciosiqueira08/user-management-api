const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { protected } = require("../middleware/authMiddleware");
const { updateCognitoUser } = require("../services/cognitoService");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const updateUserHandler = async (event) => {
  try {
    const userId = event.pathParameters.id;
    const { name, email } = JSON.parse(event.body);

    // Verifica se o usuário tem permissão (apenas o próprio usuário ou admin)
    if (event.user.sub !== userId && !event.user.groups.includes("admin")) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Acesso negado" }),
      };
    }

    // Atualizar usuário no Cognito
    await updateCognitoUser(userId, { name, email });

    // Atualizar usuário no DynamoDB
    const params = {
      TableName: process.env.USERS_TABLE,
      Key: { id: userId },
      UpdateExpression:
        "set #name = :name, email = :email, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": name,
        ":email": email,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const command = new UpdateCommand(params);
    const result = await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao atualizar usuário" }),
    };
  }
};

// Exporta o handler protegido com autenticação
module.exports = {
  handler: protected(updateUserHandler),
};
