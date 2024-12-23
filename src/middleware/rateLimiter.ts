import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaHandler } from "../types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const RATE_LIMIT_TABLE = `${process.env.SERVICE_NAME}-${process.env.STAGE}-ratelimit`;

export const rateLimiter = (
  requestsPerMinute: number = 100
): ((handler: LambdaHandler) => LambdaHandler) => {
  return (handler: LambdaHandler): LambdaHandler => {
    return async (
      event: APIGatewayProxyEvent,
      context: any
    ): Promise<APIGatewayProxyResult> => {
      const ip = event.requestContext.identity.sourceIp;
      const now = Math.floor(Date.now() / 1000);
      const key = `${ip}:${now}`;

      try {
        // Verificar contagem atual
        const result = await client.send(
          new GetCommand({
            TableName: RATE_LIMIT_TABLE,
            Key: { id: key },
          })
        );

        const count = (result.Item?.count || 0) + 1;

        if (count > requestsPerMinute) {
          return {
            statusCode: 429,
            body: JSON.stringify({
              message: "Muitas requisições. Tente novamente em breve.",
            }),
          };
        }

        // Atualizar contagem
        await client.send(
          new PutCommand({
            TableName: RATE_LIMIT_TABLE,
            Item: {
              id: key,
              count,
              ttl: now + 60, // expira em 1 minuto
            },
          })
        );

        return handler(event, context);
      } catch (error) {
        console.error("Erro no rate limit:", error);
        return handler(event, context); // Em caso de erro, permite a requisição
      }
    };
  };
};
