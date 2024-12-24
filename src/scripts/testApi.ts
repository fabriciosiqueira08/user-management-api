import axios from "axios";
import { getApiUrl } from "./getApiUrl";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const API_URL = getApiUrl();

const testUserCreation = async () => {
  try {
    console.log("\n=== Testando criação de usuário ===");
    const email = await question("Digite o email do usuário: ");
    const name = await question("Digite o nome do usuário: ");

    const response = await axios.post(`${API_URL}/users`, {
      email,
      name,
    });

    console.log("\nResposta da criação de usuário:", response.data);
    return { email, name };
  } catch (error: any) {
    console.error(
      "\nErro ao criar usuário:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const testCompleteRegistration = async (email: string) => {
  try {
    console.log("\n=== Testando confirmação de registro ===");
    const code = await question(
      "Digite o código de verificação recebido no email: "
    );
    const password = await question("Digite a senha desejada: ");

    const response = await axios.post(`${API_URL}/auth/complete-registration`, {
      email,
      verificationCode: code,
      name: email.split("@")[0], // Usa parte do email como nome
      password,
      confirmPassword: password,
    });

    console.log("\nResposta da confirmação de registro:", response.data);
  } catch (error: any) {
    console.error(
      "\nErro ao confirmar registro:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const testLogin = async (email: string) => {
  try {
    console.log("\n=== Testando login ===");
    const password = await question("Digite sua senha: ");

    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    console.log("\nResposta do login:", response.data);

    // MFA é sempre obrigatório
    return await testVerifyMFA(response.data.session);
  } catch (error: any) {
    console.error(
      "\nErro ao fazer login:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const testVerifyMFA = async (session: string) => {
  try {
    console.log("\n=== Verificando MFA ===");
    const code = await question("Digite o código MFA recebido: ");

    const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
      session,
      code,
    });

    console.log("\nResposta da verificação MFA:", response.data);
    return response.data.tokens;
  } catch (error: any) {
    console.error(
      "\nErro ao verificar MFA:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const testRefreshToken = async (refreshToken: string) => {
  try {
    console.log("\n=== Testando refresh token ===");
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken,
    });

    console.log("\nResposta do refresh token:", response.data);
    return response.data.tokens;
  } catch (error: any) {
    console.error(
      "\nErro ao atualizar token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const testLogout = async (accessToken: string) => {
  try {
    console.log("\n=== Testando logout ===");
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("\nResposta do logout:", response.data);
  } catch (error: any) {
    console.error(
      "\nErro ao fazer logout:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const runTests = async () => {
  try {
    // Criar usuário
    const { email } = await testUserCreation();

    // Confirmar registro
    await testCompleteRegistration(email);

    // Login com MFA
    const tokens = await testLogin(email);

    if (tokens?.refreshToken) {
      // Testar refresh token
      await testRefreshToken(tokens.refreshToken);
    }

    if (tokens?.accessToken) {
      // Testar logout
      await testLogout(tokens.accessToken);
    }

    console.log("\n=== Testes concluídos com sucesso! ===");
  } catch (error) {
    console.error("\n=== Erro nos testes ===");
  } finally {
    rl.close();
  }
};

runTests();
