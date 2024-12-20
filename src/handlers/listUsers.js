const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { protected } = require("../middleware/authMiddleware");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const listUsersHandler = async (event) => {
  try {
    // Verifica se o usuário tem permissão (apenas admins podem listar todos os usuários)
    if (!event.user.groups.includes("admin")) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Apenas administradores podem listar todos os usuários",
        }),
      };
    }

    const params = {
      TableName: process.env.USERS_TABLE,
    };

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao listar usuários" }),
    };
  }
};

// Exporta o handler protegido com autenticação
module.exports = {
  handler: protected(listUsersHandler),
};
