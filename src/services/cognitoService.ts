import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  ListGroupsCommand,
  MessageActionType,
  DeliveryMediumType,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

export const createCognitoUser = async (
  email: string,
  name: string,
  tempPassword: string
): Promise<{ UserSub: string }> => {
  const params = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: email,
    TemporaryPassword: tempPassword,
    MessageAction: "SUPPRESS" as MessageActionType,
    DesiredDeliveryMediums: [] as DeliveryMediumType[],
    ForceAliasCreation: false,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "name",
        Value: name,
      },
      {
        Name: "email_verified",
        Value: "true",
      },
      {
        Name: "custom:registrationComplete",
        Value: "false",
      },
    ],
  };

  const command = new AdminCreateUserCommand(params);
  const response = await cognitoClient.send(command);
  return { UserSub: response.User?.Username || "" };
};

// Função para atualizar a senha do usuário
export const updateUserPassword = async (
  username: string,
  password: string
) => {
  const params = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: username,
    Password: password,
    Permanent: true,
  };

  const command = new AdminSetUserPasswordCommand(params);
  await cognitoClient.send(command);
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
      UserPoolId: process.env.USER_POOL_ID,
    });
    const { Groups = [] } = await cognitoClient.send(listGroupsCommand);

    if (!Groups.some((g) => g.GroupName === groupName)) {
      const createGroupCommand = new CreateGroupCommand({
        UserPoolId: process.env.USER_POOL_ID,
        GroupName: groupName,
        Description: `${groupName} group`,
      });
      await cognitoClient.send(createGroupCommand);
    }

    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: process.env.USER_POOL_ID,
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
