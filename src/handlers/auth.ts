import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { initiateAuth, verifyMFA } from "../services/authService";
import { rateLimiter } from "../middleware/rateLimiter";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

interface LoginRequest {
  email: string;
  password: string;
}

interface VerifyMFARequest {
  session: string;
  code: string;
  email: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

const login = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, password } = JSON.parse(event.body || "{}") as LoginRequest;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email e senha são obrigatórios",
        }),
      };
    }

    try {
      // Verificar credenciais e iniciar MFA
      const authResponse = await initiateAuth(email, password);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Digite o código MFA",
          session: authResponse.session,
          requiresMFA: true,
        }),
      };
    } catch (error: any) {
      if (error.message === "Credenciais inválidas") {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: "Email ou senha incorretos",
          }),
        };
      }
      if (error.message === "Usuário não encontrado") {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Usuário não encontrado",
          }),
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao realizar login",
        error: process.env.IS_OFFLINE ? error : undefined,
      }),
    };
  }
};

const verifyMFAHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { session, code, email } = JSON.parse(
      event.body || "{}"
    ) as VerifyMFARequest;

    if (!session || !code || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Sessão, código MFA e email são obrigatórios",
        }),
      };
    }

    try {
      const response = await verifyMFA(session, code, email);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Login completado com sucesso",
          tokens: response.tokens,
        }),
      };
    } catch (error: any) {
      if (error.message === "Código MFA inválido ou expirado") {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: error.message,
          }),
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Erro na verificação MFA:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao verificar código MFA",
      }),
    };
  }
};

const refreshToken = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { refreshToken } = JSON.parse(
      event.body || "{}"
    ) as RefreshTokenRequest;

    if (!refreshToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Refresh token é obrigatório",
        }),
      };
    }

    const params = {
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };

    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Token atualizado com sucesso",
        tokens: {
          accessToken: response.AuthenticationResult?.AccessToken,
          idToken: response.AuthenticationResult?.IdToken,
        },
      }),
    };
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao atualizar token",
        error: (error as Error).message,
      }),
    };
  }
};

const logoutHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const accessToken = event.headers.Authorization?.replace("Bearer ", "");

    if (!accessToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Token não fornecido",
        }),
      };
    }

    const params = {
      AccessToken: accessToken,
    };

    const command = new GlobalSignOutCommand(params);
    await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Logout realizado com sucesso",
      }),
    };
  } catch (error) {
    console.error("Erro no logout:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao realizar logout",
        error: (error as Error).message,
      }),
    };
  }
};

// Rate limit mais restrito para tentativas de login
export const loginHandler = rateLimiter(30)(login);
const verifyMFAWithRateLimit = rateLimiter(30)(verifyMFAHandler);
export const refreshTokenHandler = rateLimiter(60)(refreshToken);

export {
  login,
  verifyMFAWithRateLimit as verifyMFAHandler,
  refreshToken,
  logoutHandler,
};
