import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  updateCognitoUser,
  updateUserPassword,
} from "../services/cognitoService";
import { rateLimiter } from "../middleware/rateLimiter";

interface CompleteRegistrationRequest {
  userId: string;
  name: string;
  password: string;
  confirmPassword: string;
}

const completeRegistrationHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { userId, name, password, confirmPassword } = JSON.parse(
      event.body || "{}"
    ) as CompleteRegistrationRequest;

    if (!userId || !name || !password || !confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Todos os campos são obrigatórios",
        }),
      };
    }

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

    // Definir senha permanente
    await updateUserPassword(userId, password);

    // Atualizar nome e marcar registro como completo
    await updateCognitoUser(userId, {
      name,
      "custom:registrationComplete": "true",
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
      }),
    };
  }
};

export const handler = rateLimiter(30)(completeRegistrationHandler);
