import dotenv from "dotenv";
import axios from "axios";
import { getApiUrl } from "./getApiUrl";

dotenv.config();

const login = async (email: string, password: string): Promise<any> => {
  const apiUrl = await getApiUrl();

  try {
    const response = await axios.post(`${apiUrl}/auth/login`, {
      email,
      password,
    });

    console.log(
      "Login iniciado com sucesso. Verifique seu email para o código MFA"
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao fazer login:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const verifyMFA = async (session: string, code: string): Promise<any> => {
  const apiUrl = await getApiUrl();

  try {
    const response = await axios.post(`${apiUrl}/auth/verify-mfa`, {
      session,
      code,
    });

    console.log("MFA verificado com sucesso");
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao verificar MFA:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Função para testar o login
const testLogin = async (): Promise<void> => {
  try {
    // Primeiro passo: login com email e senha
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error("Por favor, forneça email e senha");
      console.log("Uso: npm run test-login <email> <senha>");
      process.exit(1);
    }

    console.log("Iniciando login para:", email);
    const loginResult = await login(email, password);
    console.log("\nLogin iniciado. Aguardando código MFA...");
    console.log("Session:", loginResult.session);

    // Segundo passo: verificar MFA
    console.log("\nPor favor, digite o código MFA recebido no email:");
    process.stdin.once("data", async (data) => {
      const code = data.toString().trim();
      try {
        const verifyResult = await verifyMFA(loginResult.session, code);
        console.log("\nLogin completado com sucesso!");
        console.log("Tokens:", verifyResult.tokens);
        process.exit(0);
      } catch (error) {
        console.error("Erro ao verificar MFA:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Erro no processo de login:", error);
    process.exit(1);
  }
};

// Executar o teste se o script for executado diretamente
if (require.main === module) {
  testLogin();
}

export { login, verifyMFA };
