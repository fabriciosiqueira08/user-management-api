const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Configurar o cliente com a região correta
const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1", // Usando a mesma região do erro
});

const createUserPool = async () => {
  const params = {
    PoolName: "MyAppUserPool",
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true,
      },
    },
    AutoVerifiedAttributes: ["email"],
    UsernameAttributes: ["email"],
    MfaConfiguration: "OFF",
  };

  try {
    const command = new CreateUserPoolCommand(params);
    const userPool = await cognitoClient.send(command);
    console.log("User Pool criado com sucesso:", userPool.UserPool.Id);
    return userPool;
  } catch (error) {
    console.error("Erro ao criar user pool:", error);
    throw error;
  }
};

const createAppClient = async (userPoolId) => {
  const params = {
    ClientName: "MyAppClient",
    UserPoolId: userPoolId,
    GenerateSecret: false, // Set to false for client-side apps
    ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  };

  try {
    const command = new CreateUserPoolClientCommand(params);
    const appClient = await cognitoClient.send(command);
    console.log(
      "App Client criado com sucesso:",
      appClient.UserPoolClient.ClientId
    );
    return appClient;
  } catch (error) {
    console.error("Erro ao criar app client:", error);
    throw error;
  }
};

// Executar as funções em sequência
const init = async () => {
  try {
    const userPoolResult = await createUserPool();
    const userPoolId = userPoolResult.UserPool.Id;

    const appClientResult = await createAppClient(userPoolId);

    console.log("Configuração completa:", {
      userPool: {
        id: userPoolResult.UserPool.Id,
        name: userPoolResult.UserPool.Name,
        arn: userPoolResult.UserPool.Arn,
      },
      appClient: {
        id: appClientResult.UserPoolClient.ClientId,
        name: appClientResult.UserPoolClient.ClientName,
      },
    });
  } catch (error) {
    console.error("Erro na configuração:", error);
  }
};

init();
