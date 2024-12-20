const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { protected } = require("../middleware/authMiddleware");

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

const login = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email e senha são obrigatórios",
        }),
      };
    }

    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login realizado com sucesso",
        tokens: {
          idToken: response.AuthenticationResult.IdToken,
          accessToken: response.AuthenticationResult.AccessToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
        },
      }),
    };
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao fazer login",
      }),
    };
  }
};

const refreshToken = async (event) => {
  try {
    const { refreshToken } = JSON.parse(event.body);

    if (!refreshToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Refresh token é obrigatório",
        }),
      };
    }

    const params = {
      AuthFlow: "REFRESH_TOKEN_AUTH",
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
        message: "Token renovado com sucesso",
        tokens: {
          idToken: response.AuthenticationResult.IdToken,
          accessToken: response.AuthenticationResult.AccessToken,
        },
      }),
    };
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao renovar token",
      }),
    };
  }
};

const logoutHandler = async (event) => {
  try {
    const token = event.headers.Authorization?.split(" ")[1];

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Token não fornecido",
        }),
      };
    }

    const params = {
      AccessToken: token,
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
    console.error("Erro ao fazer logout:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao fazer logout",
      }),
    };
  }
};

module.exports = {
  login,
  refreshToken,
  logoutHandler: protected(logoutHandler),
};
