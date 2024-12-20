const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { createCognitoUser } = require("../services/cognitoService");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const createUserHandler = async (event) => {
  try {
    const { email, password, name } = JSON.parse(event.body);

    if (!email || !password || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email, senha e nome são obrigatórios",
          received: { email, password: "***", name },
        }),
      };
    }

    // Criar usuário no Cognito
    const cognitoResponse = await createCognitoUser(email, name, password);
    const userId = cognitoResponse.UserSub;

    // Criar usuário no DynamoDB
    const user = {
      id: userId,
      email,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: process.env.USERS_TABLE,
      Item: user,
    };

    const command = new PutCommand(params);
    await docClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify(user),
    };
  } catch (error) {
    console.error("Erro ao criar usuário:", {
      message: error.message,
      stack: error.stack,
      details: error.toString(),
    });

    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao criar usuário",
        type: error.name,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
    };
  }
};

module.exports = {
  handler: createUserHandler,
};
