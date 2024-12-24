import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "dotenv";

config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

async function createUserPool() {
  try {
    // Criar User Pool
    const createPoolCommand = new CreateUserPoolCommand({
      PoolName: "MyAppUserPool",
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      MfaConfiguration: "OFF",
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: false,
      },
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
    });

    const userPoolResponse = await cognitoClient.send(createPoolCommand);
    const userPoolId = userPoolResponse.UserPool?.Id;

    if (!userPoolId) {
      throw new Error("Falha ao criar User Pool");
    }

    // Criar App Client
    const createClientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: "MyAppClient",
      GenerateSecret: false,
      ExplicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_CUSTOM_AUTH",
      ],
      PreventUserExistenceErrors: "ENABLED",
      WriteAttributes: ["email", "name", "custom:role"],
      ReadAttributes: ["email", "name", "custom:role"],
    });

    const clientResponse = await cognitoClient.send(createClientCommand);
    const clientId = clientResponse.UserPoolClient?.ClientId;

    if (!clientId) {
      throw new Error("Falha ao criar App Client");
    }

    console.log("User Pool criado com sucesso:", userPoolId);
    console.log("App Client criado com sucesso:", clientId);

    console.log("Configuração completa:", {
      userPool: {
        name: "MyAppUserPool",
        arn: `arn:aws:cognito-idp:us-east-1:${process.env.AWS_ACCOUNT_ID}:userpool/${userPoolId}`,
      },
      appClient: {
        id: clientId,
        name: "MyAppClient",
      },
    });
  } catch (error) {
    console.error("Erro ao criar User Pool:", error);
    throw error;
  }
}

createUserPool();
