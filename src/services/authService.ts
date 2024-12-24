import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AuthFlowType,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";
import { sendMFACodeEmail } from "./emailService";
import { generateMFACode } from "../utils/mfaUtils";
import { storeMFACode, verifyMFACode } from "./mfaService";

if (!process.env.USER_POOL_CLIENT_ID) {
  throw new Error("USER_POOL_CLIENT_ID não está definido");
}

if (!process.env.USER_POOL_ID) {
  throw new Error("USER_POOL_ID não está definido");
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;

interface AuthResponse {
  session?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  };
}

export const initiateAuth = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const params = {
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    console.log("Iniciando autenticação para:", email);

    try {
      const command = new InitiateAuthCommand(params);
      const response = await cognitoClient.send(command);

      console.log(
        "Resposta da autenticação:",
        JSON.stringify(response, null, 2)
      );

      // Gerar e enviar código MFA apenas se a autenticação for bem-sucedida
      const mfaCode = generateMFACode();
      await sendMFACodeEmail(email, mfaCode);

      // Armazenar o código MFA e retornar a sessão do Cognito
      await storeMFACode(email, mfaCode);

      return {
        session: response.Session,
        tokens: response.AuthenticationResult
          ? {
              accessToken: response.AuthenticationResult.AccessToken,
              refreshToken: response.AuthenticationResult.RefreshToken,
              idToken: response.AuthenticationResult.IdToken,
            }
          : undefined,
      };
    } catch (authError: any) {
      console.error("Erro na autenticação:", {
        name: authError.name,
        message: authError.message,
      });

      if (authError.name === "NotAuthorizedException") {
        throw new Error("Credenciais inválidas");
      }
      if (authError.name === "UserNotFoundException") {
        throw new Error("Usuário não encontrado");
      }
      throw authError;
    }
  } catch (error: any) {
    console.error("Erro detalhado na autenticação:", {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      stack: error.stack,
    });
    throw error;
  }
};

export const verifyMFA = async (
  sessionToken: string,
  code: string
): Promise<AuthResponse> => {
  try {
    // Verificar o código MFA e obter o email associado
    const email = await verifyMFACode(sessionToken, code);
    if (!email) {
      throw new Error("Código MFA inválido ou expirado");
    }

    const params = {
      ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
      ClientId: CLIENT_ID,
      ChallengeResponses: {
        USERNAME: email,
        SOFTWARE_TOKEN_MFA_CODE: code,
      },
      Session: sessionToken,
    };

    console.log(
      "Verificando código MFA com parâmetros:",
      JSON.stringify(params, null, 2)
    );

    const command = new RespondToAuthChallengeCommand(params);
    const response = await cognitoClient.send(command);

    console.log(
      "Resposta da verificação MFA:",
      JSON.stringify(response, null, 2)
    );

    if (!response.AuthenticationResult) {
      throw new Error("Falha na autenticação após MFA");
    }

    return {
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        idToken: response.AuthenticationResult.IdToken,
      },
    };
  } catch (error: any) {
    console.error("Erro detalhado na verificação MFA:", {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      stack: error.stack,
    });

    if (error.name === "NotAuthorizedException") {
      throw new Error("Código MFA inválido");
    }
    if (error.name === "CodeMismatchException") {
      throw new Error("Código MFA incorreto");
    }
    throw error;
  }
};
