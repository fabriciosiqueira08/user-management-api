import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { authenticate } from "../middleware/authMiddleware";
import { AuthenticatedEvent } from "../types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const listUsersHandler = async (
  event: APIGatewayProxyEvent | AuthenticatedEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authEvent = event as AuthenticatedEvent;
    if (!authEvent.user?.isAdmin) {
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

export const handler = authenticate(listUsersHandler);
