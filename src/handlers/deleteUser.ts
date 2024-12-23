import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate } from "../middleware/authMiddleware";
import { deleteCognitoUser } from "../services/cognitoService";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthenticatedEvent } from "../types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const deleteUserHandler = async (
  event: APIGatewayProxyEvent | AuthenticatedEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.id;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "ID do usuário não fornecido" }),
      };
    }

    const authEvent = event as AuthenticatedEvent;
    if (!authEvent.user?.isAdmin && authEvent.user?.sub !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Acesso negado" }),
      };
    }

    await deleteCognitoUser(userId);

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

export const handler = authenticate(deleteUserHandler);
