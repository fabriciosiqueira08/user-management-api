import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  updateCognitoUser,
  updateUserPassword,
  verifyTempPassword,
} from "../services/cognitoService";
import { rateLimiter } from "../middleware/rateLimiter";

interface CompleteRegistrationRequest {
  email: string;
  verificationCode: string;
  name: string;
  password: string;
  confirmPassword: string;
}

const completeRegistrationHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, verificationCode, name, password, confirmPassword } =
      JSON.parse(event.body || "{}") as CompleteRegistrationRequest;

    // Validar campos obrigatórios
    if (!email || !verificationCode || !name || !password || !confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Todos os campos são obrigatórios",
        }),
      };
    }

    // Validar se as senhas coincidem
    if (password !== confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "As senhas não coincidem",
        }),
      };
    }

    // Validar senha
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            "A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais",
        }),
      };
    }

    // Verificar senha temporária
    console.log("Verificando senha temporária para:", email);
    const userId = await verifyTempPassword(email, verificationCode);

    if (!userId) {
      console.log("Senha temporária inválida para:", email);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Senha temporária inválida",
        }),
      };
    }

    console.log("Senha temporária válida. Atualizando senha para:", email);

    // Definir senha permanente
    await updateUserPassword(userId, password);

    // Atualizar nome
    await updateCognitoUser(userId, {
      name,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Registro completado com sucesso",
      }),
    };
  } catch (error: any) {
    console.error("Erro ao completar registro:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao completar registro",
        error: process.env.IS_OFFLINE ? error.toString() : undefined,
      }),
    };
  }
};

export const handler = rateLimiter(30)(completeRegistrationHandler);
