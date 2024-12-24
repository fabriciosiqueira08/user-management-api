import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AuthFlowType,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";

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

interface AuthResponse {
  session?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  };
  challengeName?: string;
  challengeParameters?: {
    [key: string]: string;
  };
}

export const initiateAuth = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // Primeiro, validar a senha usando USER_PASSWORD_AUTH
    const passwordAuthParams = {
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    console.log("Iniciando validação de senha para:", email);

    try {
      const passwordCommand = new InitiateAuthCommand(passwordAuthParams);
      const passwordResponse = await cognitoClient.send(passwordCommand);

      // Se a senha foi validada com sucesso, iniciar o fluxo MFA
      const mfaParams = {
        AuthFlow: AuthFlowType.CUSTOM_AUTH,
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
        },
      };

      const mfaCommand = new InitiateAuthCommand(mfaParams);
      const mfaResponse = await cognitoClient.send(mfaCommand);

      return {
        session: mfaResponse.Session,
        challengeName: mfaResponse.ChallengeName,
        challengeParameters: mfaResponse.ChallengeParameters,
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
  session: string,
  code: string,
  email: string
): Promise<AuthResponse> => {
  try {
    const params = {
      ChallengeName: ChallengeNameType.CUSTOM_CHALLENGE,
      ClientId: CLIENT_ID,
      ChallengeResponses: {
        ANSWER: code,
        USERNAME: email,
      },
      Session: session,
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
