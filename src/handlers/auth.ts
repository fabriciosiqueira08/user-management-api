import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  initiateAuth,
  generateOTP,
  storeOTP,
  sendOTPEmail,
  validateOTP,
  completeAuth,
} from "../services/authService";
import { rateLimiter } from "../middleware/rateLimiter";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

interface LoginRequest {
  email: string;
  password: string;
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

    // Verificar credenciais
    const authResponse = await initiateAuth(email, password);

    // Gerar e enviar OTP
    const otp = await generateOTP();
    await storeOTP(email, otp); // Armazenar OTP temporariamente
    await sendOTPEmail(email, otp);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Código de verificação enviado para seu email",
        session: authResponse.Session,
      }),
    };
  } catch (error) {
    console.error("Erro no login:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao realizar login",
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

// Novo endpoint para verificar OTP
const verifyOTP = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, otp, session } = JSON.parse(event.body || "{}");

    if (!email || !otp || !session) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email, código e sessão são obrigatórios",
        }),
      };
    }

    // Verificar OTP
    const isValid = await validateOTP(email, otp);
    if (!isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Código inválido ou expirado",
        }),
      };
    }

    // Completar autenticação e gerar tokens
    const tokens = await completeAuth(session);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login realizado com sucesso",
        tokens,
      }),
    };
  } catch (error) {
    console.error("Erro na verificação do OTP:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro na verificação do código",
      }),
    };
  }
};

// Rate limit mais restrito para tentativas de login
export const loginHandler = rateLimiter(30)(login);
export const verifyOTPHandler = rateLimiter(30)(verifyOTP);
export const refreshTokenHandler = rateLimiter(60)(refreshToken);

export { login, refreshToken, logoutHandler, verifyOTP };
