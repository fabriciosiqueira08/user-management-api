import dotenv from "dotenv";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  type ConfirmSignUpCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

dotenv.config();

// Configurar o cliente com a região correta
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const confirmUser = async (
  email: string,
  code: string
): Promise<ConfirmSignUpCommandOutput> => {
  if (!process.env.USER_POOL_CLIENT_ID) {
    throw new Error("USER_POOL_CLIENT_ID não encontrado no arquivo .env");
  }

  const params = {
    ClientId: process.env.USER_POOL_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    const response = await cognitoClient.send(command);
    console.log("Usuário confirmado com sucesso");
    return response;
  } catch (error) {
    console.error("Erro ao confirmar usuário:", error);
    throw error;
  }
};

// Função para testar a confirmação
const testConfirm = async (): Promise<void> => {
  try {
    // Você pode passar email e código como argumentos da linha de comando
    const email = process.argv[2];
    const code = process.argv[3];

    if (!email || !code) {
      console.error("Por favor, forneça o email e o código de confirmação");
      console.log("Uso: npm run cognito:confirm-user <email> <código>");
      process.exit(1);
    }

    console.log("Tentando confirmar usuário:", email);
    console.log("Usando Client ID:", process.env.USER_POOL_CLIENT_ID);

    const result = await confirmUser(email, code);
    console.log("Resultado completo:", result);
  } catch (error) {
    console.error("Erro no teste de confirmação:", error);
    process.exit(1);
  }
};

// Executar o teste se o script for executado diretamente
if (require.main === module) {
  testConfirm();
}

export { confirmUser };