import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { authenticate } from "../middleware/authMiddleware";
import { AuthenticatedEvent } from "../types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const getUserHandler = async (
  event: APIGatewayProxyEvent | AuthenticatedEvent
): Promise<APIGatewayProxyResult> => {
  const userId = event.pathParameters?.id;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "ID do usuário não fornecido" }),
    };
  }

  try {
    const params = {
      TableName: process.env.USERS_TABLE!,
      Key: { id: userId },
    };

    const command = new GetCommand(params);
    const response = await docClient.send(command);

    const authEvent = event as AuthenticatedEvent;
    if (!authEvent.user?.isAdmin && authEvent.user?.sub !== userId) {
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

export const handler = authenticate(getUserHandler);
