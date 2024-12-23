import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-rsa";
import { promisify } from "util";
import { AuthenticatedEvent, LambdaHandler } from "../types";

const region = process.env.AWS_REGION || "us-east-1";
const userPoolId = process.env.USER_POOL_ID;

const client: JwksClient = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutos
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const getSigningKey = promisify(client.getSigningKey.bind(client));

const verifyToken = async (token: string): Promise<JwtPayload> => {
  try {
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken || !decodedToken.header.kid) {
      throw new Error("Token inválido");
    }

    const key = await getSigningKey(decodedToken.header.kid);
    if (!key) {
      throw new Error("Chave de assinatura não encontrada");
    }

    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    }) as JwtPayload;

    return verified;
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    throw error;
  }
};

const authMiddleware = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult | null> => {
  try {
    const authHeader =
      event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Token não fornecido" }),
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await verifyToken(token);

    (event as AuthenticatedEvent).user = {
      sub: decodedToken.sub || "",
      email: decodedToken["email"] || "",
      isAdmin: decodedToken["custom:isAdmin"] === "true",
    };

    return null;
  } catch (error) {
    console.error("Erro de autenticação:", error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Token inválido ou expirado" }),
    };
  }
};

export const authenticate = (handler: LambdaHandler): LambdaHandler => {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    const authResult = await authMiddleware(event);
    if (authResult) {
      return authResult;
    }
    return handler(event, {});
  };
};

export const requireAdmin = (handler: LambdaHandler): LambdaHandler => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
    const authenticatedEvent = event as AuthenticatedEvent;

    if (!authenticatedEvent.user?.isAdmin) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Acesso negado: requer privilégios de administrador",
        }),
      };
    }

    return await handler(event, {});
  };
};
