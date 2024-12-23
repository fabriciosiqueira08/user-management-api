import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createCognitoUser } from "../services/cognitoService";

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const createUserHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, password, name } = JSON.parse(
      event.body || "{}"
    ) as CreateUserRequest;

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
    if (!cognitoResponse.UserSub) {
      throw new Error("Erro ao criar usuário: ID não gerado");
    }

    // Criar usuário no DynamoDB
    const user: User = {
      id: cognitoResponse.UserSub,
      email,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: process.env.USERS_TABLE!,
      Item: user,
    };

    const command = new PutCommand(params);
    await docClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify(user),
    };
  } catch (error: any) {
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

export const handler = createUserHandler;
