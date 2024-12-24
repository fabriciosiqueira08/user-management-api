import dotenv from "dotenv";
import axios from "axios";
import { getApiUrl } from "./getApiUrl";

dotenv.config();

const signUpUser = async (email: string, name: string): Promise<any> => {
  const apiUrl = await getApiUrl();

  try {
    const response = await axios.post(`${apiUrl}/users`, {
      email,
      name,
    });

    console.log("Usuário registrado com sucesso:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao registrar usuário:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Função para testar o registro
const testSignUp = async (): Promise<void> => {
  try {
    // Você pode passar email e nome como argumentos da linha de comando
    const email = process.argv[2] || "teste@exemplo.com";
    const name = process.argv[3] || "Usuário Teste";

    console.log("Tentando registrar usuário:");
    console.log("Email:", email);
    console.log("Nome:", name);

    const result = await signUpUser(email, name);
    console.log("Resultado completo:", result);
    console.log(
      "\nAgora verifique seu email para obter o código de verificação"
    );
    console.log("Use o script confirmUser.ts para completar o registro");
  } catch (error) {
    console.error("Erro no teste de registro:", error);
    process.exit(1);
  }
};

// Executar o teste se o script for executado diretamente
if (require.main === module) {
  testSignUp();
}

export { signUpUser };
