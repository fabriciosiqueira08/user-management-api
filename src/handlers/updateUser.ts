import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate } from "../middleware/authMiddleware";
import { updateCognitoUser } from "../services/cognitoService";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthenticatedEvent } from "../types";
import { rateLimiter } from "../middleware/rateLimiter";

interface UpdateUserBody {
  name: string;
  email: string;
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const updateUserHandler = async (
  event: APIGatewayProxyEvent | AuthenticatedEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "ID do usuário é obrigatório" }),
      };
    }

    const { name, email } = JSON.parse(event.body || "{}") as UpdateUserBody;

    const authEvent = event as AuthenticatedEvent;
    if (!authEvent.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Usuário não autenticado" }),
      };
    }

    if (authEvent.user.sub !== userId && !authEvent.user.isAdmin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Acesso negado" }),
      };
    }

    await updateCognitoUser(userId, { name, email });

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
    } as const;

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

export const handler = authenticate(rateLimiter(50)(updateUserHandler));
