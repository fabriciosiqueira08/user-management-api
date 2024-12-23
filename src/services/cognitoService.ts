import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  ListGroupsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { User } from "../types";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export const createCognitoUser = async (
  email: string,
  name: string,
  password: string
): Promise<{ UserSub: string }> => {
  if (!CLIENT_ID) {
    throw new Error("USER_POOL_CLIENT_ID não encontrado no arquivo .env");
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
    ],
  };

  try {
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    if (!response.UserSub) {
      throw new Error("Erro ao criar usuário: ID não gerado");
    }
    return { UserSub: response.UserSub };
  } catch (error) {
    console.error("Erro ao criar usuário no Cognito:", error);
    throw error;
  }
};

export const confirmSignUp = async (
  email: string,
  code: string
): Promise<void> => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  };

  try {
    await cognitoClient.send(new ConfirmSignUpCommand(params));
  } catch (error) {
    console.error("Erro ao confirmar usuário no Cognito:", error);
    throw error;
  }
};

export const getCognitoUser = async (username: string): Promise<User> => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };

  try {
    const response = await cognitoClient.send(new AdminGetUserCommand(params));
    const attributes = response.UserAttributes || [];

    const user: User = {
      email: "",
      name: "",
    };

    attributes.forEach((attr) => {
      switch (attr.Name) {
        case "email":
          user.email = attr.Value || "";
          break;
        case "name":
          user.name = attr.Value;
          break;
        case "sub":
          user.sub = attr.Value;
          break;
        case "custom:isAdmin":
          user.isAdmin = attr.Value === "true";
          break;
      }
    });

    return user;
  } catch (error) {
    console.error("Erro ao buscar usuário no Cognito:", error);
    throw error;
  }
};

export const updateCognitoUser = async (
  username: string,
  attributes: Record<string, string>
): Promise<void> => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
    UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
      Name,
      Value,
    })),
  };

  try {
    await cognitoClient.send(new AdminUpdateUserAttributesCommand(params));
  } catch (error) {
    console.error("Erro ao atualizar usuário no Cognito:", error);
    throw error;
  }
};

export const deleteCognitoUser = async (username: string): Promise<void> => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };

  try {
    await cognitoClient.send(new AdminDeleteUserCommand(params));
  } catch (error) {
    console.error("Erro ao deletar usuário no Cognito:", error);
    throw error;
  }
};

const generateTempPassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

export const addUserToGroup = async (
  username: string,
  groupName: string
): Promise<boolean> => {
  try {
    // Verificar se o grupo existe
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
    });
    const { Groups = [] } = await cognitoClient.send(listGroupsCommand);

    // Se o grupo não existir, criar
    if (!Groups.some((g) => g.GroupName === groupName)) {
      const createGroupCommand = new CreateGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: groupName,
        Description: `${groupName} group`,
      });
      await cognitoClient.send(createGroupCommand);
    }

    // Adicionar usuário ao grupo
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
