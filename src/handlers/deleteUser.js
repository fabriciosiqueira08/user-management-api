const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { protected } = require("../middleware/authMiddleware");
const { deleteCognitoUser } = require("../services/cognitoService");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const deleteUserHandler = async (event) => {
  try {
    const userId = event.pathParameters.id;

    // Verifica se o usuário tem permissão (apenas o próprio usuário ou admin)
    if (event.user.sub !== userId && !event.user.groups.includes("admin")) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Acesso negado" }),
      };
    }

    // Deletar usuário do Cognito
    await deleteCognitoUser(userId);

    // Deletar usuário do DynamoDB
    const params = {
      TableName: process.env.USERS_TABLE,
      Key: { id: userId },
    };

    const command = new DeleteCommand(params);
    await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Usuário deletado com sucesso" }),
    };
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao deletar usuário" }),
    };
  }
};

// Exporta o handler protegido com autenticação
module.exports = {
  handler: protected(deleteUserHandler),
};
