const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { protected } = require("../middleware/authMiddleware");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const getUserHandler = async (event) => {
  const userId = event.pathParameters.id;

  try {
    const params = {
      TableName: process.env.USERS_TABLE,
      Key: { id: userId },
    };

    const command = new GetCommand(params);
    const response = await docClient.send(command);

    // Verifica se o usuário tem permissão para acessar estes dados
    if (event.user.sub !== userId && !event.user.groups.includes("admin")) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Acesso negado" }),
      };
    }

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Usuário não encontrado" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response.Item),
    };
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno do servidor" }),
    };
  }
};

// Exporta o handler protegido com autenticação
module.exports = {
  handler: protected(getUserHandler),
};
