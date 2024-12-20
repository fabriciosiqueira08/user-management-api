const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  ListGroupsCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

const createCognitoUser = async (email, name, password) => {
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
    return response;
  } catch (error) {
    console.error("Erro ao criar usuário no Cognito:", error);
    throw error;
  }
};

const confirmSignUp = async (email, code) => {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Erro ao confirmar usuário no Cognito:", error);
    throw error;
  }
};

const getCognitoUser = async (username) => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };

  try {
    const command = new AdminGetUserCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Erro ao buscar usuário no Cognito:", error);
    throw error;
  }
};

const updateCognitoUser = async (username, attributes) => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
    UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
      Name,
      Value,
    })),
  };

  try {
    const command = new AdminUpdateUserAttributesCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Erro ao atualizar usuário no Cognito:", error);
    throw error;
  }
};

const deleteCognitoUser = async (username) => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
  };

  try {
    const command = new AdminDeleteUserCommand(params);
    await cognitoClient.send(command);
  } catch (error) {
    console.error("Erro ao deletar usuário no Cognito:", error);
    throw error;
  }
};

const generateTempPassword = () => {
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

const addUserToGroup = async (username, groupName) => {
  try {
    // Verificar se o grupo existe
    const listGroupsCommand = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
    });
    const { Groups } = await cognitoClient.send(listGroupsCommand);

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

module.exports = {
  createCognitoUser,
  getCognitoUser,
  updateCognitoUser,
  deleteCognitoUser,
  confirmSignUp,
  addUserToGroup,
};
