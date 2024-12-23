import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  type UserPoolType,
  type UserPoolClientType,
  type VerifiedAttributeType,
  type ExplicitAuthFlowsType,
  type UserPoolMfaType,
} from "@aws-sdk/client-cognito-identity-provider";

// Configurar o cliente com a região correta
const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
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
    AutoVerifiedAttributes: ["email"] as VerifiedAttributeType[],
    UsernameAttributes: ["email"] as VerifiedAttributeType[],
    MfaConfiguration: "OFF" as UserPoolMfaType,
  };

  try {
    const command = new CreateUserPoolCommand(params);
    const userPool = await cognitoClient.send(command);
    if (!userPool.UserPool?.Id) {
      throw new Error("User Pool ID não foi gerado");
    }
    console.log("User Pool criado com sucesso:", userPool.UserPool.Id);
    return userPool;
  } catch (error) {
    console.error("Erro ao criar user pool:", error);
    throw error;
  }
};

const createAppClient = async (userPoolId: string) => {
  const params = {
    ClientName: "MyAppClient",
    UserPoolId: userPoolId,
    GenerateSecret: false,
    ExplicitAuthFlows: [
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH",
    ] as ExplicitAuthFlowsType[],
  };

  try {
    const command = new CreateUserPoolClientCommand(params);
    const appClient = await cognitoClient.send(command);
    if (!appClient.UserPoolClient?.ClientId) {
      throw new Error("Client ID não foi gerado");
    }
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
const init = async (): Promise<void> => {
  try {
    const userPoolResult = await createUserPool();
    if (!userPoolResult.UserPool?.Id) {
      throw new Error("User Pool ID não encontrado");
    }

    const appClientResult = await createAppClient(userPoolResult.UserPool.Id);

    console.log("Configuração completa:", {
      userPool: {
        id: userPoolResult.UserPool.Id,
        name: userPoolResult.UserPool.Name,
        arn: userPoolResult.UserPool.Arn,
      },
      appClient: {
        id: appClientResult.UserPoolClient?.ClientId,
        name: appClientResult.UserPoolClient?.ClientName,
      },
    });
  } catch (error) {
    console.error("Erro na configuração:", error);
    process.exit(1);
  }
};

// Executar apenas se for o arquivo principal
if (require.main === module) {
  init();
}
