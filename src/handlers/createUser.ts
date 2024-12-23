import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createCognitoUser } from "../services/cognitoService";
import {
  generateTempPassword,
  generateConfirmationLink,
  sendConfirmationEmail,
} from "../utils/emailUtils";
import { rateLimiter } from "../middleware/rateLimiter";

interface CreateUserRequest {
  email: string;
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
    const { email, name } = JSON.parse(event.body || "{}") as CreateUserRequest;

    if (!email || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email e nome são obrigatórios",
        }),
      };
    }

    // Criar usuário no Cognito com senha temporária
    const tempPassword = generateTempPassword();
    const cognitoResponse = await createCognitoUser(email, name, tempPassword);

    // Criar usuário no DynamoDB
    const user: User = {
      id: cognitoResponse.UserSub,
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

    // Enviar email com link de confirmação
    try {
      const confirmationLink = generateConfirmationLink(
        cognitoResponse.UserSub
      );
      await sendConfirmationEmail(email, confirmationLink);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      // Continua a execução mesmo se o email falhar
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        message:
          "Usuário criado com sucesso. Verifique seu email para completar o cadastro.",
        userId: cognitoResponse.UserSub,
      }),
    };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao criar usuário",
      }),
    };
  }
};

export const handler = rateLimiter(20)(createUserHandler);
