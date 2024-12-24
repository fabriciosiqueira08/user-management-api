import dotenv from "dotenv";
import axios from "axios";
import { getApiUrl } from "./getApiUrl";

dotenv.config();

const completeRegistration = async (
  email: string,
  verificationCode: string,
  name: string,
  password: string,
  confirmPassword: string
): Promise<any> => {
  const apiUrl = await getApiUrl();

  try {
    const response = await axios.post(`${apiUrl}/auth/complete-registration`, {
      email,
      verificationCode,
      name,
      password,
      confirmPassword,
    });

    console.log("Registro completado com sucesso:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao completar registro:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Função para testar a confirmação
const testCompleteRegistration = async (): Promise<void> => {
  try {
    const email = process.argv[2];
    const code = process.argv[3];
    const name = process.argv[4];
    const password = process.argv[5];

    if (!email || !code || !name || !password) {
      console.error("Por favor, forneça todos os parâmetros necessários");
      console.log(
        "Uso: npm run complete-registration <email> <código> <nome> <senha>"
      );
      process.exit(1);
    }

    console.log("Completando registro para:");
    console.log("Email:", email);
    console.log("Nome:", name);

    const result = await completeRegistration(
      email,
      code,
      name,
      password,
      password
    );
    console.log("Resultado completo:", result);
    console.log("\nRegistro completado com sucesso!");
    console.log("Agora você pode fazer login usando seu email e senha");
  } catch (error) {
    console.error("Erro ao completar registro:", error);
    process.exit(1);
  }
};

// Executar o teste se o script for executado diretamente
if (require.main === module) {
  testCompleteRegistration();
}

export { completeRegistration };
