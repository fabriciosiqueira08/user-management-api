import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  ListGroupsCommand,
  MessageActionType,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AuthFlowType,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";
import { sendTempPasswordEmail } from "./emailService";

if (!process.env.USER_POOL_ID) {
  throw new Error("USER_POOL_ID não está definido");
}

if (!process.env.USER_POOL_CLIENT_ID) {
  throw new Error("USER_POOL_CLIENT_ID não está definido");
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export const createCognitoUser = async (
  email: string,
  tempPassword: string
): Promise<{ UserSub: string }> => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: email,
    TemporaryPassword: tempPassword,
    MessageAction: MessageActionType.SUPPRESS,
    ForceAliasCreation: false,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
  };

  try {
    const command = new AdminCreateUserCommand(params);
    const response = await cognitoClient.send(command);

    // Enviar email com a senha temporária
    await sendTempPasswordEmail(email, tempPassword);

    return { UserSub: response.User?.Username || "" };
  } catch (error) {
    console.error("Erro ao criar usuário no Cognito:", error);
    throw error;
  }
};

export const verifyTempPassword = async (
  email: string,
  tempPassword: string
): Promise<string | null> => {
  try {
    const authParams = {
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: tempPassword,
      },
    };

    console.log("Tentando autenticar com senha temporária:", {
      email,
      userPoolId: process.env.USER_POOL_ID,
      clientId: process.env.USER_POOL_CLIENT_ID,
    });

    try {
      const authCommand = new AdminInitiateAuthCommand(authParams);
      const authResponse = await cognitoClient.send(authCommand);

      console.log(
        "Resposta da autenticação:",
        JSON.stringify(authResponse, null, 2)
      );

      if (
        authResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED
      ) {
        return email;
      }
    } catch (authError: any) {
      // Se o erro for NotAuthorizedException, significa que a senha está incorreta
      if (authError.name === "NotAuthorizedException") {
        console.log("Senha temporária inválida");
        return null;
      }
      // Se for UserNotFoundException, o usuário não existe
      if (authError.name === "UserNotFoundException") {
        console.log("Usuário não encontrado");
        return null;
      }
      throw authError;
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar senha temporária:", error);
    if (process.env.IS_OFFLINE) {
      console.error("Detalhes do erro:", JSON.stringify(error, null, 2));
    }
    throw error;
  }
};

export const updateUserPassword = async (
  username: string,
  newPassword: string
): Promise<void> => {
  try {
    const params = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: username,
      Password: newPassword,
      Permanent: true,
    };

    const command = new AdminSetUserPasswordCommand(params);
    await cognitoClient.send(command);
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    throw error;
  }
};

export const updateCognitoUser = async (
  userId: string,
  updates: { [key: string]: string }
) => {
  const attributes = Object.entries(updates).map(([Name, Value]) => ({
    Name,
    Value,
  }));

  const params = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: userId,
    UserAttributes: attributes,
  };

  const command = new AdminUpdateUserAttributesCommand(params);
  await cognitoClient.send(command);
};

export const deleteCognitoUser = async (userId: string) => {
  const params = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: userId,
  };

  const command = new AdminDeleteUserCommand(params);
  await cognitoClient.send(command);
};

export const addUserToGroup = async (
  username: string,
  groupName: string
): Promise<boolean> => {
  try {
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
    });
    const { Groups = [] } = await cognitoClient.send(listGroupsCommand);

    if (!Groups.some((g) => g.GroupName === groupName)) {
      const createGroupCommand = new CreateGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: groupName,
        Description: `${groupName} group`,
      });
      await cognitoClient.send(createGroupCommand);
    }

    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: groupName,
    });
    await cognitoClient.send(addToGroupCommand);

    return true;
  } catch (error) {
    console.error(`Erro ao adicionar usuário ao grupo ${groupName}:`, error);
    throw error;
  }
};
