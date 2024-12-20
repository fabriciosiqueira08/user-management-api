require("dotenv").config();
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Configurar o cliente com a região correta
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const signUpUser = async (email, password) => {
  if (!process.env.USER_POOL_CLIENT_ID) {
    throw new Error("USER_POOL_CLIENT_ID não encontrado no arquivo .env");
  }

  const params = {
    ClientId: process.env.USER_POOL_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  };

  try {
    const command = new SignUpCommand(params);
    const signUpResponse = await cognitoClient.send(command);
    console.log("Usuário registrado com sucesso:", {
      userSub: signUpResponse.UserSub,
      userConfirmed: signUpResponse.UserConfirmed,
    });
    return signUpResponse;
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    throw error;
  }
};

// Função para testar o registro
const testSignUp = async () => {
  try {
    // Você pode passar email e senha como argumentos da linha de comando
    const email = process.argv[2] || "teste@exemplo.com";
    const password = process.argv[3] || "Senha123!@#";

    console.log("Tentando registrar usuário:", email);
    console.log("Usando Client ID:", process.env.USER_POOL_CLIENT_ID);

    const result = await signUpUser(email, password);
    console.log("Resultado completo:", result);
  } catch (error) {
    console.error("Erro no teste de registro:", error);
  }
};

// Executar o teste se o script for executado diretamente
if (require.main === module) {
  testSignUp();
}

module.exports = { signUpUser };
