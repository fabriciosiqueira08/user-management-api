import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createCognitoUser } from "../services/cognitoService";
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

// Gerar senha temporária que atende aos requisitos do Cognito
const generateTempPassword = () => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "@$!%*?&";

  let password = "";
  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Completar até 12 caracteres
  const allChars = uppercase + lowercase + numbers + special;
  while (password.length < 12) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralhar a senha
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

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

    // Gerar senha temporária
    const tempPassword = generateTempPassword();

    // Log da senha temporária apenas em ambiente de desenvolvimento
    if (process.env.IS_OFFLINE) {
      console.log("\n=== DADOS PARA TESTE LOCAL ===");
      console.log("Email:", email);
      console.log("Senha Temporária:", tempPassword);
      console.log("============================\n");
    }

    // Criar usuário no Cognito
    const cognitoResponse = await createCognitoUser(email, tempPassword);

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

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Usuário criado com sucesso",
        userId: cognitoResponse.UserSub,
        ...(process.env.IS_OFFLINE && { tempPassword }),
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
